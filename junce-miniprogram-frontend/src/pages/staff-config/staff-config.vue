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
      <!-- 业务岗 -->
      <view class="form-section-label">岗位配置</view>
      <view class="form-item">
        <text class="label">业务岗</text>
        <picker :value="businessIndex" :range="businessOptions" :disabled="saving" @change="onBusinessChange">
          <view class="picker-view">
            <text :class="businessStaffId ? '' : 'placeholder'">{{ businessLabel || '请选择' }}</text>
          </view>
        </picker>
      </view>

      <!-- 会计岗 -->
      <view class="form-item">
        <text class="label">会计岗</text>
        <picker :value="accountantIndex" :range="accountantOptions" :disabled="saving" @change="onAccountantChange">
          <view class="picker-view">
            <text :class="accountantId ? '' : 'placeholder'">{{ accountantLabel || '请选择' }}</text>
          </view>
        </picker>
      </view>

      <!-- 总务岗 -->
      <view class="form-item">
        <text class="label">总务岗</text>
        <picker :value="generalAffairsIndex" :range="generalAffairsOptions" :disabled="saving" @change="onGeneralAffairsChange">
          <view class="picker-view">
            <text :class="generalAffairsId ? '' : 'placeholder'">{{ generalAffairsLabel || '请选择' }}</text>
          </view>
        </picker>
      </view>

    </view>
    <view v-if="!loading && !error" class="bottom-bar">
      <button
        class="save-btn"
        :class="saving ? 'btn-disabled' : 'btn-primary'"
        :disabled="saving"
        @tap="handleSave"
      >
        {{ saving ? '保存中...' : '保存人员配置' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, put } from '../../utils/request.js'

let customerId = ''

// ========== 状态 ==========
const loading = ref(true)
const error = ref(false)
const saving = ref(false)

// 用户列表（按角色分组）
const businessUsers = ref([])
const accountantUsers = ref([])
const generalAffairsUsers = ref([])

// 已选人员 ID
const businessStaffId = ref(null)
const accountantId = ref(null)
const generalAffairsId = ref(null)

// ========== picker 选项 ==========
const pickerPlaceholder = '请选择'

const businessOptions = computed(() => [pickerPlaceholder, ...businessUsers.value.map(u => u.realName)])
const accountantOptions = computed(() => [pickerPlaceholder, ...accountantUsers.value.map(u => u.realName)])
const generalAffairsOptions = computed(() => [pickerPlaceholder, ...generalAffairsUsers.value.map(u => u.realName)])

// ========== picker 索引 ==========
function findIndex(users, id) {
  if (!id) return 0
  const idx = users.findIndex(u => u.id === id)
  return idx === -1 ? 0 : idx + 1
}

const businessIndex = computed(() => findIndex(businessUsers.value, businessStaffId.value))
const accountantIndex = computed(() => findIndex(accountantUsers.value, accountantId.value))
const generalAffairsIndex = computed(() => findIndex(generalAffairsUsers.value, generalAffairsId.value))

// ========== picker 当前显示文本 ==========
const businessLabel = computed(() => {
  const u = businessUsers.value.find(u => u.id === businessStaffId.value)
  return u ? u.realName : ''
})
const accountantLabel = computed(() => {
  const u = accountantUsers.value.find(u => u.id === accountantId.value)
  return u ? u.realName : ''
})
const generalAffairsLabel = computed(() => {
  const u = generalAffairsUsers.value.find(u => u.id === generalAffairsId.value)
  return u ? u.realName : ''
})

// ========== picker change ==========
function onBusinessChange(e) {
  const index = e.detail.value
  businessStaffId.value = index === 0 ? null : businessUsers.value[index - 1].id
}
function onAccountantChange(e) {
  const index = e.detail.value
  accountantId.value = index === 0 ? null : accountantUsers.value[index - 1].id
}
function onGeneralAffairsChange(e) {
  const index = e.detail.value
  generalAffairsId.value = index === 0 ? null : generalAffairsUsers.value[index - 1].id
}

// ========== 数据加载 ==========
onLoad((options) => {
  if (options.customerId) {
    customerId = options.customerId
    fetchAll()
  }
})

async function fetchAll() {
  loading.value = true
  error.value = false

  try {
    const [bUsers, aUsers, gUsers, assignment] = await Promise.all([
      get('/users', { roleCode: '业务' }),
      get('/users', { roleCode: '会计' }),
      get('/users', { roleCode: '总务' }),
      get(`/customers/${customerId}/staff-assignment`).catch(e => {
        // 404 = 未配置，正常返回 null
        return null
      })
    ])

    businessUsers.value = Array.isArray(bUsers) ? bUsers : []
    accountantUsers.value = Array.isArray(aUsers) ? aUsers : []
    generalAffairsUsers.value = Array.isArray(gUsers) ? gUsers : []

    if (assignment) {
      businessStaffId.value = assignment.businessStaffId || null
      accountantId.value = assignment.accountantId || null
      generalAffairsId.value = assignment.generalAffairsId || null
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

// ========== 保存 ==========
function buildPayload() {
  const payload = {}
  if (businessStaffId.value) payload.businessStaffId = businessStaffId.value
  if (accountantId.value) payload.accountantId = accountantId.value
  if (generalAffairsId.value) payload.generalAffairsId = generalAffairsId.value
  return payload
}

async function handleSave() {
  const payload = buildPayload()
  if (Object.keys(payload).length === 0) {
    uni.showToast({ title: '未选择任何人员', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await put(`/customers/${customerId}/staff-assignment`, payload)
    uni.showToast({ title: '保存成功', icon: 'success' })
    uni.navigateBack()
  } catch (e) {
    // request.js 已 toast
  } finally {
    saving.value = false
  }
}
</script>

<style>
.container {
  min-height: 100vh;
  background: var(--jc-color-surface);
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
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
  padding: 32rpx 32rpx calc(180rpx + env(safe-area-inset-bottom));
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

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(201, 198, 197, 0.94);
  border-top: 1rpx solid var(--jc-color-outline-variant);
  box-sizing: border-box;
}

.btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  border: none;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  text-align: center;
  border: none;
  box-sizing: border-box;
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
.form { padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); }

</style>
