<template>
  <view class="container">
    <JcH5Back />
    <!-- loading -->
    <view v-if="loading" class="status-msg">加载中...</view>

    <!-- error / 404 -->
    <view v-else-if="error" class="status-msg">
      <text>客户不存在</text>
      <button class="back-btn" @tap="goBack">返回列表</button>
    </view>

    <!-- 正常详情 -->
    <view v-else-if="customer" class="detail">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="row"><text class="label">企业名称</text><text class="value">{{ customer.companyName }}</text></view>
        <view class="row"><text class="label">客户分类</text><text class="value">{{ customer.customerCategory }}</text></view>
        <view class="row"><text class="label">公司类型</text><text class="value">{{ customer.companyType || '—' }}</text></view>
        <view class="row"><text class="label">行业</text><text class="value">{{ customer.industry || '—' }}</text></view>
        <view class="row"><text class="label">区域</text><text class="value">{{ customer.region || '—' }}</text></view>
        <view class="row"><text class="label">注册日期</text><text class="value">{{ customer.registerDate || '—' }}</text></view>
        <view class="row"><text class="label">税务类型</text><text class="value">{{ customer.taxType || '—' }}</text></view>
      </view>

      <!-- 归属信息 -->
      <view class="card">
        <view class="card-title">归属信息</view>
        <view class="row"><text class="label">主理人</text><text class="value">{{ customer.owner?.realName || '—' }}</text></view>
      </view>

      <!-- 财务信息 -->
      <view class="card">
        <view class="card-title">财务信息</view>
        <view class="row"><text class="label">年流水</text><text class="value">{{ formatRevenue(customer.annualRevenue) }}</text></view>
        <view class="row"><text class="label">人员数</text><text class="value">{{ customer.staffCount != null ? customer.staffCount + ' 人' : '—' }}</text></view>
      </view>

      <!-- 分层与状态 -->
      <view class="card">
        <view class="card-title">分层与状态</view>
        <view class="row"><text class="label">客户分层</text><text class="value">{{ customer.tier || '—' }}</text></view>
        <view class="row"><text class="label">生命周期</text><text class="value">{{ customer.lifecycleStage }}</text></view>
      </view>

      <!-- 首次提单完整度与岗位确认 -->
      <view class="card">
        <view class="card-title">首次提单</view>
        <view v-if="intakeLoading" class="card-status">检查中...</view>
        <view v-else-if="intakeError" class="card-status" style="color: var(--jc-color-error-core);">提单状态加载失败</view>
        <template v-else-if="intakeStatus">
          <view class="row">
            <text class="label">正式提交</text>
            <text class="si-status" :class="intakeStatus.submitted ? 'status-confirmed' : 'status-pending'">
              {{ intakeStatus.submitted ? '已提交' : (intakeStatus.ready ? '可提交' : '待补充') }}
            </text>
          </view>
          <view v-if="intakeStatus.missingItems?.length" class="intake-missing">
            <text class="intake-title">还需完成</text>
            <text v-for="item in intakeStatus.missingItems" :key="item" class="intake-item">• {{ item }}</text>
          </view>
          <view v-if="intakeStatus.assignmentConfirmations?.length" class="intake-confirmations">
            <text class="intake-title">岗位确认</text>
            <view v-for="item in intakeStatus.assignmentConfirmations" :key="item.position + item.user.id" class="row">
              <text class="label">{{ item.position }} · {{ item.user.realName }}</text>
              <text class="si-status" :class="item.confirmed ? 'status-confirmed' : 'status-pending'">{{ item.confirmed ? '已确认' : '待确认' }}</text>
            </view>
          </view>
          <view v-if="intakeStatus.canSubmit && intakeStatus.ready" class="card-action-right">
            <button class="btn btn-primary" :disabled="intakeSaving" @tap="handleSubmitIntake">{{ intakeSaving ? '提交中...' : '正式提交提单' }}</button>
          </view>
          <view v-if="intakeStatus.canConfirm" class="card-action-right">
            <button class="btn btn-checkin" :disabled="intakeSaving" @tap="handleConfirmIntake">{{ intakeSaving ? '确认中...' : '确认接单' }}</button>
          </view>
        </template>
      </view>

      <!-- 分隔 -->
      <view class="section-divider"><text class="sd-text">业务与服务</text></view>

      <!-- 服务项 -->
      <view class="card">
        <view class="card-title">服务项</view>
        <view v-if="serviceItemsLoading" class="card-status">加载中...</view>
        <view v-else-if="serviceItemsError" class="card-status" style="color: var(--jc-color-error-core);">加载失败</view>
        <view v-else-if="serviceItems.length === 0" class="card-status">暂无服务项</view>
        <view v-else>
          <view v-for="item in serviceItems" :key="item.id" class="service-item">
            <view class="si-top">
              <text class="si-type">{{ item.serviceTemplate?.serviceType || '—' }}</text>
              <text class="si-status" :class="getServiceStatusClass(item.status)">{{ item.status }}</text>
            </view>
            <view class="si-meta">
              <text class="si-label">周期：</text>
              <text class="si-text">{{ item.serviceTemplate?.estimatedDuration || '暂无' }}</text>
            </view>
            <!-- 已关联办件 -->
            <view v-if="item.workOrder" class="wo-linked">
              <view class="wo-linked-row">
                <text class="wo-linked-label">办件状态</text>
                <text class="wo-linked-status" :class="'wo-chip-' + (item.workOrder.status === '待办' ? 'todo' : item.workOrder.status === '办件中' ? 'doing' : item.workOrder.status === '办结' ? 'done' : 'checked')">{{ item.workOrder.status }}</text>
              </view>
              <view class="wo-linked-row">
                <text class="wo-linked-label">处理人</text>
                <text class="wo-linked-value">{{ item.workOrder.handler?.realName || '未指派' }}</text>
              </view>
              <view class="wo-linked-row">
                <text class="wo-linked-label">回执接收</text>
                <text class="wo-linked-value">{{ item.workOrder.receiptReceiver?.realName || '未指派' }}</text>
              </view>
              <text class="si-create-link" @tap="goToWorkOrderDetail(item.workOrder.id)">查看办件 ›</text>
            </view>
            <!-- 无办件 -->
            <view v-else-if="canCreateWorkOrder" class="wo-create-bar">
              <text class="si-create-link" @tap="goToCreateWorkOrder(item.id)">+ 创建办件</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 人员配置 -->
      <view class="card">
        <view class="card-title">人员配置</view>
        <view v-if="staffLoading" class="card-status">加载中...</view>
        <view v-else-if="staffError" class="card-status" style="color: var(--jc-color-error-core);">加载失败</view>
        <view v-else>
          <view class="row"><text class="label">业务岗</text><text class="value">{{ staffAssignment?.businessStaff?.realName || '未配置' }}</text></view>
          <view class="row"><text class="label">会计岗</text><text class="value">{{ staffAssignment?.accountant?.realName || '未配置' }}</text></view>
          <view class="row"><text class="label">总务岗</text><text class="value">{{ staffAssignment?.generalAffairs?.realName || '未配置' }}</text></view>
        </view>
      </view>

      <!-- 收费信息 -->
      <view class="card">
        <view class="card-title">收费信息</view>
        <view v-if="chargeLoading" class="card-status">加载中...</view>
        <view v-else-if="chargeError" class="card-status" style="color: var(--jc-color-error-core);">加载失败</view>
        <view v-else-if="charge">
          <view class="row"><text class="label">收费状态</text><text class="si-status" :class="getChargeStatusClass(charge.chargeStatus)">{{ charge.chargeStatus }}</text></view>
          <view class="row"><text class="label">收费方式</text><text class="value">{{ charge.chargeMode || '—' }}</text></view>
          <view class="row"><text class="label">金额</text><text class="value">{{ formatAmount(charge.amount) }}</text></view>
          <view class="card-action-right">
            <text class="si-create-link" @tap="goToChargeDetail(charge.id)">查看详情</text>
          </view>
        </view>
        <view v-else>
          <view class="card-status">暂无收费信息</view>
          <view v-if="canCreateCharge" class="card-action-right">
            <text class="si-create-link" @tap="goToCreateCharge">创建收费</text>
          </view>
        </view>
      </view>

      <!-- 托管入档（仅代理户） -->
      <view v-if="customer.customerCategory === '代理户'" class="card">
        <view class="card-title">托管入档</view>
        <view v-if="tenantLoading" class="card-status">加载中...</view>
        <view v-else-if="tenantError" class="card-status" style="color: var(--jc-color-error-core);">加载失败</view>
        <view v-else-if="tenantRegister">
          <view class="row">
            <text class="label">方案确认</text>
            <text class="si-status" :class="tenantRegister.planConfirmedByOwner ? 'status-confirmed' : 'status-pending'">{{ tenantRegister.planConfirmedByOwner ? '已确认' : '待确认' }}</text>
          </view>
          <view class="row"><text class="label">分派会计</text><text class="value">{{ tenantRegister.assignedAccountant?.realName || '未分派' }}</text></view>
          <view class="card-action-right">
            <text class="si-create-link" @tap="goToTenantDetail(tenantRegister.id)">查看详情</text>
          </view>
        </view>
        <view v-else>
          <view class="card-status">暂无托管记录</view>
          <view v-if="canCreateTenant" class="card-action-right">
            <text class="si-create-link" @tap="goToCreateTenant">创建托管</text>
          </view>
        </view>
      </view>

      <!-- 系统信息 -->
      <view class="card">
        <view class="card-title">系统信息</view>
        <view class="row"><text class="label">创建时间</text><text class="value">{{ formatTime(customer.createdAt) }}</text></view>
        <view class="row"><text class="label">最近更新</text><text class="value">{{ formatTime(customer.updatedAt) }}</text></view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions">
        <button v-if="canManageCustomer" class="btn btn-primary" @tap="goToServiceSelect">服务配置</button>
        <button v-if="canConfigStaff" class="btn btn-primary action-btn" @tap="goToStaffConfig">配置人员</button>
        <button v-if="canManageCustomer" class="btn btn-primary action-btn" @tap="goToEdit">编辑客户</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

const customer = ref(null)
const loading = ref(false)
const error = ref(false)
let currentId = ''
let skipNextShow = true

// 服务项
const serviceItems = ref([])
const serviceItemsLoading = ref(false)
const serviceItemsError = ref(false)

// 人员配置
const staffAssignment = ref(null)
const staffLoading = ref(false)
const staffError = ref(false)

// 收费信息
const charge = ref(null)
const chargeLoading = ref(false)
const chargeError = ref(false)

// 首次提单
const intakeStatus = ref(null)
const intakeLoading = ref(false)
const intakeError = ref(false)
const intakeSaving = ref(false)

// 角色判断：商务/主管/管理员可配置人员
const canConfigStaff = computed(() => {
  const code = userStore.user?.roleCode
  return code === '商务' || code === '主管' || code === '管理员'
})

// 角色判断：商务/总务/管理员可创建收费
const canCreateCharge = computed(() => {
  const code = userStore.user?.roleCode
  return code === '商务' || code === '总务' || code === '管理员'
})

// 托管入档
const tenantRegister = ref(null)
const tenantLoading = ref(false)
const tenantError = ref(false)

const isCustomerOwner = computed(() => {
  return Number(customer.value?.ownerId) === Number(userStore.user?.id)
})

// 客户基本资料和服务项：仅客户主理人本人或管理员可修改。
const canManageCustomer = computed(() => {
  const code = userStore.user?.roleCode
  return code === '管理员' || (code === '商务' && isCustomerOwner.value)
})

// 创建办件属于客户提单后的分派动作，主管可兜底处理。
const canCreateWorkOrder = computed(() => {
  const code = userStore.user?.roleCode
  return code === '管理员' || code === '主管' || (code === '商务' && isCustomerOwner.value)
})

// 角色判断：会计/主管/管理员可创建托管
const canCreateTenant = computed(() => {
  const code = userStore.user?.roleCode
  return code === '会计' || code === '主管' || code === '管理员'
})

onLoad((options) => {
  currentId = options.id
  if (currentId) {
    fetchDetail(currentId)
    fetchServiceItems()
    fetchStaffAssignment()
    fetchCharge()
    fetchIntakeStatus()
  } else {
    error.value = true
  }
})

onShow(() => {
  if (skipNextShow) {
    skipNextShow = false
    return
  }
  if (currentId) {
    fetchDetail(currentId)
    fetchServiceItems()
    fetchStaffAssignment()
    fetchCharge()
    fetchIntakeStatus()
  }
})

async function fetchDetail(id) {
  loading.value = true
  error.value = false

  try {
    const res = await get(`/customers/${id}`)
    customer.value = res
    if (res.customerCategory === '代理户') {
      await fetchTenantRegister()
    } else {
      tenantRegister.value = null
      tenantError.value = false
    }
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function fetchServiceItems() {
  serviceItemsLoading.value = true
  serviceItemsError.value = false

  try {
    const res = await get(`/customers/${currentId}/service-items`)
    serviceItems.value = Array.isArray(res) ? res : []
  } catch (e) {
    serviceItemsError.value = true
  } finally {
    serviceItemsLoading.value = false
  }
}

async function fetchStaffAssignment() {
  staffLoading.value = true
  staffError.value = false

  try {
    const res = await get(`/customers/${currentId}/staff-assignment`)
    staffAssignment.value = res
  } catch (e) {
    // 404 = 未配置，正常
    staffAssignment.value = null
  } finally {
    staffLoading.value = false
  }
}

async function fetchCharge() {
  chargeLoading.value = true
  chargeError.value = false

  try {
    const res = await get('/charges', { customerId: currentId })
    const list = Array.isArray(res) ? res : []
    charge.value = list.length > 0 ? list[0] : null
  } catch (e) {
    chargeError.value = true
  } finally {
    chargeLoading.value = false
  }
}

async function fetchTenantRegister() {
  if (customer.value?.customerCategory !== '代理户') return
  tenantLoading.value = true
  tenantError.value = false
  try {
    const res = await get('/tenant-registers', { customerId: currentId })
    const list = Array.isArray(res) ? res : []
    tenantRegister.value = list.length > 0 ? list[0] : null
  } catch (e) {
    tenantError.value = true
  } finally {
    tenantLoading.value = false
  }
}

async function fetchIntakeStatus() {
  intakeLoading.value = true
  intakeError.value = false
  try {
    intakeStatus.value = await get(`/customers/${currentId}/intake-status`)
  } catch (e) {
    intakeError.value = true
  } finally {
    intakeLoading.value = false
  }
}

async function handleSubmitIntake() {
  intakeSaving.value = true
  try {
    intakeStatus.value = await post(`/customers/${currentId}/submit-intake`)
    uni.showToast({ title: '提单已提交', icon: 'success' })
  } catch (e) {
    // request.js 已提示
  } finally {
    intakeSaving.value = false
  }
}

async function handleConfirmIntake() {
  intakeSaving.value = true
  try {
    intakeStatus.value = await post(`/customers/${currentId}/confirm-intake-assignment`)
    uni.showToast({ title: '接单已确认', icon: 'success' })
  } catch (e) {
    // request.js 已提示
  } finally {
    intakeSaving.value = false
  }
}

function formatRevenue(val) {
  if (val == null) return '—'
  const num = Number(val)
  return num.toLocaleString('zh-CN') + ' 元'
}

function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 16)
}

function goBack() {
  uni.navigateBack()
}

function goToEdit() {
  uni.navigateTo({ url: `/pages/customer-edit/customer-edit?id=${currentId}` })
}

function goToServiceSelect() {
  uni.navigateTo({ url: `/pages/service-template-select/service-template-select?customerId=${currentId}` })
}

function goToStaffConfig() {
  uni.navigateTo({ url: `/pages/staff-config/staff-config?customerId=${currentId}` })
}

function goToCreateWorkOrder(serviceItemId) {
  uni.navigateTo({ url: `/pages/workorder-create/workorder-create?serviceItemId=${serviceItemId}&customerId=${currentId}` })
}

function goToWorkOrderDetail(workOrderId) {
  uni.navigateTo({ url: `/pages/workorder-detail/workorder-detail?id=${workOrderId}` })
}

function goToChargeDetail(chargeId) {
  uni.navigateTo({ url: `/pages/charge-detail/charge-detail?id=${chargeId}` })
}

function goToCreateCharge() {
  uni.navigateTo({ url: `/pages/charge-detail/charge-detail?customerId=${currentId}&mode=create` })
}

function goToTenantDetail(id) {
  uni.navigateTo({ url: `/pages/tenant-detail/tenant-detail?id=${id}` })
}

function goToCreateTenant() {
  uni.navigateTo({ url: `/pages/tenant-detail/tenant-detail?customerId=${currentId}&mode=create` })
}

function getServiceStatusClass(status) {
  const map = { '待办': 'status-todo', '办件中': 'status-processing', '办结': 'status-done' }
  return map[status] || 'status-default'
}
function getChargeStatusClass(status) {
  const map = { '未收': 'status-unpaid', '已收': 'status-paid' }
  return map[status] || 'status-default'
}

function formatAmount(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN') + ' 元'
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

.back-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  font-size: 26rpx;
  color: var(--jc-color-primary);
  background: var(--jc-color-surface-container-lowest);
  border: 2rpx solid var(--jc-color-primary);
  border-radius: 8rpx;
}

.detail {
  padding-bottom: 48rpx;
}

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

.intake-missing,
.intake-confirmations {
  margin-top: 20rpx;
  padding: 20rpx;
  background: var(--jc-color-surface-container);
  border-radius: 10rpx;
}

.intake-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--jc-color-on-surface);
}

.intake-item {
  display: block;
  padding: 4rpx 0;
  font-size: 24rpx;
  line-height: 34rpx;
  color: var(--jc-color-on-surface-variant);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.label {
  font-size: 28rpx;
  color: var(--jc-color-outline);
}

.value {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  text-align: right;
  max-width: 420rpx;
  word-break: break-all;
}

.actions {
  margin: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  min-width: 180rpx;
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

.section-divider { margin: 28rpx 28rpx 12rpx; }
.sd-text { font-size: 22rpx; color: var(--jc-color-outline); font-weight: 500; letter-spacing: 1rpx; }
/* 服务项 */
.card-status {
  font-size: 26rpx;
  color: var(--jc-color-outline);
  text-align: center;
  padding: 16rpx 0;
}

.service-item {
  padding: 16rpx 0;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.service-item:last-child {
  border-bottom: none;
}

.si-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.si-type {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--jc-color-on-surface);
}

.si-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.si-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.si-create-link {
  font-size: 22rpx;
  color: var(--jc-color-primary);
  padding: 4rpx 8rpx;
}

/* 已关联办件 */
.wo-linked {
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid var(--jc-color-outline-variant);
}

.wo-linked-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6rpx 0;
}

.wo-linked-label {
  font-size: 22rpx;
  color: var(--jc-color-on-surface-variant);
}

.wo-linked-value {
  font-size: 24rpx;
  color: var(--jc-color-on-surface);
}

.wo-linked-status {
  font-size: 22rpx;
  font-weight: 600;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.wo-chip-todo { color: var(--jc-color-warning); background: rgba(245, 158, 11, 0.1); }
.wo-chip-doing { color: var(--jc-color-primary); background: rgba(247, 189, 72, 0.1); }
.wo-chip-done { color: var(--jc-color-success); background: rgba(34, 197, 94, 0.08); }
.wo-chip-checked { color: var(--jc-color-on-surface-variant); background: var(--jc-color-surface-container); }

.wo-create-bar {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed var(--jc-color-outline-variant);
}

.status-todo {
  color: var(--jc-color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.status-processing {
  color: var(--jc-color-primary);
  background: rgba(247, 189, 72, 0.1);
}

.status-done {
  color: var(--jc-color-success);
  background: rgba(34, 197, 94, 0.08);
}

.si-meta {
  display: flex;
  align-items: center;
}

.si-label {
  font-size: 24rpx;
  color: var(--jc-color-outline);
}

.si-text {
  font-size: 24rpx;
  color: var(--jc-color-on-surface-variant);
}

.card-action-right {
  text-align: right;
  padding-top: 12rpx;
}

.status-unpaid {
  color: var(--jc-color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.status-paid {
  color: var(--jc-color-success);
  background: rgba(34, 197, 94, 0.08);
}

.status-confirmed {
  color: var(--jc-color-success);
  background: rgba(34, 197, 94, 0.08);
}

.status-pending {
  color: var(--jc-color-warning);
  background: rgba(245, 158, 11, 0.1);
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
