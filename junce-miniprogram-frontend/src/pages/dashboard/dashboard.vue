<template>
  <view class="dashboard-page jc-page">
    <JcEmpty v-if="!canView" text="无权限访问看板" />

    <view v-else class="content">
      <view class="dashboard-hero">
        <JcPageHeader
          kicker="EXECUTIVE DASHBOARD"
          title="数据看板"
          subtitle="用经营、办件、任务与收费四条线快速判断今日优先级。"
          meta="实时"
        />

        <JcCard class="notice-card" padding="md" muted>
          <view class="notice-dot"></view>
          <text class="notice-text">您有 {{ safeNumber(tasks?.overdue) }} 项逾期任务需要关注。</text>
          <text class="notice-action" @tap="loadAll">刷新全部</text>
        </JcCard>
      </view>

      <view class="mode-tabs">
        <view class="mode-tab" :class="{ 'mode-tab--active': activeMode === 'overview' }" @tap="activeMode = 'overview'">
          <text class="mode-tab__text">总览</text>
        </view>
        <view class="mode-tab" :class="{ 'mode-tab--active': activeMode === 'detail' }" @tap="activeMode = 'detail'">
          <text class="mode-tab__text">明细</text>
        </view>
        <view class="mode-tab" :class="{ 'mode-tab--active': activeMode === 'actions' }" @tap="activeMode = 'actions'">
          <text class="mode-tab__text">操作</text>
        </view>
      </view>

      <view class="section-head">
        <text class="section-kicker">核心数据概览</text>
      </view>

      <JcLoading v-if="overviewLoading" type="card" :count="4" />
      <JcEmpty v-else-if="overviewError" text="总览加载失败">
        <template #action>
          <JcButton class="retry-button" variant="outline" size="sm" @tap="fetchOverview">重试</JcButton>
        </template>
      </JcEmpty>
      <view v-else class="kpi-grid">
        <JcCard class="kpi-card" padding="md" interactive>
          <text class="kpi-label">客户总数</text>
          <text class="kpi-value">{{ safeNumber(overview?.customers?.total) }}</text>
          <text class="kpi-meta">活跃 {{ safeNumber(overview?.customers?.activeCount) }}</text>
        </JcCard>
        <JcCard class="kpi-card" padding="md" interactive>
          <text class="kpi-label">服务项</text>
          <text class="kpi-value">{{ safeNumber(overview?.serviceItems?.total) }}</text>
          <text class="kpi-meta">办件 {{ safeNumber(overview?.workOrders?.total) }}</text>
        </JcCard>
        <JcCard class="kpi-card" padding="md" interactive>
          <text class="kpi-label">任务</text>
          <text class="kpi-value">{{ safeNumber(overview?.tasks?.total) }}</text>
          <text class="kpi-meta danger">逾期 {{ safeNumber(tasks?.overdue) }}</text>
        </JcCard>
        <JcCard class="kpi-card" padding="md" interactive>
          <text class="kpi-label">未收费用</text>
          <text class="kpi-value kpi-value--money">{{ formatMoney(overview?.charges?.unpaidAmount) }}</text>
          <text class="kpi-meta">已收 {{ formatMoney(overview?.charges?.collectedAmount) }}</text>
        </JcCard>
      </view>

      <view v-if="activeMode === 'overview'" class="insight-grid">
        <JcCard class="activity-card" padding="md">
          <view class="panel-title-row">
            <text class="panel-title">经营动态</text>
            <text class="panel-meta">自动汇总</text>
          </view>
          <view class="activity-list">
            <view class="activity-item">
              <view class="activity-mark"></view>
              <view class="activity-body">
                <text class="activity-title">客户池规模 {{ safeNumber(overview?.customers?.total) }}</text>
                <text class="activity-desc">活跃客户 {{ safeNumber(overview?.customers?.activeCount) }}，适合优先检查分层与生命周期。</text>
              </view>
            </view>
            <view class="activity-item">
              <view class="activity-mark"></view>
              <view class="activity-body">
                <text class="activity-title">办件总量 {{ safeNumber(overview?.workOrders?.total) }}</text>
                <text class="activity-desc">服务项 {{ safeNumber(overview?.serviceItems?.total) }}，需要关注待处理和处理中卡片。</text>
              </view>
            </view>
            <view class="activity-item">
              <view class="activity-mark activity-mark--warning"></view>
              <view class="activity-body">
                <text class="activity-title">未收费用 {{ formatMoney(overview?.charges?.unpaidAmount) }}</text>
                <text class="activity-desc">收费管控建议与总务角色同步催收节奏。</text>
              </view>
            </view>
          </view>
        </JcCard>
      </view>

      <view v-if="activeMode === 'detail'" class="panel-grid">
        <JcCard class="panel-card" padding="md">
          <view class="panel-title-row">
            <text class="panel-title">客户看板</text>
            <text v-if="customersError" class="retry-link" @tap="fetchCustomers">重试</text>
          </view>
          <JcLoading v-if="customersLoading" type="compact" :count="1" />
          <view v-else class="stat-list">
            <view class="stat-row"><text class="sl">总数</text><text class="sv">{{ safeNumber(customers?.total) }}</text></view>
            <view class="stat-row"><text class="sl">分类</text><text class="sv">{{ formatObj(customers?.byCategory) }}</text></view>
            <view class="stat-row"><text class="sl">分层</text><text class="sv">{{ formatObj(customers?.byTier) }}</text></view>
            <view class="stat-row"><text class="sl">生命周期</text><text class="sv">{{ formatObj(customers?.byLifecycleStage) }}</text></view>
          </view>
        </JcCard>

        <JcCard class="panel-card" padding="md">
          <view class="panel-title-row">
            <text class="panel-title">服务看板</text>
            <text v-if="servicesError" class="retry-link" @tap="fetchServices">重试</text>
          </view>
          <JcLoading v-if="servicesLoading" type="compact" :count="1" />
          <view v-else class="stat-list">
            <view class="stat-row"><text class="sl">服务项总数</text><text class="sv">{{ safeNumber(services?.serviceItems?.total) }}</text></view>
            <view class="stat-row"><text class="sl">服务项状态</text><text class="sv">{{ formatObj(services?.serviceItems?.byStatus) }}</text></view>
            <view class="stat-row"><text class="sl">办件总数</text><text class="sv">{{ safeNumber(services?.workOrders?.total) }}</text></view>
            <view class="stat-row"><text class="sl">办件状态</text><text class="sv">{{ formatObj(services?.workOrders?.byStatus) }}</text></view>
          </view>
        </JcCard>

        <JcCard class="panel-card" padding="md">
          <view class="panel-title-row">
            <text class="panel-title">任务看板</text>
            <text v-if="tasksError" class="retry-link" @tap="fetchTasks">重试</text>
          </view>
          <JcLoading v-if="tasksLoading" type="compact" :count="1" />
          <view v-else class="stat-list">
            <view class="stat-row"><text class="sl">总数</text><text class="sv">{{ safeNumber(tasks?.total) }}</text></view>
            <view class="stat-row"><text class="sl">状态</text><text class="sv">{{ formatObj(tasks?.byStatus) }}</text></view>
            <view class="stat-row"><text class="sl">逾期</text><text class="sv overdue">{{ safeNumber(tasks?.overdue) }}</text></view>
          </view>
        </JcCard>

        <JcCard class="panel-card" padding="md">
          <view class="panel-title-row">
            <text class="panel-title">收费看板</text>
            <text v-if="chargesError" class="retry-link" @tap="fetchCharges">重试</text>
          </view>
          <JcLoading v-if="chargesLoading" type="compact" :count="1" />
          <view v-else class="stat-list">
            <view class="stat-row"><text class="sl">总数</text><text class="sv">{{ safeNumber(charges?.total) }}</text></view>
            <view class="stat-row"><text class="sl">已收</text><text class="sv">{{ safeNumber(charges?.collectedCount) }}笔</text></view>
            <view class="stat-row"><text class="sl">未收</text><text class="sv">{{ safeNumber(charges?.unpaidCount) }}笔</text></view>
            <view class="stat-row"><text class="sl">已收金额</text><text class="sv">{{ formatMoney(charges?.collectedAmount) }}</text></view>
            <view class="stat-row"><text class="sl">未收金额</text><text class="sv overdue">{{ formatMoney(charges?.unpaidAmount) }}</text></view>
            <view class="stat-row"><text class="sl">催收次数</text><text class="sv">{{ safeNumber(charges?.reminderCount) }}</text></view>
          </view>
        </JcCard>
      </view>

      <view v-if="activeMode === 'actions'" class="quick-grid">
        <JcCard class="quick-action" padding="md" interactive @tap="go('/pages/customer-list/customer-list')">
          <view class="quick-icon">客</view>
          <text class="quick-title">客户列表</text>
          <text class="quick-desc">查看客户档案</text>
        </JcCard>
        <JcCard class="quick-action" padding="md" interactive @tap="go('/pages/workorder-list/workorder-list')">
          <view class="quick-icon">件</view>
          <text class="quick-title">办件流转</text>
          <text class="quick-desc">追踪服务状态</text>
        </JcCard>
        <JcCard class="quick-action" padding="md" interactive @tap="go('/pages/task-list/task-list')">
          <view class="quick-icon">任</view>
          <text class="quick-title">任务列表</text>
          <text class="quick-desc">查看协作进度</text>
        </JcCard>
        <JcCard class="quick-action" padding="md" interactive @tap="go('/pages/charge-unpaid-list/charge-unpaid-list')">
          <view class="quick-icon">收</view>
          <text class="quick-title">收费管控</text>
          <text class="quick-desc">处理未收款项</text>
        </JcCard>
      </view>

      <JcMobileTabBar />
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcButton from '../../components/junce/JcButton.vue'
import JcCard from '../../components/junce/JcCard.vue'
import JcEmpty from '../../components/junce/JcEmpty.vue'
import JcLoading from '../../components/junce/JcLoading.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import JcPageHeader from '../../components/junce/JcPageHeader.vue'
import { get } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const canView = computed(() => { const c = userStore.user?.roleCode; return c === '主管' || c === '管理员' })

const overview = ref(null); const overviewLoading = ref(false); const overviewError = ref(false)
const customers = ref(null); const customersLoading = ref(false); const customersError = ref(false)
const services = ref(null); const servicesLoading = ref(false); const servicesError = ref(false)
const tasks = ref(null); const tasksLoading = ref(false); const tasksError = ref(false)
const charges = ref(null); const chargesLoading = ref(false); const chargesError = ref(false)
const activeMode = ref('overview')
let initialized = false

function loadAll() { fetchOverview(); fetchCustomers(); fetchServices(); fetchTasks(); fetchCharges() }

onShow(() => {
  if (!canView.value) return
  if (initialized) { loadAll() } else { initialized = true; loadAll() }
})

async function fetchOverview() { overviewLoading.value = true; overviewError.value = false; try { overview.value = await get('/dashboard/overview') } catch (e) { overviewError.value = true } finally { overviewLoading.value = false } }
async function fetchCustomers() { customersLoading.value = true; customersError.value = false; try { customers.value = await get('/dashboard/customers') } catch (e) { customersError.value = true } finally { customersLoading.value = false } }
async function fetchServices() { servicesLoading.value = true; servicesError.value = false; try { services.value = await get('/dashboard/services') } catch (e) { servicesError.value = true } finally { servicesLoading.value = false } }
async function fetchTasks() { tasksLoading.value = true; tasksError.value = false; try { tasks.value = await get('/dashboard/tasks') } catch (e) { tasksError.value = true } finally { tasksLoading.value = false } }
async function fetchCharges() { chargesLoading.value = true; chargesError.value = false; try { charges.value = await get('/dashboard/charges') } catch (e) { chargesError.value = true } finally { chargesLoading.value = false } }

function safeNumber(v) { if (v == null || isNaN(Number(v))) return 0; return Number(v) }
function formatMoney(v) { const n = safeNumber(v); return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatObj(obj) {
  if (!obj || typeof obj !== 'object') return '暂无数据'
  const entries = Object.entries(obj)
  if (entries.length === 0) return '暂无数据'
  return entries.map(([k, v]) => `${k}: ${v}`).join('  ')
}

function go(url) {
  uni.navigateTo({ url })
}
</script>

<style>
.dashboard-page {
  padding-top: 0;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.dashboard-hero {
  margin: -40rpx -32rpx 32rpx;
  padding: 40rpx 32rpx 32rpx;
  background: var(--jc-color-surface-container-low);
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.notice-card {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 48rpx;
}

.dashboard-hero .notice-card {
  margin-bottom: 0;
}

.mode-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  margin-bottom: 32rpx;
  padding: 8rpx;
  background: var(--jc-color-surface-container);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 18rpx;
}

.mode-tab {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.mode-tab--active {
  background: var(--jc-color-surface-container-lowest);
  box-shadow: var(--jc-shadow-card);
}

.mode-tab__text {
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 32rpx;
  font-weight: 800;
}

.mode-tab--active .mode-tab__text {
  color: var(--jc-color-primary);
}

.notice-dot {
  flex-shrink: 0;
  width: 18rpx;
  height: 18rpx;
  margin-top: 14rpx;
  border-radius: 9999rpx;
  background: var(--jc-color-primary);
}

.notice-text {
  flex: 1;
  color: var(--jc-color-on-surface);
  font-size: 30rpx;
  line-height: 46rpx;
}

.notice-action,
.retry-link {
  flex-shrink: 0;
  color: var(--jc-color-primary);
  font-size: 26rpx;
  line-height: 32rpx;
  font-weight: 800;
}

.section-head {
  margin-bottom: 24rpx;
}

.section-kicker {
  color: var(--jc-color-secondary);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.kpi-grid,
.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.panel-grid {
  grid-template-columns: 1fr;
  margin-top: 40rpx;
}

.insight-grid,
.quick-grid {
  margin-top: 40rpx;
}

.kpi-card {
  min-height: 210rpx;
}

.kpi-label {
  display: block;
  color: var(--jc-color-secondary);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.kpi-value {
  display: block;
  margin-top: 24rpx;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 56rpx;
  line-height: 64rpx;
  font-weight: 800;
}

.kpi-value--money {
  font-size: 40rpx;
  line-height: 52rpx;
}

.kpi-meta {
  display: block;
  margin-top: 16rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 700;
}

.danger,
.overdue {
  color: var(--jc-color-error);
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.panel-title {
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 34rpx;
  line-height: 44rpx;
  font-weight: 700;
}

.panel-meta {
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  font-weight: 700;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx;
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 16rpx;
}

.activity-mark {
  flex-shrink: 0;
  width: 18rpx;
  height: 18rpx;
  margin-top: 12rpx;
  border-radius: 9999rpx;
  background: var(--jc-color-success);
}

.activity-mark--warning {
  background: var(--jc-color-warning);
}

.activity-body {
  min-width: 0;
}

.activity-title {
  display: block;
  color: var(--jc-color-on-surface);
  font-size: 28rpx;
  line-height: 38rpx;
  font-weight: 800;
}

.activity-desc {
  display: block;
  margin-top: 4rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 24rpx;
  line-height: 36rpx;
}

.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.quick-action {
  min-height: 220rpx;
}

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 28rpx;
  color: var(--jc-color-primary);
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 9999rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.quick-title {
  display: block;
  color: var(--jc-color-on-surface);
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 800;
}

.quick-desc {
  display: block;
  margin-top: 6rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 24rpx;
  line-height: 34rpx;
}

.stat-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--jc-color-surface-container-highest);
}

.stat-row:last-child {
  border-bottom: none;
}

.sl {
  flex-shrink: 0;
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 38rpx;
}

.sv {
  max-width: 430rpx;
  color: var(--jc-color-on-surface);
  font-size: 26rpx;
  line-height: 38rpx;
  font-weight: 700;
  text-align: right;
}

.retry-button {
  width: 220rpx;
  margin-top: 40rpx;
}
</style>
