<template>
  <view class="container">
    <JcH5Back />
    <!-- loading -->
    <view v-if="pageMode === 'loading'" class="status-msg">加载中...</view>

    <!-- error -->
    <view v-else-if="pageMode === 'error'" class="status-msg">
      <text>{{ errorMsg }}</text>
      <button class="retry-btn" @tap="goBack">返回</button>
    </view>

    <!-- create 模式 -->
    <view v-else-if="pageMode === 'create'" class="detail">
      <view v-if="createCustomer" class="card">
        <view class="card-title">创建托管入档</view>
        <view class="row"><text class="ll">客户</text><text class="vv">{{ createCustomer.companyName || '—' }}</text></view>
        <view v-if="!isProxy" class="card-empty" style="color:var(--jc-color-error-core);padding-top:16rpx;">该客户非代理户，无法创建托管入档</view>
      </view>

      <view v-if="isProxy" class="card">
        <view class="card-title">托管信息</view>
        <view class="form-item">
          <text class="label">企业概况</text>
          <textarea class="textarea" v-model="form.enterpriseDetail" placeholder="请输入企业概况（选填）" :disabled="submitting" />
        </view>
        <view class="form-item">
          <text class="label">服务方案</text>
          <textarea class="textarea" v-model="form.servicePlan" placeholder="请输入服务方案（选填）" :disabled="submitting" />
        </view>
        <view class="submit-area">
          <button class="btn" :class="submitting ? 'btn-disabled' : 'btn-primary'" :disabled="submitting" @tap="handleCreate">
            {{ submitting ? '提交中...' : '提交' }}
          </button>
        </view>
      </view>
    </view>

    <!-- view 模式 -->
    <view v-else-if="tr" class="detail">
      <view class="status-header">
        <text class="si-status" :class="tr.planConfirmedByOwner ? 'status-confirmed' : 'status-pending'">{{ tr.planConfirmedByOwner ? '已确认' : '待确认' }}</text>
        <text class="sh-label">{{ tr.customer?.companyName || '—' }}</text>
        <text class="sh-amount">{{ tr.assignedAccountant?.realName || '未分派' }}</text>
      </view>
      <view class="card">
        <view class="card-title">托管入档</view>
        <view class="row"><text class="ll">客户</text><text class="vv">{{ tr.customer?.companyName || '—' }}</text></view>
        <view class="row">
          <text class="ll">方案确认</text>
          <text class="si-status" :class="tr.planConfirmedByOwner ? 'status-confirmed' : 'status-pending'">{{ tr.planConfirmedByOwner ? '已确认' : '待确认' }}</text>
        </view>
        <view class="row">
          <text class="ll">分派会计</text>
          <text class="vv">{{ tr.assignedAccountant?.realName || '未分派' }}</text>
        </view>
        <view class="row">
          <text class="ll">会计确认</text>
          <text class="si-status" :class="tr.assignConfirmed ? 'status-confirmed' : 'status-pending'">{{ tr.assignConfirmed ? '已确认' : '待确认' }}</text>
        </view>
        <view class="row"><text class="ll">创建时间</text><text class="vv">{{ formatTime(tr.createdAt) }}</text></view>
      </view>

      <!-- 企业概况 -->
      <view class="card">
        <view class="card-title">企业概况</view>
        <view v-if="pageMode === 'edit'">
          <textarea class="textarea" v-model="form.enterpriseDetail" placeholder="请输入企业概况" :disabled="saving" />
        </view>
        <view v-else>
          <text class="content-text">{{ tr.enterpriseDetail || '暂无' }}</text>
        </view>
      </view>

      <!-- 服务方案 -->
      <view class="card">
        <view class="card-title">服务方案</view>
        <view v-if="pageMode === 'edit'">
          <textarea class="textarea" v-model="form.servicePlan" placeholder="请输入服务方案" :disabled="saving" />
        </view>
        <view v-else>
          <text class="content-text">{{ tr.servicePlan || '暂无' }}</text>
        </view>
      </view>

      <!-- 编辑按钮区 -->
      <view v-if="pageMode === 'edit'" class="edit-actions card">
        <button class="btn btn-primary" :disabled="saving" @tap="handleSaveEdit">{{ saving ? '保存中...' : '保存' }}</button>
        <button class="btn btn-back" @tap="cancelEdit">取消</button>
      </view>

      <!-- 操作按钮 (view 模式) -->
      <view v-if="pageMode === 'view'" class="actions">
        <button v-if="canEdit" class="btn btn-primary" @tap="enterEdit">修改概况/方案</button>
        <button v-if="canConfirmPlan" class="btn btn-primary" :disabled="saving" @tap="handleConfirmPlan">{{ saving ? '处理中...' : '确认方案' }}</button>
        <button v-if="canAssignAccountant" class="btn btn-primary" :disabled="saving" @tap="openAssign">分派会计</button>
        <button v-if="canConfirmAssignment" class="btn btn-checkin" :disabled="saving" @tap="handleConfirmAssignment">{{ saving ? '处理中...' : '确认分派' }}</button>
      </view>

      <!-- 分派会计弹窗 -->
      <view v-if="showAssign" class="card">
        <view class="card-title">分派会计</view>
        <view class="form-item">
          <text class="label">选择会计</text>
          <picker :value="accountantIndex" :range="accountantOptions" :disabled="saving" @change="onAccountantChange">
            <view class="picker-view">
              <text :class="selectedAccountantId ? '' : 'placeholder'">{{ accountantLabel || '请选择' }}</text>
            </view>
          </picker>
        </view>
        <view class="edit-actions">
          <button class="btn btn-primary" :disabled="saving || !selectedAccountantId" @tap="handleAssignAccountant">{{ saving ? '分派中...' : '确认分派' }}</button>
          <button class="btn btn-back" @tap="showAssign = false; selectedAccountantId = null">取消</button>
        </view>
      </view>

      <!-- 返回 -->
      <view class="back-area">
        <button class="btn btn-back" @tap="goBack">返回</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post, patch } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

let currentId = ''
let customerIdForCreate = ''

// ========== 状态 ==========
const pageMode = ref('loading')
const errorMsg = ref('托管记录不存在')
const tr = ref(null)
const saving = ref(false)
const submitting = ref(false)
const createCustomer = ref(null)
const isProxy = ref(false)

// edit 表单
const form = ref({ enterpriseDetail: '', servicePlan: '' })

// 分派弹窗
const showAssign = ref(false)
const selectedAccountantId = ref(null)
const accountantList = ref([])
const accountantOptions = computed(() => ['请选择', ...accountantList.value.map(u => u.realName)])
const accountantIndex = computed(() => {
  if (!selectedAccountantId.value) return 0
  const idx = accountantList.value.findIndex(u => u.id === selectedAccountantId.value)
  return idx === -1 ? 0 : idx + 1
})
const accountantLabel = computed(() => {
  const u = accountantList.value.find(u => u.id === selectedAccountantId.value)
  return u ? u.realName : ''
})
function onAccountantChange(e) {
  const i = e.detail.value
  selectedAccountantId.value = i === 0 ? null : accountantList.value[i - 1].id
}

// ========== 权限 ==========
const roleCode = computed(() => userStore.user?.roleCode || '')
const canEdit = computed(() => roleCode.value === '会计' || roleCode.value === '主管' || roleCode.value === '管理员')
const canConfirmPlan = computed(() => {
  if (!tr.value || tr.value.planConfirmedByOwner) return false
  if (roleCode.value === '管理员') return true
  return roleCode.value === '商务' && tr.value.customer?.ownerId === userStore.user?.id
})
const canAssignAccountant = computed(() => (roleCode.value === '主管' || roleCode.value === '管理员') && tr.value && !tr.value.assignedAccountantId)
const canConfirmAssignment = computed(() => {
  if (!tr.value || tr.value.assignConfirmed || !tr.value.assignedAccountantId) return false
  if (roleCode.value === '管理员') return true
  if (roleCode.value === '会计') return tr.value.assignedAccountantId === userStore.user?.id
  return false
})

// ========== 数据加载 ==========
onLoad((options) => {
  if (options.mode === 'create' && options.customerId) {
    customerIdForCreate = options.customerId
    pageMode.value = 'create'
    fetchCustomerForCreate()
    return
  }
  if (options.id) {
    currentId = options.id
    fetchDetail()
  } else {
    pageMode.value = 'error'
    errorMsg.value = '缺少托管记录 ID'
  }
})

async function fetchCustomerForCreate() {
  try {
    const res = await get(`/customers/${customerIdForCreate}`)
    createCustomer.value = res
    isProxy.value = res.customerCategory === '代理户'
  } catch (e) {
    pageMode.value = 'error'
    errorMsg.value = '客户不存在'
  }
}

async function fetchDetail() {
  pageMode.value = 'loading'
  try {
    tr.value = await get(`/tenant-registers/${currentId}`)
    pageMode.value = 'view'
  } catch (e) {
    pageMode.value = 'error'
  }
}

async function fetchAccountantList() {
  try {
    const res = await get('/users', { roleCode: '会计' })
    accountantList.value = Array.isArray(res) ? res : []
  } catch (e) { /* silent */ }
}

// ========== 编辑 ==========
function enterEdit() {
  form.value = {
    enterpriseDetail: tr.value.enterpriseDetail || '',
    servicePlan: tr.value.servicePlan || ''
  }
  pageMode.value = 'edit'
}
function cancelEdit() { pageMode.value = 'view' }

async function handleSaveEdit() {
  const payload = {}
  if (form.value.enterpriseDetail !== (tr.value.enterpriseDetail || '')) payload.enterpriseDetail = form.value.enterpriseDetail
  if (form.value.servicePlan !== (tr.value.servicePlan || '')) payload.servicePlan = form.value.servicePlan
  if (Object.keys(payload).length === 0) { uni.showToast({ title: '未修改任何字段', icon: 'none' }); return }

  saving.value = true
  try { await patch(`/tenant-registers/${currentId}`, payload); uni.showToast({ title: '保存成功', icon: 'success' }); await fetchDetail() }
  catch (e) { /* request.js toast */ }
  finally { saving.value = false }
}

async function openAssign() {
  await fetchAccountantList()
  showAssign.value = true
}

// ========== 操作按钮 ==========
async function handleConfirmPlan() {
  saving.value = true
  try { await post(`/tenant-registers/${currentId}/confirm-plan`); uni.showToast({ title: '确认成功', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

async function handleAssignAccountant() {
  if (!selectedAccountantId.value) return
  saving.value = true
  try { await post(`/tenant-registers/${currentId}/assign-accountant`, { accountantId: selectedAccountantId.value }); uni.showToast({ title: '分派成功', icon: 'success' }); showAssign.value = false; selectedAccountantId.value = null; await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

async function handleConfirmAssignment() {
  saving.value = true
  try { await post(`/tenant-registers/${currentId}/confirm-assignment`); uni.showToast({ title: '确认成功', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

// ========== 创建 ==========
async function handleCreate() {
  submitting.value = true
  const payload = { customerId: Number(customerIdForCreate) }
  if (form.value.enterpriseDetail.trim()) payload.enterpriseDetail = form.value.enterpriseDetail.trim()
  if (form.value.servicePlan.trim()) payload.servicePlan = form.value.servicePlan.trim()
  try {
    const res = await post('/tenant-registers', payload)
    uni.showToast({ title: '创建成功', icon: 'success' })
    uni.redirectTo({ url: `/pages/tenant-detail/tenant-detail?id=${res.id}` })
  } catch (e) { /* request.js toast */ }
  finally { submitting.value = false }
}

// ========== 工具 ==========
function formatTime(val) { if (!val) return '—'; return val.replace('T', ' ').substring(0, 16) }
function goBack() { uni.navigateBack() }
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.retry-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: var(--jc-color-primary); background: var(--jc-color-surface-container-lowest); border: 2rpx solid var(--jc-color-primary); border-radius: 8rpx; }
.detail { padding-bottom: 48rpx; }
.status-header { margin: 24rpx; padding: 22rpx 24rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; border-left: 4rpx solid var(--jc-color-primary); display: flex; align-items: center; gap: 12rpx; }
.sh-label { font-size: 24rpx; color: var(--jc-color-on-surface-variant); }
.sh-amount { font-size: 24rpx; color: var(--jc-color-on-surface-variant); margin-left: auto; }
.card { margin: 24rpx; padding: 28rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: var(--jc-color-on-surface); margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 2rpx solid var(--jc-color-surface-container); }
.row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; }
.ll { font-size: 28rpx; color: var(--jc-color-outline); }
.vv { font-size: 28rpx; color: var(--jc-color-on-surface); text-align: right; max-width: 420rpx; word-break: break-all; }
.si-status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 6rpx; }
.status-confirmed { color: var(--jc-color-success); background: rgba(34, 197, 94, 0.08); }
.status-pending { color: var(--jc-color-warning); background: rgba(245, 158, 11, 0.1); }
.card-empty { font-size: 26rpx; color: var(--jc-color-outline-variant); text-align: center; padding: 16rpx 0; }
.content-text { font-size: 28rpx; color: var(--jc-color-on-surface); line-height: 1.6; white-space: pre-wrap; }
.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.textarea { width: 100%; min-height: 160rpx; padding: 16rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.submit-area { margin-top: 32rpx; }
.edit-actions { margin-top: 24rpx; display: flex; gap: 16rpx; }
.actions { margin: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.back-area { margin: 0 24rpx 24rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-checkin { background: var(--jc-color-success); color: var(--jc-color-on-primary); }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }
.btn-back { background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); border: 2rpx solid var(--jc-color-primary); }

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
