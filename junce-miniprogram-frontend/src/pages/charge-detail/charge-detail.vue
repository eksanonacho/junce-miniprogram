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
      <!-- 客户信息卡片 -->
      <view v-if="createCustomer" class="card">
        <view class="card-title">创建收费记录</view>
        <view class="row"><text class="ll">客户</text><text class="vv">{{ createCustomer.companyName || '—' }}</text></view>
      </view>

      <!-- 收费表单 -->
      <view class="card">
        <view class="card-title">收费与合同 / 发票信息</view>
        <view class="form-item">
          <text class="label">收费方式 *</text>
          <picker :value="formModeIndex" :range="modeOptions" :disabled="submitting" @change="onModeChange">
            <view class="picker-view">
              <text :class="form.chargeMode ? '' : 'placeholder'">{{ form.chargeMode || '请选择' }}</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">金额 *</text>
          <input class="input" type="digit" v-model="form.amount" placeholder="请输入金额" :disabled="submitting" />
        </view>
        <view class="form-item">
          <text class="label">合同号</text>
          <input class="input" v-model="form.contractNo" placeholder="请输入合同号（选填）" :disabled="submitting" />
        </view>
        <view class="form-item">
          <text class="label">发票号</text>
          <input class="input" v-model="form.invoiceNo" placeholder="请输入发票号（选填）" :disabled="submitting" />
        </view>
        <view class="submit-area">
          <button class="btn" :class="submitting ? 'btn-disabled' : 'btn-primary'" :disabled="submitting" @tap="handleCreate">
            {{ submitting ? '提交中...' : '提交' }}
          </button>
        </view>
      </view>
    </view>

    <!-- view / edit 模式 -->
    <view v-else-if="charge" class="detail">
      <view class="status-header">
        <text class="sh-label">收费状态</text>
        <text class="si-status" :class="getChargeStatusClass(charge.chargeStatus)">{{ charge.chargeStatus }}</text>
        <text class="sh-amount">{{ formatAmount(charge.amount) }}</text>
      </view>
      <!-- 收费信息 -->
      <view class="card">
        <view class="card-title">收费信息</view>
        <template v-if="pageMode === 'edit'">
          <view class="form-item">
            <text class="label">收费方式</text>
            <picker :value="formModeIndex" :range="modeOptions" :disabled="submitting" @change="onModeChange">
              <view class="picker-view">
                <text :class="form.chargeMode ? '' : 'placeholder'">{{ form.chargeMode || '请选择' }}</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">金额</text>
            <input class="input" type="digit" v-model="form.amount" placeholder="请输入金额" :disabled="submitting" />
          </view>
          <view class="form-item">
            <text class="label">合同号</text>
            <input class="input" v-model="form.contractNo" placeholder="请输入合同号" :disabled="submitting" />
          </view>
          <view class="form-item">
            <text class="label">发票号</text>
            <input class="input" v-model="form.invoiceNo" placeholder="请输入发票号" :disabled="submitting" />
          </view>
          <view class="edit-actions">
            <button class="btn btn-primary" :disabled="saving" @tap="handleSaveEdit">{{ saving ? '保存中...' : '保存' }}</button>
            <button class="btn btn-back" @tap="cancelEdit">取消</button>
          </view>
        </template>
        <template v-else>
          <view class="row">
            <text class="ll">收费状态</text>
            <text class="si-status" :class="getChargeStatusClass(charge.chargeStatus)">{{ charge.chargeStatus }}</text>
          </view>
          <view class="row"><text class="ll">收费方式</text><text class="vv">{{ charge.chargeMode || '—' }}</text></view>
          <view class="row"><text class="ll">金额</text><text class="vv">{{ formatAmount(charge.amount) }}</text></view>
          <view class="row"><text class="ll">客户</text><text class="vv">{{ charge.customer?.companyName || '—' }}</text></view>
          <view class="row"><text class="ll">合同号</text><text class="vv">{{ charge.contractNo || '暂未录入合同号' }}</text></view>
          <view class="row"><text class="ll">发票号</text><text class="vv">{{ charge.invoiceNo || '暂未录入发票号' }}</text></view>
        </template>
      </view>

      <!-- 确认信息 -->
      <view class="card" v-if="pageMode !== 'edit'">
        <view class="card-title">确认信息</view>
        <view class="row"><text class="ll">确认人</text><text class="vv">{{ charge.confirmer?.realName || '未确认' }}</text></view>
        <view class="row"><text class="ll">确认时间</text><text class="vv">{{ formatTime(charge.confirmedAt) }}</text></view>
        <view class="row"><text class="ll">创建时间</text><text class="vv">{{ formatTime(charge.createdAt) }}</text></view>
        <view class="row"><text class="ll">更新时间</text><text class="vv">{{ formatTime(charge.updatedAt) }}</text></view>
      </view>

      <!-- 催收记录 -->
      <view class="card" v-if="pageMode !== 'edit'">
        <view class="card-title">催收记录</view>
        <view v-if="reminders.length === 0" class="card-empty">暂无催收记录</view>
        <view v-else>
          <view v-for="r in reminders" :key="r.id" class="reminder-item">
            <view class="reminder-top">
              <text class="reminder-from">{{ r.fromUser?.realName || '—' }}</text>
              <text class="reminder-arrow">→</text>
              <text class="reminder-to">{{ r.toUser?.realName || '—' }}</text>
            </view>
            <text class="reminder-msg">{{ r.message || '（无备注）' }}</text>
            <text class="reminder-time">{{ formatTime(r.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 (view 模式) -->
      <view v-if="pageMode === 'view'" class="actions">
        <button v-if="canEdit" class="btn btn-primary" @tap="enterEdit">修改</button>
        <button v-if="canConfirm" class="btn btn-primary" @tap="handleConfirm" :disabled="saving">{{ saving ? '处理中...' : '确认已收' }}</button>
        <button v-if="canRemind" class="btn btn-checkin" @tap="showRemind = true" :disabled="saving">发起催收</button>
      </view>

      <!-- 催收弹窗 -->
      <view v-if="showRemind" class="card">
        <view class="card-title">发起催收</view>
        <view class="form-item">
          <text class="label">催收备注</text>
          <input class="input" v-model="remindMessage" placeholder="请输入催收备注（选填）" />
        </view>
        <view class="edit-actions">
          <button class="btn btn-primary" :disabled="saving" @tap="handleRemind">{{ saving ? '发送中...' : '发送催收' }}</button>
          <button class="btn btn-back" @tap="showRemind = false; remindMessage = ''">取消</button>
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
const pageMode = ref('loading')  // 'loading' | 'error' | 'view' | 'edit' | 'create'
const errorMsg = ref('收费记录不存在')
const charge = ref(null)
const reminders = ref([])
const saving = ref(false)
const submitting = ref(false)   // create 提交

// create 模式客户信息
const createCustomer = ref(null)

// edit 表单
const form = ref(getInitialForm())
const modeOptions = ['请选择', '一次性', '定金加尾款']
const formModeIndex = computed(() => {
  const i = modeOptions.indexOf(form.value.chargeMode)
  return i === -1 ? 0 : i
})

// 催收弹窗
const showRemind = ref(false)
const remindMessage = ref('')

// ========== 权限 ==========
const roleCode = computed(() => userStore.user?.roleCode || '')
const canEdit = computed(() => (roleCode.value === '总务' || roleCode.value === '管理员'))
const canConfirm = computed(() => canEdit.value && charge.value?.chargeStatus === '未收')
const canRemind = computed(() => canEdit.value && charge.value?.chargeStatus === '未收')

function getInitialForm() {
  return { chargeMode: '', amount: '', contractNo: '', invoiceNo: '' }
}

function onModeChange(e) {
  const i = e.detail.value
  form.value.chargeMode = i === 0 ? '' : modeOptions[i]
}

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
    errorMsg.value = '缺少收费记录 ID'
  }
})

async function fetchCustomerForCreate() {
  try {
    const res = await get(`/customers/${customerIdForCreate}`)
    createCustomer.value = res
  } catch (e) {
    pageMode.value = 'error'
    errorMsg.value = '客户不存在'
  }
}

async function fetchDetail() {
  pageMode.value = 'loading'

  try {
    const [chargeRes, remindersRes] = await Promise.all([
      get(`/charges/${currentId}`),
      get(`/charges/${currentId}/reminders`)
    ])

    charge.value = chargeRes
    reminders.value = Array.isArray(remindersRes) ? remindersRes : []
    pageMode.value = 'view'
  } catch (e) {
    pageMode.value = 'error'
  }
}

// ========== 编辑 ==========
function enterEdit() {
  form.value = {
    chargeMode: charge.value.chargeMode || '',
    amount: charge.value.amount != null ? String(charge.value.amount) : '',
    contractNo: charge.value.contractNo || '',
    invoiceNo: charge.value.invoiceNo || ''
  }
  pageMode.value = 'edit'
}

function cancelEdit() {
  pageMode.value = 'view'
}

function buildPatchPayload() {
  const payload = {}
  if (form.value.chargeMode && form.value.chargeMode !== (charge.value.chargeMode || '')) {
    payload.chargeMode = form.value.chargeMode
  }
  const newAmount = form.value.amount !== '' ? Number(form.value.amount) : null
  if (newAmount != null && newAmount !== charge.value.amount) {
    payload.amount = newAmount
  }
  if (form.value.contractNo !== (charge.value.contractNo || '')) {
    payload.contractNo = form.value.contractNo || null
  }
  if (form.value.invoiceNo !== (charge.value.invoiceNo || '')) {
    payload.invoiceNo = form.value.invoiceNo || null
  }
  return payload
}

async function handleSaveEdit() {
  if (!form.value.chargeMode) {
    uni.showToast({ title: '请选择收费方式', icon: 'none' })
    return
  }
  if (!form.value.amount || isNaN(Number(form.value.amount)) || Number(form.value.amount) < 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' })
    return
  }

  const payload = buildPatchPayload()
  if (Object.keys(payload).length === 0) {
    uni.showToast({ title: '未修改任何字段', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await patch(`/charges/${currentId}`, payload)
    uni.showToast({ title: '保存成功', icon: 'success' })
    await fetchDetail()
  } catch (e) {
    // request.js 已 toast
  } finally {
    saving.value = false
  }
}

// ========== 确认已收 ==========
async function handleConfirm() {
  saving.value = true
  try {
    await post(`/charges/${currentId}/confirm`)
    uni.showToast({ title: '确认成功', icon: 'success' })
    await fetchDetail()
  } catch (e) {
    // request.js 已 toast
  } finally {
    saving.value = false
  }
}

// ========== 催收 ==========
async function handleRemind() {
  saving.value = true
  try {
    const payload = {}
    if (remindMessage.value.trim()) payload.message = remindMessage.value.trim()
    await post(`/charges/${currentId}/remind`, payload)
    uni.showToast({ title: '催收已发送', icon: 'success' })
    showRemind.value = false
    remindMessage.value = ''
    await fetchDetail()
  } catch (e) {
    // request.js 已 toast
  } finally {
    saving.value = false
  }
}

// ========== 创建 ==========
async function handleCreate() {
  if (!form.value.chargeMode) {
    uni.showToast({ title: '请选择收费方式', icon: 'none' })
    return
  }
  if (!form.value.amount || isNaN(Number(form.value.amount)) || Number(form.value.amount) < 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      customerId: Number(customerIdForCreate),
      chargeMode: form.value.chargeMode,
      amount: Number(form.value.amount)
    }
    if (form.value.contractNo.trim()) payload.contractNo = form.value.contractNo.trim()
    if (form.value.invoiceNo.trim()) payload.invoiceNo = form.value.invoiceNo.trim()

    const res = await post('/charges', payload)
    uni.showToast({ title: '创建成功', icon: 'success' })
    // 跳转到 view 模式
    uni.redirectTo({ url: `/pages/charge-detail/charge-detail?id=${res.id}` })
  } catch (e) {
    // request.js 已 toast
  } finally {
    submitting.value = false
  }
}

// ========== 工具 ==========
function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 16)
}

function formatAmount(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN') + ' 元'
}

function getChargeStatusClass(status) {
  const map = { '未收': 'status-unpaid', '已收': 'status-paid' }
  return map[status] || 'status-default'
}

function goBack() {
  uni.navigateBack()
}
</script>

<style>
.container {
  min-height: 100vh;
  background: var(--jc-color-surface);
}

.status-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  font-size: 28rpx;
  color: var(--jc-color-outline);
}

.retry-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  font-size: 26rpx;
  color: var(--jc-color-primary);
  background: var(--jc-color-surface-container-lowest);
  border: 2rpx solid var(--jc-color-primary);
  border-radius: 8rpx;
}

.detail { padding-bottom: 48rpx; }
.status-header { margin: 24rpx; padding: 22rpx 24rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; border-left: 4rpx solid var(--jc-color-primary); display: flex; align-items: center; gap: 12rpx; }
.sh-label { font-size: 24rpx; color: var(--jc-color-on-surface-variant); }
.sh-amount { font-size: 28rpx; font-weight: 600; color: var(--jc-color-on-surface); margin-left: auto; }

.card {
  margin: 24rpx;
  padding: 28rpx;
  background: var(--jc-color-surface-container-lowest);
  border-radius: 12rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--jc-color-on-surface);
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.ll {
  font-size: 28rpx;
  color: var(--jc-color-outline);
}

.vv {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  text-align: right;
  max-width: 420rpx;
  word-break: break-all;
}

.si-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.status-unpaid {
  color: var(--jc-color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.status-paid {
  color: var(--jc-color-success);
  background: rgba(34, 197, 94, 0.08);
}

.card-empty {
  font-size: 26rpx;
  color: var(--jc-color-outline-variant);
  text-align: center;
  padding: 16rpx 0;
}

/* 催收记录 */
.reminder-item {
  padding: 16rpx 0;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.reminder-item:last-child {
  border-bottom: none;
}

.reminder-top {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.reminder-from {
  font-size: 24rpx;
  color: var(--jc-color-primary);
}

.reminder-arrow {
  font-size: 24rpx;
  color: var(--jc-color-outline-variant);
  margin: 0 8rpx;
}

.reminder-to {
  font-size: 24rpx;
  color: var(--jc-color-primary);
}

.reminder-msg {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-on-surface);
  margin-bottom: 4rpx;
}

.reminder-time {
  font-size: 22rpx;
  color: var(--jc-color-outline);
}

/* 表单 */
.form-item {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  margin-bottom: 12rpx;
}

.input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 10rpx;
  font-size: 28rpx;
  background: var(--jc-color-surface-container-lowest);
}

.picker-view {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 10rpx;
  font-size: 28rpx;
  background: var(--jc-color-surface-container-lowest);
  display: flex;
  align-items: center;
}

.placeholder {
  color: var(--jc-color-outline);
}

.submit-area {
  margin-top: 32rpx;
}

.edit-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

/* 按钮 */
.actions {
  margin: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.back-area {
  margin: 0 24rpx 24rpx;
}

.btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  border: none;
  width: 100%;
}

.btn-primary {
  background: var(--jc-color-primary);
  color: var(--jc-color-on-primary);
}

.btn-checkin {
  background: var(--jc-color-success);
  color: var(--jc-color-on-primary);
}

.btn-disabled {
  background: var(--jc-color-outline);
  color: var(--jc-color-on-primary);
}

.btn-back {
  background: var(--jc-color-surface-container-lowest);
  color: var(--jc-color-primary);
  border: 2rpx solid var(--jc-color-primary);
}

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
