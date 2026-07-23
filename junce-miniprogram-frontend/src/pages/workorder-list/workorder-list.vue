<template>
  <view class="workorder-page jc-page">
    <view class="sticky-head">
      <JcPageHeader
        kicker="WORK ORDERS"
        title="办件列表"
        subtitle="管理并追踪所有服务请求状态"
        :meta="`${visibleList.length} 项`"
      />

      <view class="search-box">
        <text class="search-symbol">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索企业、服务、处理人"
          placeholder-class="search-placeholder"
        />
        <text v-if="keyword" class="search-clear" @tap="keyword = ''">清除</text>
      </view>

      <view class="summary-strip">
        <view class="summary-pill">
          <text class="summary-num">{{ list.length }}</text>
          <text class="summary-label">全部</text>
        </view>
        <view class="summary-pill">
          <text class="summary-num">{{ countByStatus('待办') }}</text>
          <text class="summary-label">待处理</text>
        </view>
        <view class="summary-pill">
          <text class="summary-num">{{ countByStatus('办件中') }}</text>
          <text class="summary-label">处理中</text>
        </view>
        <view class="summary-pill">
          <text class="summary-num">{{ countByStatus('办结') + countByStatus('已打卡') }}</text>
          <text class="summary-label">已完成</text>
        </view>
      </view>

      <JcTabBar v-model="activeTab" :tabs="statusTabs" />
    </view>

    <JcLoading v-if="loading" type="list" :count="3" />

    <JcEmpty v-else-if="error" text="加载失败">
      <template #action>
        <JcButton class="empty-action" variant="outline" size="sm" @tap="fetchList">重试</JcButton>
      </template>
    </JcEmpty>

    <JcEmpty v-else-if="visibleList.length === 0" text="暂无办件" />

    <view v-else class="list-area">
      <JcCard
        v-for="item in visibleList"
        :key="item.id"
        class="wo-card"
        padding="lg"
        interactive
        accent
        @tap="goToDetail(item.id)"
      >
        <view class="card-head">
          <view class="type-line">
            <view class="type-mark">
              <text class="type-mark__text">{{ serviceTypeInitial(item) }}</text>
            </view>
            <text class="wo-type">{{ item.serviceItem?.serviceTemplate?.serviceType || '未分类服务' }}</text>
          </view>
          <JcStatusChip :status="item.status" />
        </view>
        <view class="company-row">
          <text class="wo-customer">{{ item.customer?.companyName || '—' }}</text>
          <text class="wo-subtitle">{{ workOrderTitle(item) }}</text>
        </view>
        <view class="meta-grid">
          <view class="meta-cell">
            <text class="meta-avatar">{{ handlerInitial(item) }}</text>
            <view>
              <text class="meta-label">处理人</text>
              <text class="meta-value">{{ item.handler?.realName || '未指派' }}</text>
            </view>
          </view>
          <view class="meta-cell meta-cell--right">
            <text class="meta-label">创建时间</text>
            <text class="meta-value mono">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
      </JcCard>
    </view>

    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcButton from '../../components/junce/JcButton.vue'
import JcCard from '../../components/junce/JcCard.vue'
import JcEmpty from '../../components/junce/JcEmpty.vue'
import JcLoading from '../../components/junce/JcLoading.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import JcPageHeader from '../../components/junce/JcPageHeader.vue'
import JcStatusChip from '../../components/junce/JcStatusChip.vue'
import JcTabBar from '../../components/junce/JcTabBar.vue'
import { get } from '../../utils/request.js'

const list = ref([])
const loading = ref(false)
const error = ref(false)
const activeTab = ref('all')
const keyword = ref('')
const statusTabs = [
  { label: '全部办件', value: 'all' },
  { label: '待处理', value: '待办' },
  { label: '处理中', value: '办件中' },
  { label: '已完成', value: '办结' },
]

const visibleList = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return list.value.filter((item) => {
    const matchTab =
      activeTab.value === 'all' ||
      item.status === activeTab.value ||
      (activeTab.value === '办结' && item.status === '已打卡')
    if (!matchTab) return false
    if (!normalizedKeyword) return true

    const haystack = [
      item.customer?.companyName,
      item.serviceItem?.serviceTemplate?.serviceType,
      item.handler?.realName,
      item.status,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(normalizedKeyword)
  })
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
    const res = await get('/work-orders')
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function goToDetail(id) {
  uni.navigateTo({ url: `/pages/workorder-detail/workorder-detail?id=${id}` })
}

function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 16)
}

function serviceTypeInitial(item) {
  return (item.serviceItem?.serviceTemplate?.serviceType || '服').substring(0, 1)
}

function handlerInitial(item) {
  return (item.handler?.realName || '未').substring(0, 1)
}

function countByStatus(status) {
  return list.value.filter(item => item.status === status).length
}

function workOrderTitle(item) {
  const serviceType = item.serviceItem?.serviceTemplate?.serviceType || '服务办理'
  return `${serviceType} · ${item.status || '待跟进'}`
}
</script>

<style>
.workorder-page {
  padding-top: 0;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.sticky-head {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: -40rpx -32rpx 32rpx;
  padding: 40rpx 32rpx 0;
  background: var(--jc-color-surface);
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.sticky-head::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -160rpx;
  height: 160rpx;
  background: var(--jc-color-surface);
}

.search-box {
  display: flex;
  align-items: center;
  min-height: 84rpx;
  margin-bottom: 24rpx;
  padding: 0 24rpx;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 16rpx;
}

.search-symbol {
  flex-shrink: 0;
  margin-right: 16rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 30rpx;
  font-weight: 700;
}

.search-input {
  flex: 1;
  height: 82rpx;
  color: var(--jc-color-on-surface);
  font-size: 28rpx;
}

.search-placeholder {
  color: var(--jc-color-outline);
}

.search-clear {
  flex-shrink: 0;
  color: var(--jc-color-primary);
  font-size: 24rpx;
  font-weight: 700;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-bottom: 30rpx;
}

.summary-pill {
  min-width: 0;
  padding: 18rpx 8rpx 16rpx;
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 16rpx;
  text-align: center;
}

.summary-num {
  display: block;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 34rpx;
  line-height: 40rpx;
  font-weight: 800;
}

.summary-label {
  display: block;
  margin-top: 4rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 20rpx;
  line-height: 26rpx;
  font-weight: 700;
}

.list-area {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.wo-card {
  min-height: 260rpx;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.type-line {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16rpx;
}

.type-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 16rpx;
  background: var(--jc-color-surface-container);
  border: 1rpx solid var(--jc-color-outline-variant);
}

.type-mark__text {
  color: var(--jc-color-primary);
  font-size: 24rpx;
  font-weight: 800;
}

.wo-type {
  overflow: hidden;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-row {
  margin-top: 32rpx;
  padding-bottom: 32rpx;
  border-bottom: 1rpx solid var(--jc-color-surface-container-highest);
}

.wo-customer {
  display: block;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 48rpx;
  line-height: 68rpx;
  font-weight: 700;
}

.wo-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 38rpx;
}

.meta-grid {
  display: flex;
  justify-content: space-between;
  gap: 32rpx;
  padding-top: 32rpx;
}

.meta-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16rpx;
}

.meta-cell--right {
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  text-align: right;
}

.meta-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 9999rpx;
  background: var(--jc-color-surface-container);
  color: var(--jc-color-on-surface);
  font-size: 20rpx;
  font-weight: 800;
}

.meta-label {
  display: block;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 30rpx;
}

.meta-value {
  display: block;
  color: var(--jc-color-on-surface-variant);
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 600;
}

.mono {
  font-family: var(--jc-font-mono);
}

.empty-action {
  width: 220rpx;
  margin-top: 40rpx;
}
</style>
