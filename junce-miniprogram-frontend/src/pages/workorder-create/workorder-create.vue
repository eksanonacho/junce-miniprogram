<template>
  <view class="container">
    <JcH5Back />
    <!-- loading -->
    <view v-if="loading" class="status-msg">加载中...</view>

    <!-- error -->
    <view v-else-if="error" class="status-msg">
      <text>加载失败</text>
      <button class="retry-btn" @tap="fetchAll">重试</button>
    </view>

    <!-- 正常表单 -->
    <view v-else class="form">
      <!-- 服务信息 -->
      <view class="form-section-label">服务信息</view>
      <view class="info-card">
        <text class="info-label">为以下服务创建办件</text>
        <text class="info-type">{{ serviceType || '—' }}</text>
        <text v-if="serviceItemStatus" class="info-status">当前状态：{{ serviceItemStatus }}</text>
      </view>

      <!-- 对接人 -->
      <view class="form-item">
        <text class="label">对接人</text>
        <picker :value="handlerIndex" :range="handlerOptions" :disabled="submitting" @change="onHandlerChange">
          <view class="picker-view">
            <text :class="handlerId ? '' : 'placeholder'">{{ handlerLabel || '请选择' }}</text>
          </view>
        </picker>
      </view>

      <!-- 回执接收人 -->
      <view class="form-item">
        <text class="label">回执接收人</text>
        <picker :value="receiverIndex" :range="receiverOptions" :disabled="submitting" @change="onReceiverChange">
          <view class="picker-view">
            <text :class="receiptReceiverId ? '' : 'placeholder'">{{ receiverLabel || '请选择' }}</text>
          </view>
        </picker>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-area">
        <button
          class="btn"
          :class="submitting ? 'btn-disabled' : 'btn-primary'"
          :disabled="submitting"
          @tap="handleSubmit"
        >
          {{ submitting ? '提交中...' : '创建办件' }}
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

let serviceItemId = ''
let customerId = ''

// ========== 状态 ==========
const loading = ref(true)
const error = ref(false)
const submitting = ref(false)
const serviceType = ref('')
const serviceItemStatus = ref('')

// 人员列表
const staffList = ref([])
const handlerId = ref(null)
const receiptReceiverId = ref(null)

// ========== picker 选项 ==========
const pickerPlaceholder = '请选择'
const handlerOptions = computed(() => [pickerPlaceholder, ...staffList.value.map(u => u.realName)])
const receiverOptions = computed(() => [pickerPlaceholder, ...staffList.value.map(u => u.realName)])

function findStaffIndex(id) {
  if (!id) return 0
  const idx = staffList.value.findIndex(u => u.id === id)
  return idx === -1 ? 0 : idx + 1
}

const handlerIndex = computed(() => findStaffIndex(handlerId.value))
const receiverIndex = computed(() => findStaffIndex(receiptReceiverId.value))

const handlerLabel = computed(() => {
  const u = staffList.value.find(u => u.id === handlerId.value)
  return u ? u.realName : ''
})
const receiverLabel = computed(() => {
  const u = staffList.value.find(u => u.id === receiptReceiverId.value)
  return u ? u.realName : ''
})

function onHandlerChange(e) {
  const idx = e.detail.value
  handlerId.value = idx === 0 ? null : staffList.value[idx - 1].id
}
function onReceiverChange(e) {
  const idx = e.detail.value
  receiptReceiverId.value = idx === 0 ? null : staffList.value[idx - 1].id
}

// ========== 数据加载 ==========
onLoad((options) => {
  serviceItemId = options.serviceItemId
  customerId = options.customerId
  if (serviceItemId && customerId) {
    fetchAll()
  } else {
    error.value = true
  }
})

async function fetchAll() {
  loading.value = true
  error.value = false

  try {
    const [serviceItems, assignment] = await Promise.all([
      get(`/customers/${customerId}/service-items`),
      get(`/customers/${customerId}/staff-assignment`).catch(() => null)
    ])

    // 找到对应服务项
    const items = Array.isArray(serviceItems) ? serviceItems : []
    const matched = items.find(item => String(item.id) === String(serviceItemId))
    if (matched) {
      serviceType.value = matched.serviceTemplate?.serviceType || ''
      serviceItemStatus.value = matched.status || ''
    }

    // 构建人员候选列表（从 staff-assignment）
    if (assignment) {
      const candidates = []
      if (assignment.businessStaff) candidates.push(assignment.businessStaff)
      if (assignment.accountant) candidates.push(assignment.accountant)
      // 去重
      staffList.value = candidates.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

// ========== 提交 ==========
function buildPayload() {
  const payload = { serviceItemId: Number(serviceItemId) }
  if (handlerId.value) payload.handlerId = handlerId.value
  if (receiptReceiverId.value) payload.receiptReceiverId = receiptReceiverId.value
  return payload
}

async function handleSubmit() {
  submitting.value = true

  try {
    await post('/work-orders', buildPayload())
    uni.showToast({ title: '创建成功', icon: 'success' })
    uni.navigateBack()
  } catch (e) {
    // request.js 409 分支已透传后端 message
  } finally {
    submitting.value = false
  }
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

.form {
  padding: 32rpx;
}

.info-card {
  margin-bottom: 32rpx;
  padding: 28rpx;
  background: var(--jc-color-surface-container-lowest);
  border-radius: 12rpx;
}

.info-label {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-outline);
  margin-bottom: 8rpx;
}

.info-type {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--jc-color-on-surface);
}

.info-status {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-outline);
  margin-top: 8rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  margin-bottom: 12rpx;
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
  margin-top: 48rpx;
}

.btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  border: none;
}

.btn-primary {
  background: var(--jc-color-primary);
  color: var(--jc-color-on-primary);
}

.btn-disabled {
  background: var(--jc-color-outline);
  color: var(--jc-color-on-primary);
}

.form-section-label { margin: 28rpx 28rpx 10rpx 28rpx; font-size: 22rpx; color: var(--jc-color-outline); font-weight: 500; letter-spacing: 1rpx; }

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
