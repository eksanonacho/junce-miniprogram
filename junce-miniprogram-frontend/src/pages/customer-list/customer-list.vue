<template>
  <view class="container">
    <view class="top-bar">
      <view class="brand-block">
        <view class="avatar">
          <text class="avatar-text">{{ (userStore.user?.realName || '君').slice(0, 1) }}</text>
        </view>
        <view>
          <text class="brand-title">君册财税</text>
          <text class="brand-subtitle">{{ userStore.user?.realName || '未登录' }} · {{ userStore.user?.roleName || '未登录' }}</text>
        </view>
      </view>
      <button v-if="canCreateCustomer" class="icon-btn" @tap="goToForm">＋</button>
    </view>

    <view class="hero-panel">
      <view>
        <text class="page-kicker">CLIENT PORTFOLIO</text>
        <text class="page-title">客户列表</text>
        <text class="page-subtitle">按客户状态、负责人和年流水快速判断服务优先级</text>
      </view>
      <view class="hero-count">
        <text class="hero-number">{{ list.length }}</text>
        <text class="hero-label">客户</text>
      </view>
    </view>

    <view class="metric-strip">
      <view class="metric-pill">
        <text class="metric-value">{{ lifecycleSummary.active }}</text>
        <text class="metric-label">服务中</text>
      </view>
      <view class="metric-pill">
        <text class="metric-value">{{ lifecycleSummary.todo }}</text>
        <text class="metric-label">待跟进</text>
      </view>
      <view class="metric-pill metric-wide">
        <text class="metric-value">{{ totalRevenue }}</text>
        <text class="metric-label">年流水合计</text>
      </view>
    </view>

    <view class="list-area">
      <view v-if="loading && list.length === 0" class="status-msg">加载中...</view>

      <view v-else-if="error && list.length === 0" class="status-msg">加载失败</view>

      <view v-else-if="!loading && list.length === 0" class="status-msg">暂无客户数据</view>

      <view v-else class="customer-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="customer-item"
          @tap="onItemClick(item)"
        >
          <view class="card-head">
            <text class="company-name">{{ item.companyName }}</text>
            <text class="status-chip" :class="getLifecycleClass(item.lifecycleStage)">{{ item.lifecycleStage || '—' }}</text>
          </view>
          <view class="info-grid">
            <view class="info-cell">
              <text class="info-label">负责人</text>
              <text class="info-value">{{ item.owner?.realName || '未配置' }}</text>
            </view>
            <view class="info-cell">
              <text class="info-label">客户类型</text>
              <text class="info-value">{{ item.customerCategory || '—' }}</text>
            </view>
            <view class="info-cell">
              <text class="info-label">行业 / 区域</text>
              <text class="info-value">{{ formatIndustryRegion(item) }}</text>
            </view>
            <view class="info-cell">
              <text class="info-label">客户分层</text>
              <text class="info-value">{{ item.tier || '—' }}</text>
            </view>
          </view>
          <view class="amount-row">
            <text class="amount-label">年流水</text>
            <text class="amount-value">{{ formatAmount(item.annualRevenue) }}</text>
          </view>
        </view>
      </view>
    </view>

    <button v-if="canCreateCustomer" class="fab" @tap="goToForm">＋</button>
    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { useUserStore } from '../../stores/user.js'
import { get } from '../../utils/request.js'

const userStore = useUserStore()

const list = ref([])
const loading = ref(false)
const error = ref(false)
const canCreateCustomer = computed(() => {
  const code = userStore.user?.roleCode
  return code === '商务' || code === '管理员'
})

const lifecycleSummary = computed(() => ({
  active: list.value.filter((item) => item.lifecycleStage === '服务中').length,
  todo: list.value.filter((item) => item.lifecycleStage === '填单').length
}))

const totalRevenue = computed(() => {
  const amount = list.value.reduce((sum, item) => sum + (Number(item.annualRevenue) || 0), 0)
  if (!amount) return '—'
  return '¥ ' + amount.toLocaleString('zh-CN')
})

onShow(() => {
  fetchCustomers()
})

async function fetchCustomers() {
  // 列表为空时才显示 loading（首次进入）；已有数据时静默刷新
  if (list.value.length === 0) {
    loading.value = true
  }
  error.value = false

  try {
    const res = await get('/customers')
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    // request.js 已弹 toast，页面层只设 error 状态
    error.value = true
  } finally {
    loading.value = false
  }
}

function goToForm() {
  uni.navigateTo({ url: '/pages/customer-form/customer-form' })
}

function onItemClick(item) {
  uni.navigateTo({ url: `/pages/customer-detail/customer-detail?id=${item.id}` })
}

function formatIndustryRegion(item) {
  const parts = [item.industry, item.region].filter(Boolean)
  return parts.length ? parts.join(' / ') : '—'
}

function formatAmount(val) {
  if (val == null || val === '') return '—'
  return '¥ ' + Number(val).toLocaleString('zh-CN')
}

function getLifecycleClass(status) {
  const map = {
    '填单': 'status-todo',
    '服务中': 'status-processing',
    '已完成': 'status-done',
    '已归档': 'status-done'
  }
  return map[status] || 'status-default'
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); padding-bottom: 220rpx; box-sizing: border-box; }
.top-bar { background: rgba(201, 198, 197, 0.88); border-bottom: 1rpx solid var(--jc-color-outline-variant); padding: 28rpx 32rpx 24rpx; display: flex; align-items: center; justify-content: space-between; backdrop-filter: blur(18rpx); }
.brand-block { display: flex; align-items: center; gap: 18rpx; }
.avatar { width: 56rpx; height: 56rpx; border-radius: 12rpx; background: var(--jc-color-surface-container-low); display: flex; align-items: center; justify-content: center; }
.avatar-text { font-size: 26rpx; font-weight: 700; color: var(--jc-color-primary); }
.brand-title { display: block; font-size: 32rpx; line-height: 38rpx; font-weight: 700; color: var(--jc-color-primary); }
.brand-subtitle { display: block; margin-top: 2rpx; font-size: 22rpx; line-height: 28rpx; color: var(--jc-color-on-surface-variant); }
.icon-btn { width: 64rpx; height: 64rpx; line-height: 60rpx; padding: 0; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 12rpx; background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); font-size: 38rpx; font-weight: 400; }
.hero-panel { margin: 28rpx 32rpx 18rpx; padding: 34rpx 32rpx; display: flex; justify-content: space-between; gap: 28rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 24rpx; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); background: linear-gradient(135deg, #d5d3d2 0%, #e6e4e3 100%); box-shadow: var(--jc-shadow-elevated); box-sizing: border-box; }
.page-kicker { display: block; margin-bottom: 10rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 2rpx; color: var(--jc-color-on-surface-variant); }
.page-title { display: block; font-size: 40rpx; line-height: 48rpx; font-weight: 800; color: var(--jc-color-on-surface); }
.page-subtitle { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.hero-count { flex-shrink: 0; min-width: 112rpx; height: 112rpx; border-radius: 22rpx; background: var(--jc-color-primary); color: var(--jc-color-on-primary); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hero-number { font-size: 38rpx; line-height: 44rpx; font-weight: 800; }
.hero-label { font-size: 20rpx; line-height: 24rpx; opacity: 0.82; }
.metric-strip { display: grid; grid-template-columns: 1fr 1fr 1.35fr; gap: 16rpx; padding: 0 32rpx 22rpx; }
.metric-pill { min-width: 0; padding: 20rpx 22rpx; border-radius: 18rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); box-sizing: border-box; }
.metric-value { display: block; font-size: 28rpx; line-height: 34rpx; font-weight: 800; color: var(--jc-color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.metric-label { display: block; margin-top: 6rpx; font-size: 20rpx; line-height: 26rpx; color: var(--jc-color-on-surface-variant); }
.list-area { min-height: 60vh; }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.customer-list { padding: 0 32rpx; }
.customer-item { position: relative; overflow: hidden; margin-bottom: 24rpx; padding: 30rpx 32rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 20rpx; box-sizing: border-box; box-shadow: var(--jc-shadow-card); }
.customer-item::before { content: ""; position: absolute; left: 0; top: 26rpx; bottom: 26rpx; width: 4rpx; border-radius: 0 4rpx 4rpx 0; background: var(--jc-color-primary); opacity: 0.78; }
.customer-item:active { background: var(--jc-color-surface-container-low); transform: scale(0.99); }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid var(--jc-color-outline-variant); }
.company-name { flex: 1; font-size: 32rpx; line-height: 42rpx; font-weight: 700; color: var(--jc-color-on-surface); }
.status-chip { flex-shrink: 0; font-size: 22rpx; line-height: 28rpx; font-weight: 600; padding: 6rpx 14rpx; border-radius: 8rpx; }
.status-todo { color: var(--jc-color-warning); background: var(--jc-color-surface-container); }
.status-processing { color: var(--jc-color-primary); background: var(--jc-color-surface-container-low); }
.status-done { color: var(--jc-color-success); background: var(--jc-color-surface-container); }
.status-default { color: var(--jc-color-on-surface-variant); background: var(--jc-color-surface-container); }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28rpx; row-gap: 18rpx; padding-top: 20rpx; }
.info-label { display: block; margin-bottom: 6rpx; font-size: 20rpx; line-height: 26rpx; color: var(--jc-color-on-surface-variant); }
.info-value { display: block; font-size: 26rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.amount-row { padding-top: 18rpx; }
.amount-label { display: block; margin-bottom: 4rpx; font-size: 20rpx; color: var(--jc-color-on-surface-variant); }
.amount-value { display: block; font-size: 32rpx; line-height: 40rpx; font-weight: 700; color: var(--jc-color-primary); }
.fab { position: fixed; right: 32rpx; bottom: calc(136rpx + env(safe-area-inset-bottom)); width: 88rpx; height: 88rpx; line-height: 82rpx; padding: 0; border-radius: 20rpx; background: var(--jc-color-primary); color: var(--jc-color-on-primary); font-size: 52rpx; box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.15); }
</style>
