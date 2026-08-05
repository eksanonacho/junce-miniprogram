<template>
  <view class="container">
    <JcH5Back />
    <view class="page-head">
      <text class="page-kicker">ACCOUNTING DESK</text>
      <text class="page-title">会计日常台账</text>
      <text class="page-desc">统一登记客户出入库、开票、咨询、账务、社保、报税和年报进度。</text>
    </view>

    <view class="filters">
      <picker mode="date" fields="month" :value="month" @change="onMonthChange">
        <view class="filter-item">{{ month }}</view>
      </picker>
      <picker :range="recordTypes" :value="typeIndex" @change="onTypeChange">
        <view class="filter-item">{{ selectedType || '全部类型' }}</view>
      </picker>
    </view>

    <button v-if="canCreate && !showForm" class="btn btn-primary create-btn" @tap="openCreate">新增日常登记</button>

    <view v-if="showForm" class="card">
      <text class="card-title">{{ editingId ? '编辑登记' : '新增登记' }}</text>
      <view class="form-item">
        <text class="label">客户</text>
        <picker :range="customers" range-key="companyName" :value="customerIndex" :disabled="!!editingId" @change="onCustomerChange">
          <view class="picker-view">{{ selectedCustomer?.companyName || '请选择负责客户' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">登记类型</text>
        <picker :range="entryTypes" :value="entryTypeIndex" @change="e => entryTypeIndex = Number(e.detail.value)">
          <view class="picker-view">{{ entryTypes[entryTypeIndex] }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">登记日期</text>
        <picker mode="date" :value="form.recordDate" @change="e => form.recordDate = e.detail.value">
          <view class="picker-view">{{ form.recordDate }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">工作内容</text>
        <textarea class="textarea" v-model="form.content" maxlength="1000" placeholder="填写办理情况、进度或结果" />
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea short" v-model="form.remark" maxlength="500" placeholder="选填" />
      </view>
      <view class="actions">
        <button class="btn btn-primary" :disabled="saving" @tap="save">{{ saving ? '保存中…' : '保存' }}</button>
        <button class="btn btn-back" @tap="closeForm">取消</button>
      </view>
    </view>

    <view v-if="loading" class="status-msg">加载中…</view>
    <view v-else-if="error" class="status-msg">加载失败，请重试</view>
    <view v-else-if="list.length === 0" class="status-msg">本月暂无登记</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card log-card">
        <view class="card-top">
          <view>
            <text class="type">{{ item.recordType }}</text>
            <text class="customer">{{ item.customer.companyName }}</text>
          </view>
          <text :class="['status-chip', item.reviewedAt ? 'status-done' : 'status-pending']">{{ item.status }}</text>
        </view>
        <text class="content">{{ item.content }}</text>
        <text v-if="item.remark" class="remark">备注：{{ item.remark }}</text>
        <view class="meta">
          <text>{{ formatDate(item.recordDate) }}</text>
          <text>{{ item.accountant.realName }}</text>
        </view>
        <view v-if="item.reviewedAt" class="reviewed">由 {{ item.reviewedBy?.realName || '主管' }} 于 {{ formatTime(item.reviewedAt) }} 复核</view>
        <view class="actions compact">
          <button v-if="canEdit(item)" class="mini-btn" @tap="openEdit(item)">编辑</button>
          <button v-if="canReview && !item.reviewedAt" class="mini-btn review-btn" @tap="review(item)">确认复核</button>
        </view>
      </view>
    </view>
    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { get, post, patch } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const entryTypes = ['客户入库', '客户出库', '开票登记', '日常咨询', '账务进度', '社保明细', '报税进度', '年报进度', '其他']
const recordTypes = ['全部类型', ...entryTypes]
const userStore = useUserStore()
const roleCode = computed(() => userStore.user?.roleCode || '')
const canCreate = computed(() => roleCode.value === '会计')
const canReview = computed(() => ['主管', '管理员'].includes(roleCode.value))
const month = ref(new Date().toISOString().slice(0, 7))
const typeIndex = ref(0)
const selectedType = computed(() => typeIndex.value ? recordTypes[typeIndex.value] : '')
const list = ref([])
const customers = ref([])
const customerIndex = ref(-1)
const selectedCustomer = computed(() => customers.value[customerIndex.value])
const entryTypeIndex = ref(0)
const loading = ref(false)
const error = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = ref(emptyForm())

onShow(async () => {
  await Promise.all([fetchList(), fetchCustomers()])
})

function emptyForm() {
  return { recordDate: new Date().toISOString().slice(0, 10), content: '', remark: '' }
}
function onMonthChange(e) { month.value = e.detail.value; fetchList() }
function onTypeChange(e) { typeIndex.value = Number(e.detail.value); fetchList() }
function onCustomerChange(e) { customerIndex.value = Number(e.detail.value) }
async function fetchCustomers() {
  if (!canCreate.value) return
  try { customers.value = await get('/customers') || [] } catch (_) { customers.value = [] }
}
async function fetchList() {
  loading.value = true; error.value = false
  try {
    const query = { month: month.value }
    if (selectedType.value) query.recordType = selectedType.value
    list.value = await get('/accounting-work-logs', query) || []
  } catch (_) { error.value = true }
  finally { loading.value = false }
}
function openCreate() {
  editingId.value = null; customerIndex.value = -1; entryTypeIndex.value = 0
  form.value = emptyForm(); showForm.value = true
}
function openEdit(item) {
  editingId.value = item.id
  customerIndex.value = customers.value.findIndex(c => c.id === item.customerId)
  entryTypeIndex.value = Math.max(0, entryTypes.indexOf(item.recordType))
  form.value = { recordDate: item.recordDate.slice(0, 10), content: item.content, remark: item.remark || '' }
  showForm.value = true
}
function closeForm() { showForm.value = false }
function canEdit(item) {
  return (roleCode.value === '会计' && item.accountantId === userStore.user?.id && !item.reviewedAt) || canReview.value
}
async function save() {
  if (!editingId.value && !selectedCustomer.value) return uni.showToast({ title: '请选择客户', icon: 'none' })
  if (!form.value.content.trim()) return uni.showToast({ title: '请填写工作内容', icon: 'none' })
  const payload = {
    recordType: entryTypes[entryTypeIndex.value],
    recordDate: `${form.value.recordDate}T00:00:00.000Z`,
    content: form.value.content.trim(),
    remark: form.value.remark.trim(),
  }
  if (!editingId.value) payload.customerId = selectedCustomer.value.id
  saving.value = true
  try {
    if (editingId.value) await patch(`/accounting-work-logs/${editingId.value}`, payload)
    else await post('/accounting-work-logs', payload)
    uni.showToast({ title: '保存成功', icon: 'success' }); closeForm(); await fetchList()
  } finally { saving.value = false }
}
async function review(item) {
  await post(`/accounting-work-logs/${item.id}/review`)
  uni.showToast({ title: '已复核', icon: 'success' })
  await fetchList()
}
function formatDate(v) { return v ? v.slice(0, 10) : '—' }
function formatTime(v) { return v ? v.replace('T', ' ').slice(0, 16) : '—' }
</script>

<style>
.container { min-height: 100vh; padding: 32rpx 32rpx 180rpx; background: var(--jc-color-surface); box-sizing: border-box; }
.page-head { margin-bottom: 24rpx; }
.page-kicker { display: block; color: var(--jc-color-primary); font-size: 20rpx; letter-spacing: 3rpx; }
.page-title { display: block; margin: 8rpx 0; font-size: 44rpx; font-weight: 800; color: var(--jc-color-on-surface); }
.page-desc { font-size: 24rpx; line-height: 36rpx; color: var(--jc-color-on-surface-variant); }
.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-bottom: 24rpx; }
.filter-item, .picker-view { min-height: 76rpx; line-height: 76rpx; padding: 0 20rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 26rpx; box-sizing: border-box; }
.card { margin-bottom: 24rpx; padding: 30rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 16rpx; }
.card-title { display: block; margin-bottom: 24rpx; font-size: 32rpx; font-weight: 700; }
.create-btn { margin-bottom: 24rpx; }
.form-item { margin-bottom: 26rpx; }
.label { display: block; margin-bottom: 10rpx; font-size: 24rpx; color: var(--jc-color-on-surface-variant); }
.textarea { width: 100%; min-height: 180rpx; padding: 18rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; box-sizing: border-box; font-size: 28rpx; }
.textarea.short { min-height: 110rpx; }
.btn { min-height: 88rpx; line-height: 88rpx; border-radius: 10rpx; font-size: 30rpx; font-weight: 700; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-back { background: white; color: var(--jc-color-primary); border: 1rpx solid var(--jc-color-primary); }
.actions { display: flex; gap: 16rpx; }
.actions .btn { flex: 1; }
.card-top, .meta { display: flex; justify-content: space-between; gap: 20rpx; }
.type { display: block; font-size: 30rpx; font-weight: 700; }
.customer { display: block; margin-top: 6rpx; font-size: 24rpx; color: var(--jc-color-on-surface-variant); }
.content { display: block; margin: 24rpx 0 12rpx; font-size: 28rpx; line-height: 42rpx; white-space: pre-wrap; }
.remark, .reviewed { display: block; margin-top: 12rpx; font-size: 23rpx; color: var(--jc-color-on-surface-variant); }
.meta { margin-top: 22rpx; padding-top: 18rpx; border-top: 1rpx solid var(--jc-color-outline-variant); font-size: 23rpx; color: var(--jc-color-outline); }
.status-chip { padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 700; }
.status-pending { color: var(--jc-color-warning); background: var(--jc-color-surface-container); }
.status-done { color: var(--jc-color-success); background: var(--jc-color-surface-container); }
.compact { margin-top: 18rpx; justify-content: flex-end; }
.mini-btn { margin: 0; padding: 0 24rpx; min-height: 64rpx; line-height: 64rpx; font-size: 24rpx; color: var(--jc-color-primary); background: white; border: 1rpx solid var(--jc-color-primary); }
.review-btn { color: white; background: var(--jc-color-primary); }
.status-msg { padding: 120rpx 0; text-align: center; color: var(--jc-color-outline); font-size: 28rpx; }
</style>
