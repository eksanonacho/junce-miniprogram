<template>
  <view class="jc-mobile-tabbar" :style="{ gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)` }">
    <view
      v-for="item in visibleItems"
      :key="item.path"
      class="jc-mobile-tabbar__item"
      :class="{ 'jc-mobile-tabbar__item--active': activePath === item.path }"
      @tap="go(item.path)"
    >
      <view class="jc-mobile-tabbar__icon">
        <view class="jc-mobile-tabbar__glyph" :class="item.iconClass">
          <view class="jc-mobile-tabbar__glyph-inner"></view>
        </view>
      </view>
      <view v-if="item.path === '/pages/notification-list/notification-list' && unreadCount > 0" class="jc-mobile-tabbar__badge">
        <text class="jc-mobile-tabbar__badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
      </view>
      <text class="jc-mobile-tabbar__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '../../stores/user.js'
import { get } from '../../utils/request.js'

const userStore = useUserStore()
const unreadCount = ref(0)

const NAV_ITEMS = {
  home: { label: '工作台', iconClass: 'jc-mobile-tabbar__glyph--home', path: '/pages/home/home' },
  customers: { label: '客户', iconClass: 'jc-mobile-tabbar__glyph--customers', path: '/pages/customer-list/customer-list' },
  workorders: { label: '办件', iconClass: 'jc-mobile-tabbar__glyph--workorders', path: '/pages/workorder-list/workorder-list' },
  tasks: { label: '任务', iconClass: 'jc-mobile-tabbar__glyph--tasks', path: '/pages/task-list/task-list' },
  fission: { label: '裂变', iconClass: 'jc-mobile-tabbar__glyph--tasks', path: '/pages/fission-list/fission-list' },
  charges: { label: '收费', iconClass: 'jc-mobile-tabbar__glyph--dashboard', path: '/pages/charge-unpaid-list/charge-unpaid-list' },
  business: { label: '经营', iconClass: 'jc-mobile-tabbar__glyph--dashboard', path: '/pages/manual-business/manual-business' },
  salary: { label: '工资', iconClass: 'jc-mobile-tabbar__glyph--dashboard', path: '/pages/manual-salary/manual-salary' },
  dashboard: { label: '看板', iconClass: 'jc-mobile-tabbar__glyph--dashboard', path: '/pages/dashboard/dashboard' },
  notifications: { label: '消息', iconClass: 'jc-mobile-tabbar__glyph--notifications', path: '/pages/notification-list/notification-list' },
}

const NAV_BY_ROLE = {
  '商务': ['home', 'customers', 'workorders', 'tasks', 'notifications'],
  '业务': ['home', 'workorders', 'tasks', 'fission', 'notifications'],
  '会计': ['home', 'tasks', 'customers', 'workorders', 'notifications'],
  '主管': ['home', 'customers', 'workorders', 'tasks', 'charges', 'dashboard', 'notifications'],
  '总务': ['home', 'charges', 'business', 'salary', 'notifications'],
  '管理员': ['home', 'customers', 'workorders', 'tasks', 'dashboard', 'notifications'],
}

const activePath = ref('')
const visibleItems = computed(() => {
  const role = userStore.user?.roleCode
  const keys = NAV_BY_ROLE[role] || ['home', 'tasks']
  return keys.map((key) => NAV_ITEMS[key]).filter(Boolean)
})

onMounted(() => {
  activePath.value = getActivePath()
  fetchUnreadCount()
})

async function fetchUnreadCount() {
  try {
    const res = await get('/notifications/unread-count')
    unreadCount.value = res.count || 0
  } catch (e) {
    // silent
  }
}

function getActivePath() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return current?.route ? `/${current.route}` : ''
}

function go(path) {
  if (activePath.value === path) return
  uni.reLaunch({ url: path })
}
</script>

<style>
.jc-mobile-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4rpx;
  padding: 12rpx 16rpx calc(12rpx + env(safe-area-inset-bottom));
  background: rgba(201, 198, 197, 0.94);
  border-top: 1rpx solid var(--jc-color-outline-variant);
}

.jc-mobile-tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 92rpx;
  border-radius: 18rpx;
}

.jc-mobile-tabbar__item--active {
  background: var(--jc-color-surface-container-lowest);
  box-shadow: var(--jc-shadow-card);
}

.jc-mobile-tabbar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  margin-bottom: 6rpx;
  border-radius: 9999rpx;
}

.jc-mobile-tabbar__glyph {
  position: relative;
  width: 38rpx;
  height: 38rpx;
  color: var(--jc-color-on-surface-variant);
}

.jc-mobile-tabbar__glyph::before,
.jc-mobile-tabbar__glyph::after,
.jc-mobile-tabbar__glyph-inner {
  content: '';
  position: absolute;
  display: block;
  box-sizing: border-box;
}

.jc-mobile-tabbar__glyph--home::before {
  left: 7rpx;
  top: 4rpx;
  width: 24rpx;
  height: 24rpx;
  border-left: 4rpx solid currentColor;
  border-top: 4rpx solid currentColor;
  border-radius: 4rpx 0 0 0;
  transform: rotate(45deg);
}

.jc-mobile-tabbar__glyph--home::after {
  left: 9rpx;
  bottom: 5rpx;
  width: 20rpx;
  height: 20rpx;
  border: 4rpx solid currentColor;
  border-top: 0;
  border-radius: 0 0 6rpx 6rpx;
}

.jc-mobile-tabbar__glyph--customers::before {
  left: 13rpx;
  top: 4rpx;
  width: 14rpx;
  height: 14rpx;
  border: 4rpx solid currentColor;
  border-radius: 9999rpx;
  background: transparent;
}

.jc-mobile-tabbar__glyph--customers::after {
  left: 7rpx;
  bottom: 5rpx;
  width: 26rpx;
  height: 15rpx;
  border: 4rpx solid currentColor;
  border-radius: 16rpx 16rpx 6rpx 6rpx;
}

.jc-mobile-tabbar__glyph--customers .jc-mobile-tabbar__glyph-inner {
  left: 2rpx;
  top: 11rpx;
  width: 10rpx;
  height: 10rpx;
  border: 3rpx solid currentColor;
  border-radius: 9999rpx;
  opacity: 0.7;
}

.jc-mobile-tabbar__glyph--workorders::before {
  left: 8rpx;
  top: 3rpx;
  width: 23rpx;
  height: 32rpx;
  border: 4rpx solid currentColor;
  border-radius: 6rpx;
}

.jc-mobile-tabbar__glyph--workorders::after {
  right: 6rpx;
  top: 3rpx;
  width: 10rpx;
  height: 10rpx;
  border-left: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  border-radius: 0 0 0 4rpx;
}

.jc-mobile-tabbar__glyph--workorders .jc-mobile-tabbar__glyph-inner {
  left: 14rpx;
  top: 17rpx;
  width: 12rpx;
  height: 4rpx;
  border-radius: 9999rpx;
  background: currentColor;
  box-shadow: 0 9rpx 0 currentColor;
}

.jc-mobile-tabbar__glyph--tasks::before {
  left: 5rpx;
  top: 7rpx;
  width: 10rpx;
  height: 10rpx;
  border: 3rpx solid currentColor;
  border-radius: 4rpx;
  box-shadow: 0 11rpx 0 -1rpx transparent, 0 11rpx 0 0 currentColor;
}

.jc-mobile-tabbar__glyph--tasks::after {
  left: 18rpx;
  top: 10rpx;
  width: 16rpx;
  height: 4rpx;
  border-radius: 9999rpx;
  background: currentColor;
  box-shadow: 0 13rpx 0 currentColor;
}

.jc-mobile-tabbar__glyph--dashboard::before {
  left: 6rpx;
  bottom: 5rpx;
  width: 7rpx;
  height: 17rpx;
  border-radius: 9999rpx;
  background: currentColor;
  box-shadow: 12rpx -8rpx 0 currentColor, 24rpx -15rpx 0 currentColor;
}

.jc-mobile-tabbar__glyph--dashboard::after {
  left: 4rpx;
  right: 2rpx;
  bottom: 3rpx;
  height: 4rpx;
  border-radius: 9999rpx;
  background: currentColor;
}

.jc-mobile-tabbar__label {
  color: var(--jc-color-on-surface-variant);
  font-size: 20rpx;
  line-height: 26rpx;
  font-weight: 700;
}

.jc-mobile-tabbar__item--active .jc-mobile-tabbar__icon {
  background: var(--jc-color-surface-container-low);
}

.jc-mobile-tabbar__item--active .jc-mobile-tabbar__glyph,
.jc-mobile-tabbar__item--active .jc-mobile-tabbar__label {
  color: var(--jc-color-primary);
}

/* Badge */
.jc-mobile-tabbar__badge {
  position: absolute;
  top: 0;
  right: 4rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background: var(--jc-color-error-core, #ba1a1a);
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jc-mobile-tabbar__badge-text {
  color: var(--jc-color-on-primary);
  font-size: 18rpx;
  font-weight: 700;
  line-height: 1;
}

/* Notifications glyph (bell) */
.jc-mobile-tabbar__glyph--notifications::before {
  left: 10rpx;
  top: 3rpx;
  width: 20rpx;
  height: 22rpx;
  border: 4rpx solid currentColor;
  border-radius: 10rpx 10rpx 2rpx 2rpx;
}

.jc-mobile-tabbar__glyph--notifications::after {
  left: 18rpx;
  top: 28rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: currentColor;
}
</style>
