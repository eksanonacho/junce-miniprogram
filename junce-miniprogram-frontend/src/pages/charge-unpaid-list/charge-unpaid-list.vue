<template>
  <view class="container">
    <JcH5Back />
    <view class="hero-panel">
      <view>
        <text class="page-kicker">RECEIVABLES</text>
        <text class="page-title">收费 / 合同 / 发票</text>
        <text class="page-subtitle">当前页面用于查看客户收费状态、合同号、发票号和收款确认情况。</text>
      </view>
      <view class="hero-total">
        <text class="hero-amount">{{ totalAmount }}</text>
        <text class="hero-label">{{ list.length }} 条记录</text>
      </view>
    </view>

    <view v-if="loading" class="status-msg">加载中...</view>

    <view v-else-if="error" class="status-msg">
      <text>加载失败</text>
      <button class="retry-btn" @tap="fetchList">重试</button>
    </view>

    <view v-else-if="list.length === 0" class="status-msg">暂无未收款记录</view>

    <view v-else class="list-area">
      <view
        v-for="item in list"
        :key="item.id"
        class="charge-card"
        @tap="goToDetail(item.id)"
      >
        <view class="card-head">
          <text class="charge-customer">{{ item.customer?.companyName || '—' }}</text>
          <text class="status-chip status-unpaid">{{ item.chargeStatus }}</text>
        </view>
        <view class="meta-grid">
          <view class="meta-cell">
            <text class="meta-label">收费模式</text>
            <text class="meta-value">{{ item.chargeMode || '—' }}</text>
          </view>
          <view class="meta-cell">
            <text class="meta-label">创建时间</text>
            <text class="meta-value">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
        <view class="meta-grid meta-grid--secondary">
          <view class="meta-cell">
            <text class="meta-label">合同号</text>
            <text class="meta-value">{{ item.contractNo || '暂未录入' }}</text>
          </view>
          <view class="meta-cell">
            <text class="meta-label">发票号</text>
            <text class="meta-value">{{ item.invoiceNo || '暂未录入' }}</text>
          </view>
        </view>
        <view class="amount-row">
          <text class="amount-label">应收金额</text>
          <text class="charge-amount">{{ formatAmount(item.amount) }}</text>
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
import { get } from '../../utils/request.js'

const list = ref([])
const loading = ref(false)
const error = ref(false)

const totalAmount = computed(() => {
  const amount = list.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  if (!amount) return '—'
  return '¥ ' + amount.toLocaleString('zh-CN')
})

onShow(() => {
  fetchList()
})

async function fetchList() {
  if (list.value.length === 0) {
    loading.value = true
  }
  error.value = false

  try {
    const res = await get('/charges', { chargeStatus: '未收' })
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function goToDetail(id) {
  uni.navigateTo({ url: `/pages/charge-detail/charge-detail?id=${id}` })
}

function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 16)
}

function formatAmount(val) {
  if (val == null) return '—'
  return '¥ ' + Number(val).toLocaleString('zh-CN')
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.hero-panel { margin: 28rpx 32rpx 22rpx; padding: 34rpx 32rpx; display: flex; align-items: flex-start; justify-content: space-between; gap: 26rpx; border-radius: 24rpx; border: 1rpx solid var(--jc-color-outline-variant); background: linear-gradient(135deg, #d5d3d2 0%, #e6e4e3 100%); box-shadow: var(--jc-shadow-elevated); box-sizing: border-box; }
.page-kicker { display: block; margin-bottom: 8rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 2rpx; color: var(--jc-color-on-surface-variant); }
.page-title { display: block; font-size: 40rpx; line-height: 48rpx; font-weight: 800; color: var(--jc-color-on-surface); }
.page-subtitle { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.hero-total { flex-shrink: 0; max-width: 250rpx; padding: 22rpx 20rpx; border-radius: 20rpx; background: var(--jc-color-primary); color: var(--jc-color-on-primary); box-sizing: border-box; }
.hero-amount { display: block; font-size: 26rpx; line-height: 34rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-label { display: block; margin-top: 6rpx; font-size: 20rpx; line-height: 24rpx; opacity: 0.82; }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.retry-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: var(--jc-color-primary); background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-primary); border-radius: 8rpx; }
.list-area { padding: 0 32rpx; }
.charge-card { position: relative; overflow: hidden; margin-bottom: 24rpx; padding: 30rpx 32rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 20rpx; box-sizing: border-box; box-shadow: var(--jc-shadow-card); }
.charge-card::before { content: ""; position: absolute; left: 0; top: 26rpx; bottom: 26rpx; width: 4rpx; border-radius: 0 4rpx 4rpx 0; background: var(--jc-color-warning); opacity: 0.86; }
.charge-card:active { background: var(--jc-color-surface-container-low); transform: scale(0.99); }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid var(--jc-color-outline-variant); }
.charge-customer { flex: 1; font-size: 32rpx; line-height: 42rpx; font-weight: 700; color: var(--jc-color-on-surface); }
.status-chip { flex-shrink: 0; font-size: 22rpx; line-height: 28rpx; font-weight: 600; padding: 6rpx 14rpx; border-radius: 8rpx; }
.status-unpaid { color: var(--jc-color-warning); background: var(--jc-color-surface-container); }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28rpx; padding-top: 20rpx; }
.meta-grid--secondary { padding-top: 14rpx; }
.meta-label { display: block; margin-bottom: 6rpx; font-size: 20rpx; color: var(--jc-color-on-surface-variant); }
.meta-value { display: block; font-size: 24rpx; line-height: 32rpx; color: var(--jc-color-on-surface-variant); }
.amount-row { padding-top: 20rpx; }
.amount-label { display: block; margin-bottom: 4rpx; font-size: 20rpx; color: var(--jc-color-on-surface-variant); }
.charge-amount { display: block; font-size: 34rpx; line-height: 42rpx; font-weight: 700; color: var(--jc-color-error-core); }
</style>
