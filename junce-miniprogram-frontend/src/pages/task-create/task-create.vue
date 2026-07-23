<template>
  <view class="container">
    <JcH5Back />
    <!-- 无权限 -->
    <view v-if="!canCreate" class="status-msg">无权限创建任务</view>

    <!-- 有权限 -->
    <view v-else class="form">
      <view class="form-item">
        <text class="label">标题 *</text>
        <input class="input" v-model="form.title" placeholder="请输入任务标题" :disabled="submitting" />
      </view>
      <view class="form-item">
        <text class="label">内容</text>
        <textarea class="textarea" v-model="form.content" placeholder="请输入任务内容（选填）" :disabled="submitting" />
      </view>
      <view class="form-item">
        <text class="label">接收人 *</text>
        <picker :value="toUserIndex" :range="userOptions" :disabled="submitting || userLoading" @change="onToUserChange">
          <view class="picker-view">
            <text :class="form.toUserId ? '' : 'placeholder'">{{ toUserLabel || (userLoading ? '加载中...' : '请选择') }}</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">客户</text>
        <picker :value="customerIndex" :range="customerOptions" :disabled="submitting || customerLoading || customerList.length === 0" @change="onCustomerChange">
          <view class="picker-view">
            <text :class="form.customerId ? '' : 'placeholder'">{{ customerLabel || customerPlaceholder }}</text>
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">截止日期 *</text>
        <picker mode="date" :value="form.deadline" :disabled="submitting" @change="onDeadlineChange">
          <view class="picker-view">
            <text :class="form.deadline ? '' : 'placeholder'">{{ form.deadline || '请选择' }}</text>
          </view>
        </picker>
      </view>
      <view class="submit-area">
        <button class="btn" :class="submitting ? 'btn-disabled' : 'btn-primary'" :disabled="submitting" @tap="handleSubmit">
          {{ submitting ? '提交中...' : '创建任务' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

const form = ref({ title: '', content: '', toUserId: null, customerId: '', deadline: '' })
const submitting = ref(false)
const userList = ref([])
const userLoading = ref(true)
const customerList = ref([])
const customerLoading = ref(true)

const canCreate = computed(() => {
  const code = userStore.user?.roleCode
  return code === '主管' || code === '管理员'
})

const userOptions = computed(() => ['请选择', ...userList.value.map(u => u.realName)])
const customerOptions = computed(() => ['不关联客户', ...customerList.value.map(c => c.companyName || `客户 #${c.id}`)])
const toUserIndex = computed(() => {
  if (!form.value.toUserId) return 0
  const i = userList.value.findIndex(u => u.id === form.value.toUserId)
  return i === -1 ? 0 : i + 1
})
const toUserLabel = computed(() => { const u = userList.value.find(u => u.id === form.value.toUserId); return u ? u.realName : '' })
const customerIndex = computed(() => {
  if (!form.value.customerId) return 0
  const i = customerList.value.findIndex(c => c.id === form.value.customerId)
  return i === -1 ? 0 : i + 1
})
const customerLabel = computed(() => {
  const c = customerList.value.find(c => c.id === form.value.customerId)
  return c ? c.companyName : ''
})
const customerPlaceholder = computed(() => {
  if (customerLoading.value) return '客户加载中...'
  if (customerList.value.length === 0) return '暂无可选客户，可先不关联客户'
  return '请选择客户（选填）'
})

function onToUserChange(e) { const i = e.detail.value; form.value.toUserId = i === 0 ? null : userList.value[i - 1].id }
function onCustomerChange(e) { const i = Number(e.detail.value); form.value.customerId = i === 0 ? '' : customerList.value[i - 1].id }
function onDeadlineChange(e) { form.value.deadline = e.detail.value }
function formatDeadlineForSubmit(val) { if (!val) return val; if (val.includes('T')) return val; return new Date(val).toISOString() }

onLoad(async () => {
  if (!canCreate.value) return
  try { userList.value = await get('/users') || [] } catch (e) { /* */ }
  finally { userLoading.value = false }
  try {
    const customers = await get('/customers')
    customerList.value = Array.isArray(customers) ? customers : []
  } catch (e) {
    customerList.value = []
  } finally {
    customerLoading.value = false
  }
})

async function handleSubmit() {
  if (!form.value.title.trim()) { uni.showToast({ title: '请输入标题', icon: 'none' }); return }
  if (!form.value.toUserId) { uni.showToast({ title: '请选择接收人', icon: 'none' }); return }
  if (!form.value.deadline) { uni.showToast({ title: '请选择截止日期', icon: 'none' }); return }

  submitting.value = true
  try {
    const payload = { title: form.value.title.trim(), toUserId: form.value.toUserId, deadline: formatDeadlineForSubmit(form.value.deadline) }
    if (form.value.content.trim()) payload.content = form.value.content.trim()
    if (form.value.customerId !== '' && !isNaN(Number(form.value.customerId))) payload.customerId = Number(form.value.customerId)
    const res = await post('/tasks', payload)
    uni.showToast({ title: '创建成功', icon: 'success' })
    uni.redirectTo({ url: `/pages/task-detail/task-detail?id=${res.id}` })
  } catch (e) { /* */ }
  finally { submitting.value = false }
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); }
.form-section-label { margin: 28rpx 28rpx 10rpx 28rpx; font-size: 22rpx; color: var(--jc-color-outline); font-weight: 500; letter-spacing: 1rpx; }
.status-msg { display: flex; justify-content: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.form { padding: 32rpx; }
.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.input { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); width: 100%; box-sizing: border-box; }
.textarea { width: 100%; min-height: 160rpx; padding: 16rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.submit-area { margin-top: 48rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }

/* Junce legacy harmonization */
.container, .content { min-height: 100vh; background: var(--jc-color-surface); box-sizing: border-box; }
.detail, .form, .content { padding: 32rpx 32rpx 132rpx; box-sizing: border-box; }
.identity-row, .page-head, .month-bar { padding: 34rpx 0 22rpx; background: transparent; }
.ir-text, .page-kicker, .form-section-label, .sd-text { display: block; margin-bottom: 8rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 3rpx; color: var(--jc-color-on-surface-variant); font-weight: 500; text-transform: uppercase; }
.main-card, .biz-module, .se-card, .card, .info-card, .summary-card, .status-header, .login-card { margin: 0 0 24rpx; padding: 32rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 16rpx; box-sizing: border-box; box-shadow: none; }
.main-card { border-left: 6rpx solid var(--jc-color-primary); }
.mc-title, .bm-name, .card-title, .section-title, .info-type, .sh-service, .sh-label { display: block; font-size: 32rpx; line-height: 40rpx; font-weight: 700; color: var(--jc-color-on-surface); letter-spacing: 0; }
.mc-desc, .bm-desc, .se-desc, .card-status, .card-empty, .content-text, .sh-customer { font-size: 24rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.sub-entries { margin: 0 0 24rpx; display: flex; gap: 18rpx; }
.se-card { flex: 1; min-height: 116rpx; }
.se-title { display: block; font-size: 26rpx; line-height: 34rpx; font-weight: 700; color: var(--jc-color-primary); margin-bottom: 4rpx; }
.biz-module { display: flex; justify-content: space-between; align-items: center; }
.bm-arrow, .mc-arrow { color: var(--jc-color-primary); font-size: 34rpx; }
.card-title { margin-bottom: 24rpx; padding-bottom: 18rpx; border-bottom: 1rpx solid var(--jc-color-outline-variant); }
.row, .summary-row, .stat-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24rpx; padding: 14rpx 0; border-bottom: 1rpx solid var(--jc-color-surface-container); }
.row:last-child, .summary-row:last-child, .stat-row:last-child { border-bottom: none; }
.label, .ll, .sl, .ov-label, .info-label { font-size: 24rpx; line-height: 32rpx; color: var(--jc-color-on-surface-variant); font-weight: 500; }
.value, .vv, .sv, .info-status, .month-picker { font-size: 26rpx; line-height: 34rpx; color: var(--jc-color-on-surface); font-weight: 600; text-align: right; }
.profit, .ov-num { color: var(--jc-color-primary); font-weight: 800; }
.overdue { color: var(--jc-color-error-core); }
.form-item { margin-bottom: 30rpx; }
.form-item:last-child { margin-bottom: 0; }
.input, .textarea, .picker-view { width: 100%; min-height: 76rpx; padding: 0 4rpx; border: none; border-bottom: 2rpx solid var(--jc-color-outline); border-radius: 0; background: var(--jc-color-surface-container-lowest); color: var(--jc-color-on-surface); font-size: 30rpx; box-sizing: border-box; }
.textarea { min-height: 150rpx; padding-top: 18rpx; line-height: 38rpx; }
.placeholder { color: var(--jc-color-outline); }
.status-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 96rpx 32rpx; color: var(--jc-color-outline); font-size: 28rpx; text-align: center; }
.si-status, .status-chip { display: inline-flex; align-items: center; flex-shrink: 0; font-size: 22rpx; line-height: 28rpx; font-weight: 700; padding: 6rpx 14rpx; border-radius: 8rpx; }
.status-todo, .status-pending, .status-unpaid { color: var(--jc-color-warning); background: var(--jc-color-surface-container); }
.status-processing, .status-confirmed { color: var(--jc-color-primary); background: var(--jc-color-surface-container-low); }
.status-done, .status-completed, .status-paid, .status-archived, .status-checked { color: var(--jc-color-success); background: var(--jc-color-surface-container); }
.status-invalid, .status-default { color: var(--jc-color-on-surface-variant); background: var(--jc-color-surface-container); }
.actions, .back-area, .submit-area, .create-bar, .edit-actions, .upload-actions, .checkin-submit { margin: 24rpx 0; display: flex; gap: 18rpx; flex-wrap: wrap; }
.btn, .retry-btn, .back-btn { min-height: 88rpx; line-height: 88rpx; border-radius: 10rpx; font-size: 30rpx; font-weight: 700; border: none; box-sizing: border-box; }
.btn-primary, .btn-checkin { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-back, .btn-upload, .retry-btn, .back-btn { background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); border: 1rpx solid var(--jc-color-primary); }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }
.file-item, .checkin-file-item, .service-item { padding: 18rpx 0; border-bottom: 1rpx solid var(--jc-color-outline-variant); }
.file-name, .checkin-file-name, .si-type { font-size: 26rpx; line-height: 34rpx; color: var(--jc-color-on-surface); font-weight: 700; }
.file-size, .checkin-file-size, .si-label, .si-text { font-size: 22rpx; line-height: 30rpx; color: var(--jc-color-on-surface-variant); }
.si-create-link, .retry-link { color: var(--jc-color-primary); font-size: 24rpx; font-weight: 700; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.ov-item { padding: 24rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 16rpx; }
.ov-num { display: block; font-size: 40rpx; line-height: 50rpx; color: var(--jc-color-on-surface); }
.block-loading, .block-error { padding: 32rpx 0; color: var(--jc-color-outline); text-align: center; font-size: 26rpx; }
.page-footer { padding: 20rpx 0 40rpx; text-align: center; }
.pf-text { font-size: 22rpx; color: var(--jc-color-outline); }
.logo { display: none; }
.text-area { padding: 34rpx 32rpx; }
.title { font-size: 40rpx; line-height: 50rpx; font-weight: 800; color: var(--jc-color-primary); }

</style>
