<template>
  <view class="container">
    <view class="hero-panel">
      <view>
        <text class="page-kicker">TASK FLOW</text>
        <text class="page-title">任务列表</text>
        <text class="page-subtitle">聚合待确认、进行中和完成任务，保持团队交付节奏清晰</text>
      </view>
      <button v-if="canCreate" class="head-action" @tap="goToCreate">＋</button>
    </view>

    <view class="metric-strip">
      <view class="metric-pill">
        <text class="metric-value">{{ taskSummary.pending }}</text>
        <text class="metric-label">待确认</text>
      </view>
      <view class="metric-pill">
        <text class="metric-value">{{ taskSummary.processing }}</text>
        <text class="metric-label">进行中</text>
      </view>
      <view class="metric-pill">
        <text class="metric-value">{{ taskSummary.completed }}</text>
        <text class="metric-label">已完成</text>
      </view>
    </view>

    <view v-if="loading" class="status-msg">加载中...</view>

    <view v-else-if="error" class="status-msg">
      <text>加载失败</text>
      <button class="retry-btn" @tap="fetchList">重试</button>
    </view>

    <view v-else>
      <view class="filter-bar">
        <view v-for="s in statusOptions" :key="s.value" class="filter-tab" :class="{ active: filterStatus === s.value }" @tap="setFilter(s.value)">
          {{ s.label }}
        </view>
      </view>

      <view v-if="list.length === 0" class="status-msg">暂无任务</view>

      <view v-else class="list-area">
        <view v-for="item in list" :key="item.id" class="task-card" @tap="goToDetail(item.id)">
          <view class="card-head">
            <text class="task-title">{{ item.title || '—' }}</text>
            <text class="status-chip" :class="getTaskStatusClass(item.status)">{{ item.status }}</text>
          </view>
          <view class="meta-grid">
            <view class="meta-cell">
              <text class="meta-label">接收人</text>
              <text class="meta-value">{{ item.toUser?.realName || item.toUserId || '未知' }}</text>
            </view>
            <view class="meta-cell">
              <text class="meta-label">发起人</text>
              <text class="meta-value">{{ item.fromUser?.realName || item.fromUserId || '未知' }}</text>
            </view>
          </view>
          <view class="deadline-row">
            <text class="task-customer">{{ getTaskCustomerText(item) }}</text>
            <text class="task-deadline">截止 {{ formatTime(item.deadline) }}</text>
          </view>
        </view>
      </view>
    </view>

    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { get } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

const list = ref([])
const loading = ref(false)
const error = ref(false)
const filterStatus = ref('')

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待确认', value: '待确认' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' }
]

const canCreate = computed(() => {
  const code = userStore.user?.roleCode
  return code === '主管' || code === '管理员'
})

const taskSummary = computed(() => ({
  pending: list.value.filter((item) => item.status === '待确认').length,
  processing: list.value.filter((item) => item.status === '进行中').length,
  completed: list.value.filter((item) => item.status === '已完成').length
}))

onShow(() => { fetchList() })

async function fetchList() {
  if (list.value.length === 0) loading.value = true
  error.value = false
  try {
    const params = filterStatus.value ? { status: filterStatus.value } : {}
    const res = await get('/tasks', params)
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function setFilter(v) {
  filterStatus.value = v
  loading.value = true
  fetchList()
}

function getTaskStatusClass(status) { const map = { '待确认': 'status-pending', '进行中': 'status-processing', '已完成': 'status-completed' }; return map[status] || 'status-default' }
function goToDetail(id) { uni.navigateTo({ url: `/pages/task-detail/task-detail?id=${id}` }) }
function goToCreate() { uni.navigateTo({ url: '/pages/task-create/task-create' }) }
function formatTime(val) { if (!val) return '—'; return val.replace('T', ' ').substring(0, 16) }
function getTaskCustomerText(item) {
  if (item.customer?.companyName) return item.customer.companyName
  return item.customerId ? '客户#' + item.customerId : '未关联客户'
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); padding-bottom: 180rpx; box-sizing: border-box; }
.hero-panel { margin: 28rpx 32rpx 18rpx; padding: 34rpx 32rpx; display: flex; align-items: flex-start; justify-content: space-between; gap: 26rpx; border-radius: 24rpx; border: 1rpx solid var(--jc-color-outline-variant); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); background: linear-gradient(135deg, #d5d3d2 0%, #e6e4e3 100%); box-shadow: var(--jc-shadow-elevated); box-sizing: border-box; }
.page-kicker { display: block; margin-bottom: 8rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 2rpx; color: var(--jc-color-on-surface-variant); }
.page-title { display: block; font-size: 40rpx; line-height: 48rpx; font-weight: 800; color: var(--jc-color-on-surface); }
.page-subtitle { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.head-action { flex-shrink: 0; width: 72rpx; height: 72rpx; line-height: 66rpx; padding: 0; border: 1rpx solid var(--jc-color-primary); border-radius: 18rpx; background: var(--jc-color-primary); color: var(--jc-color-on-primary); font-size: 40rpx; font-weight: 400; box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12); }
.metric-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 0 32rpx 22rpx; }
.metric-pill { min-width: 0; padding: 20rpx 22rpx; border-radius: 18rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); box-sizing: border-box; }
.metric-value { display: block; font-size: 30rpx; line-height: 36rpx; font-weight: 800; color: var(--jc-color-primary); }
.metric-label { display: block; margin-top: 6rpx; font-size: 20rpx; line-height: 26rpx; color: var(--jc-color-on-surface-variant); }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.retry-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: var(--jc-color-primary); background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-primary); border-radius: 8rpx; }

.filter-bar { display: flex; padding: 0 32rpx 20rpx; gap: 14rpx; overflow-x: auto; }
.filter-tab { position: relative; flex-shrink: 0; padding: 12rpx 8rpx 16rpx; min-width: 112rpx; text-align: center; font-size: 24rpx; background: transparent; color: var(--jc-color-on-surface-variant); }
.filter-tab::after { content: ""; position: absolute; left: 22rpx; right: 22rpx; bottom: 0; height: 4rpx; border-radius: 999rpx; background: transparent; transition: background-color 0.2s ease; }
.filter-tab.active { color: var(--jc-color-primary); font-weight: 700; }
.filter-tab.active::after { background: var(--jc-color-primary); }

.list-area { padding: 0 32rpx; }
.task-card { position: relative; overflow: hidden; margin-bottom: 24rpx; padding: 30rpx 32rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 20rpx; box-sizing: border-box; box-shadow: var(--jc-shadow-card); }
.task-card::before { content: ""; position: absolute; left: 0; top: 26rpx; bottom: 26rpx; width: 4rpx; border-radius: 0 4rpx 4rpx 0; background: var(--jc-color-primary); opacity: 0.78; }
.task-card:active { background: var(--jc-color-surface-container-low); transform: scale(0.99); }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; padding-bottom: 20rpx; border-bottom: 1rpx solid var(--jc-color-outline-variant); }
.task-title { flex: 1; font-size: 32rpx; line-height: 42rpx; font-weight: 700; color: var(--jc-color-on-surface); }
.status-chip { flex-shrink: 0; font-size: 22rpx; line-height: 28rpx; font-weight: 600; padding: 6rpx 14rpx; border-radius: 8rpx; }
.status-pending { color: var(--jc-color-warning); background: var(--jc-color-surface-container); }
.status-processing { color: var(--jc-color-primary); background: var(--jc-color-surface-container-low); }
.status-completed { color: var(--jc-color-success); background: var(--jc-color-surface-container); }
.status-default { color: var(--jc-color-on-surface-variant); background: var(--jc-color-surface-container); }

.meta-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28rpx; padding-top: 20rpx; }
.meta-label { display: block; margin-bottom: 6rpx; font-size: 20rpx; color: var(--jc-color-on-surface-variant); }
.meta-value { display: block; font-size: 24rpx; line-height: 32rpx; color: var(--jc-color-on-surface-variant); }
.deadline-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding-top: 20rpx; }
.task-customer { flex: 1; font-size: 24rpx; line-height: 32rpx; color: var(--jc-color-on-surface-variant); }
.task-deadline { flex-shrink: 0; font-size: 24rpx; color: var(--jc-color-warning); }
</style>
