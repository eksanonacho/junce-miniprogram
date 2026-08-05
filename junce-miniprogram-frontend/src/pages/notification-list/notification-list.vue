<template>
  <view class="notify-page jc-page">
    <view class="notify-head">
      <text class="notify-title">消息中心</text>
      <text v-if="unreadCount > 0" class="read-all-btn" @tap="handleReadAll">全部已读</text>
    </view>

    <JcLoading v-if="loading" type="list" :count="3" />

    <JcEmpty v-else-if="error" text="加载失败" />

    <JcEmpty v-else-if="list.length === 0" text="暂无消息" />

    <view v-else class="notify-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="notify-item"
        :class="{ 'notify-item--unread': !item.isRead }"
        @tap="handleClick(item)"
      >
        <view class="notify-item__left">
          <view class="notify-dot" :class="'notify-dot--' + item.type" />
        </view>
        <view class="notify-item__body">
          <text class="notify-item__title">{{ item.title }}</text>
          <text class="notify-item__text">{{ item.body }}</text>
          <text class="notify-item__time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="notify-item__right">
          <text class="notify-item__arrow">›</text>
        </view>
      </view>
    </view>

    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcLoading from '../../components/junce/JcLoading.vue'
import JcEmpty from '../../components/junce/JcEmpty.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { get, patch } from '../../utils/request.js'

const list = ref([])
const loading = ref(false)
const error = ref(false)
const unreadCount = ref(0)

onShow(() => {
  fetchList()
  fetchUnreadCount()
})

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const res = await get('/notifications')
    list.value = Array.isArray(res) ? res : []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function fetchUnreadCount() {
  try {
    const res = await get('/notifications/unread-count')
    unreadCount.value = res.count || 0
  } catch (e) {
    // silent
  }
}

async function handleClick(item) {
  if (!item.isRead) {
    try {
      await patch(`/notifications/${item.id}/read`)
      item.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) {
      // silent
    }
  }
  if (item.targetType && item.targetId) {
    const pathMap = {
      work_order: `/pages/workorder-detail/workorder-detail?id=${item.targetId}`,
      charge: `/pages/charge-detail/charge-detail?id=${item.targetId}`,
      task: `/pages/task-detail/task-detail?id=${item.targetId}`,
      tenant: `/pages/tenant-detail/tenant-detail?id=${item.targetId}`,
      fission: `/pages/fission-detail/fission-detail?id=${item.targetId}`,
      customer: `/pages/customer-detail/customer-detail?id=${item.targetId}`,
      accounting_log: '/pages/accounting-work-log/accounting-work-log',
    }
    const url = pathMap[item.targetType]
    if (url) {
      uni.navigateTo({ url, fail() {} })
    }
  }
}

async function handleReadAll() {
  try {
    await patch('/notifications/read-all')
    list.value.forEach(item => { item.isRead = true })
    unreadCount.value = 0
  } catch (e) {
    // silent
  }
}

function formatTime(val) {
  if (!val) return ''
  const d = new Date(val)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return val.replace('T', ' ').substring(0, 16)
}
</script>

<style>
.notify-page {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.notify-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.notify-title {
  font-family: var(--jc-font-heading);
  font-size: 36rpx;
  font-weight: 700;
  color: var(--jc-color-on-surface);
}

.read-all-btn {
  font-size: 26rpx;
  color: var(--jc-color-primary);
  font-weight: 600;
}

.notify-list {
  padding: 0;
}

.notify-item {
  display: flex;
  align-items: flex-start;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
  background: var(--jc-color-surface-container-lowest);
}

.notify-item--unread {
  background: var(--jc-color-surface-container-low);
}

.notify-item__left {
  margin-right: 20rpx;
  padding-top: 6rpx;
}

.notify-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--jc-color-outline-variant);
}

.notify-dot--work_order { background: var(--jc-color-tertiary, #085ea2); }
.notify-dot--task { background: var(--jc-color-primary); }
.notify-dot--charge { background: var(--jc-color-status-error); }
.notify-dot--tenant { background: var(--jc-color-status-success); }
.notify-dot--fission { background: var(--jc-color-status-warning); }
.notify-dot--customer_intake { background: var(--jc-color-primary); }
.notify-dot--accounting_log { background: var(--jc-color-tertiary, #085ea2); }
.notify-dot--system { background: var(--jc-color-on-surface-variant); }

.notify-item__body {
  flex: 1;
  min-width: 0;
}

.notify-item__title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--jc-color-on-surface);
  margin-bottom: 6rpx;
}

.notify-item__text {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-on-surface-variant);
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.notify-item__time {
  font-size: 22rpx;
  color: var(--jc-color-outline);
}

.notify-item__right {
  margin-left: 16rpx;
  padding-top: 4rpx;
}

.notify-item__arrow {
  font-size: 32rpx;
  color: var(--jc-color-outline-variant);
}
</style>
