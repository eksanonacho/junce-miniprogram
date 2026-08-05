<template>
  <view class="home-page jc-page">
    <view class="home-hero">
      <view>
        <text class="hero-kicker">JUNCE ASSURANCE</text>
        <text class="hero-title">工作台</text>
        <text class="hero-subtitle">{{ userStore.user?.realName || '未命名用户' }} · {{ userStore.user?.roleName || '未知角色' }}</text>
      </view>
      <view class="account-area">
        <view class="account-trigger" @tap.stop="toggleAccountMenu">
          <view class="account-avatar">
            <text class="account-avatar__text">{{ accountInitial }}</text>
          </view>
          <view class="account-meta">
            <text class="account-name">{{ userStore.user?.realName || '未命名' }}</text>
            <text class="account-role">{{ roleCode || '内部' }}</text>
          </view>
        </view>

        <view v-if="showAccountMenu" class="account-menu">
          <view class="account-menu__head">
            <text class="account-menu__name">{{ userStore.user?.realName || '未命名用户' }}</text>
            <text class="account-menu__role">{{ userStore.user?.roleName || roleCode || '未知角色' }}</text>
          </view>
          <view class="account-menu__action" @tap.stop="switchAccount">
            <text class="account-menu__action-icon">↻</text>
            <text class="account-menu__action-text">切换账号</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showAccountMenu" class="account-mask" @tap="showAccountMenu = false"></view>

    <JcCard class="primary-card" padding="lg" interactive accent @tap="go(workbench.primaryActions[0].path)">
      <view class="primary-top">
        <text class="primary-label">ROLE WORKBENCH</text>
        <text class="primary-arrow">›</text>
      </view>
      <text class="primary-title">{{ workbench.title }}</text>
      <text class="primary-desc">{{ workbench.subtitle }}</text>
    </JcCard>

    <view class="section-head">
      <text class="section-kicker">主任务</text>
    </view>
    <view class="quick-grid">
      <JcCard
        v-for="item in workbench.primaryActions"
        :key="`primary-${item.path}-${item.title}`"
        class="quick-card"
        padding="md"
        interactive
        @tap="go(item.path)"
      >
        <text class="quick-mark">{{ item.mark }}</text>
        <text class="quick-title">{{ item.title }}</text>
        <text class="quick-desc">{{ item.desc }}</text>
      </JcCard>
    </view>

    <view class="section-head">
      <text class="section-kicker">我的待办</text>
    </view>

    <JcCard v-if="todoLoading" class="todo-state-card" padding="md" muted>
      <text class="todo-state-text">待办加载中...</text>
    </JcCard>

    <JcCard v-else-if="todoError" class="todo-state-card" padding="md" muted>
      <text class="todo-state-text">待办加载失败，请稍后重试</text>
    </JcCard>

    <JcCard v-else-if="visibleTodoGroups.length === 0" class="todo-state-card" padding="md" muted>
      <text class="todo-state-text">暂无待处理事项</text>
    </JcCard>

    <view v-else class="todo-groups">
      <JcCard
        v-for="group in visibleTodoGroups"
        :key="group.key"
        class="todo-group-card"
        padding="md"
      >
        <view class="todo-group-head">
          <view class="todo-group-titleline">
            <text class="todo-group-title">{{ group.title }}</text>
            <text class="todo-count">{{ group.count }}</text>
          </view>
          <view class="todo-more" @tap.stop="goTodoTarget(group.targetPath)">
            <text class="todo-more-text">查看更多</text>
            <text class="todo-more-arrow">›</text>
          </view>
        </view>

        <view class="todo-items">
          <view
            v-for="item in group.items"
            :key="`${group.key}-${item.id}`"
            class="todo-item"
            @tap="goTodoTarget(item.targetPath, item.targetId)"
          >
            <view class="todo-item-main">
              <text class="todo-item-title">{{ item.title || '未命名事项' }}</text>
              <text v-if="item.subtitle" class="todo-item-subtitle">{{ item.subtitle }}</text>
            </view>
            <text v-if="item.status" class="todo-status">{{ item.status }}</text>
          </view>
        </view>
      </JcCard>
    </view>

    <view class="section-head">
      <text class="section-kicker">待办处理</text>
    </view>

    <view class="module-list">
      <JcCard
        v-for="item in workbench.todoActions"
        :key="`todo-${item.path}-${item.title}`"
        class="module-card"
        padding="md"
        interactive
        @tap="go(item.path)"
      >
        <view class="module-icon">{{ item.mark }}</view>
        <view class="module-main">
          <text class="module-title">{{ item.title }}</text>
          <text class="module-desc">{{ item.desc }}</text>
        </view>
        <text class="module-arrow">›</text>
      </JcCard>
    </view>

    <view class="section-head section-head--secondary">
      <text class="section-kicker">管理辅助</text>
    </view>

    <view class="module-list">
      <JcCard
        v-for="item in workbench.manageActions"
        :key="`manage-${item.path}-${item.title}`"
        class="module-card"
        padding="md"
        interactive
        @tap="go(item.path)"
      >
        <view class="module-icon">{{ item.mark }}</view>
        <view class="module-main">
          <text class="module-title">{{ item.title }}</text>
          <text class="module-desc">{{ item.desc }}</text>
        </view>
        <text class="module-arrow">›</text>
      </JcCard>
      <JcCard v-if="workbench.note" class="module-card module-card--note" padding="md" muted>
        <view class="module-icon">续</view>
        <view class="module-main">
          <text class="module-title">后续扩展</text>
          <text class="module-desc">{{ workbench.note }}</text>
        </view>
      </JcCard>
    </view>

    <view class="page-footer">
      <text class="pf-text">君册财税内部管理系统</text>
    </view>

    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import JcCard from '../../components/junce/JcCard.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { useUserStore } from '../../stores/user.js'
import { get } from '../../utils/request.js'

const userStore = useUserStore()
const showAccountMenu = ref(false)
const todoLoading = ref(false)
const todoError = ref(false)
const todoGroups = ref([])

const roleCode = computed(() => userStore.user?.roleCode || '')
const accountInitial = computed(() => (userStore.user?.realName || userStore.user?.username || '君').slice(0, 1))
const workbench = computed(() => WORKBENCH_BY_ROLE[roleCode.value] || WORKBENCH_BY_ROLE.default)
const visibleTodoGroups = computed(() => {
  return todoGroups.value.filter((group) => {
    const items = Array.isArray(group.items) ? group.items : []
    return Number(group.count || 0) > 0 || items.length > 0
  })
})

const VALID_TODO_PATHS = new Set([
  '/pages/customer-list/customer-list',
  '/pages/customer-detail/customer-detail',
  '/pages/workorder-list/workorder-list',
  '/pages/workorder-detail/workorder-detail',
  '/pages/charge-unpaid-list/charge-unpaid-list',
  '/pages/charge-detail/charge-detail',
  '/pages/task-list/task-list',
  '/pages/task-detail/task-detail',
  '/pages/tenant-detail/tenant-detail',
  '/pages/fission-list/fission-list',
  '/pages/fission-detail/fission-detail',
  '/pages/manual-business/manual-business',
  '/pages/manual-salary/manual-salary',
])

const WORKBENCH_BY_ROLE = {
  '商务': {
    title: '我的客户',
    subtitle: '围绕自己负责的客户推进建档、服务项、办件进度与收费跟进。',
    primaryActions: [
      action('客', '我的客户', '查看客户档案与服务状态', 'pages/customer-list/customer-list'),
      action('填', '客户填单', '新增客户并建立企业画像', 'pages/customer-form/customer-form'),
    ],
    todoActions: [
      action('件', '客户办件进度', '查看自己客户的办件流转', 'pages/workorder-list/workorder-list'),
      action('收', '客户收费', '查看自己客户收费与合同发票', 'pages/charge-unpaid-list/charge-unpaid-list'),
    ],
    manageActions: [
      action('计', '会计服务进度', '查看自己客户的会计日常登记', 'pages/accounting-work-log/accounting-work-log'),
      action('裂', '业务裂变', '提交或跟进客户推荐线索', 'pages/fission-list/fission-list'),
      action('任', '任务列表', '查看与自己相关的协作任务', 'pages/task-list/task-list'),
    ],
  },
  '业务': {
    title: '我的办件',
    subtitle: '优先处理自己负责的办件，推进材料、进度、办结和归档打卡。',
    primaryActions: [
      action('件', '我的办件', '查看分配给我的办件', 'pages/workorder-list/workorder-list'),
      action('任', '任务列表', '查看与我相关的任务', 'pages/task-list/task-list'),
    ],
    todoActions: [
      action('办', '待处理/进行中', '处理办件状态与材料流转', 'pages/workorder-list/workorder-list'),
      action('档', '打卡归档', '办结后完成归档打卡', 'pages/workorder-list/workorder-list'),
    ],
    manageActions: [
      action('裂', '业务裂变', '跟进业务线索与协办事项', 'pages/fission-list/fission-list'),
    ],
  },
  '会计': {
    title: '会计工作台',
    subtitle: '集中处理主管任务、托管客户、会计办件和日常登记。',
    primaryActions: [
      action('账', '会计任务台账', '确认并完成分配给我的任务', 'pages/task-list/task-list'),
      action('记', '日常登记', '登记开票、咨询、账务、社保、报税等事项', 'pages/accounting-work-log/accounting-work-log'),
      action('托', '托管客户/客户列表', '查看自己关联客户与托管客户', 'pages/customer-list/customer-list'),
    ],
    todoActions: [
      action('确', '待确认/待完成任务', '处理任务确认与完成', 'pages/task-list/task-list'),
      action('件', '办件进度', '查看关联客户办件状态', 'pages/workorder-list/workorder-list'),
    ],
    manageActions: [],
    note: '日常登记由会计手动填写，主管复核；复杂自动核算仍属于后续阶段。',
  },
  '主管': {
    title: '团队管理',
    subtitle: '管理客户档案与托管入档，发布团队任务，检查办件与收费进度，处理裂变审批并查看团队看板。',
    primaryActions: [
      action('客', '客户档案', '查看全部客户档案与托管入档', 'pages/customer-list/customer-list'),
      action('任', '团队任务', '查看团队任务进度', 'pages/task-list/task-list'),
      action('建', '创建任务', '向员工发布协作任务', 'pages/task-create/task-create'),
    ],
    todoActions: [
      action('件', '团队办件', '查看办件进行中与已完结', 'pages/workorder-list/workorder-list'),
      action('裂', '裂变审批', '确认、归档或标记线索', 'pages/fission-list/fission-list'),
      action('收', '收费管理', '查看全部收费、合同与发票', 'pages/charge-unpaid-list/charge-unpaid-list'),
    ],
    manageActions: [
      action('数', '数据看板', '查看客户、服务、任务与收费统计', 'pages/dashboard/dashboard'),
      action('核', '会计台账复核', '按周查看并复核会计日常登记', 'pages/accounting-work-log/accounting-work-log'),
      action('录', '手动看板', '查看经营与工资录入数据', 'pages/manual-business/manual-business'),
    ],
  },
  '总务': {
    title: '收费管理',
    subtitle: '围绕收费确认、合同发票、收款记录、客户增减、经营数据和工资报表完成总务工作。',
    primaryActions: [
      action('收', '收费管理', '查看未收款客户与收费进度', 'pages/charge-unpaid-list/charge-unpaid-list'),
      action('票', '合同 / 发票', '基于收费记录维护合同号与发票号', 'pages/charge-unpaid-list/charge-unpaid-list'),
    ],
    todoActions: [
      action('账', '收款日记账', '通过收费记录查看收款确认情况', 'pages/charge-unpaid-list/charge-unpaid-list'),
      action('客', '客户增减', '查看客户新增、出库与客户层级', 'pages/customer-list/customer-list'),
    ],
    manageActions: [
      action('计', '会计服务台账', '核对客户会计服务登记与复核状态', 'pages/accounting-work-log/accounting-work-log'),
      action('营', '经营数据', '录入或查看月度收入、成本、利润', 'pages/manual-business/manual-business'),
      action('资', '工资报表', '录入或查看工资、提成、扣款和社保', 'pages/manual-salary/manual-salary'),
    ],
  },
  '管理员': {
    title: '全局看板',
    subtitle: '查看全局经营、客户、办件、收费、任务和人员工作结果。',
    primaryActions: [
      action('数', '数据看板', '查看系统自动统计数据', 'pages/dashboard/dashboard'),
      action('客', '客户管理', '查看和管理客户档案', 'pages/customer-list/customer-list'),
    ],
    todoActions: [
      action('件', '办件管理', '查看全局办件流转', 'pages/workorder-list/workorder-list'),
      action('收', '收费管理', '查看收费、合同与发票', 'pages/charge-unpaid-list/charge-unpaid-list'),
      action('任', '任务管理', '查看任务协作进度', 'pages/task-list/task-list'),
    ],
    manageActions: [
      action('建', '创建任务', '发布团队协作任务', 'pages/task-create/task-create'),
      action('填', '客户填单', '新增客户档案', 'pages/customer-form/customer-form'),
      action('营', '经营看板', '查看经营手动录入', 'pages/manual-business/manual-business'),
      action('资', '工资看板', '查看工资手动录入', 'pages/manual-salary/manual-salary'),
      action('计', '会计服务台账', '查看和复核全部会计日常登记', 'pages/accounting-work-log/accounting-work-log'),
    ],
  },
  default: {
    title: '工作台',
    subtitle: '请确认账号角色后查看对应工作入口。',
    primaryActions: [
      action('任', '任务列表', '查看与自己相关的任务', 'pages/task-list/task-list'),
    ],
    todoActions: [],
    manageActions: [],
  },
}

function action(mark, title, desc, path) {
  return { mark, title, desc, path }
}

function go(path) {
  showAccountMenu.value = false
  const url = path.startsWith('/') ? path : '/' + path
  uni.navigateTo({
    url,
    fail() { uni.showToast({ title: '页面跳转失败', icon: 'none' }) }
  })
}

async function fetchTodos() {
  if (!userStore.token) {
    todoGroups.value = []
    todoError.value = false
    return
  }

  todoLoading.value = true
  todoError.value = false
  try {
    const res = await get('/workbench/todos')
    todoGroups.value = normalizeTodoGroups(res?.todoGroups)
  } catch (e) {
    todoGroups.value = []
    todoError.value = true
  } finally {
    todoLoading.value = false
  }
}

function normalizeTodoGroups(groups) {
  if (!Array.isArray(groups)) return []

  return groups.map((group) => ({
    key: String(group?.key || ''),
    title: group?.title || '待办事项',
    count: Number(group?.count || 0),
    targetPath: normalizeTodoPath(group?.targetPath),
    items: Array.isArray(group?.items)
      ? group.items.slice(0, 3).map((item) => ({
          id: item?.id,
          title: item?.title || '',
          subtitle: item?.subtitle || '',
          status: item?.status || '',
          priority: item?.priority || 'normal',
          targetPath: normalizeTodoPath(item?.targetPath),
          targetId: item?.targetId,
        }))
      : [],
  }))
}

function normalizeTodoPath(path) {
  if (!path || typeof path !== 'string') return ''
  return path.startsWith('/') ? path : '/' + path
}

function goTodoTarget(path, targetId) {
  showAccountMenu.value = false
  const safePath = normalizeTodoPath(path)

  if (!VALID_TODO_PATHS.has(stripQuery(safePath))) {
    uni.showToast({ title: '待办入口不可用', icon: 'none' })
    return
  }

  const url = appendTargetId(safePath, targetId)
  uni.navigateTo({
    url,
    fail() { uni.showToast({ title: '页面跳转失败', icon: 'none' }) }
  })
}

function stripQuery(path) {
  return path.split('?')[0]
}

function appendTargetId(path, targetId) {
  if (targetId === undefined || targetId === null || targetId === '') return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}id=${encodeURIComponent(targetId)}`
}

function toggleAccountMenu() {
  showAccountMenu.value = !showAccountMenu.value
}

function switchAccount() {
  showAccountMenu.value = false
  userStore.clearLoginInfo()
  uni.reLaunch({ url: '/pages/login/login' })
}

onShow(() => {
  fetchTodos()
})
</script>

<style>
.home-page {
  padding-top: 0;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.home-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32rpx;
  margin: -40rpx -32rpx 32rpx;
  padding: 48rpx 32rpx 40rpx;
  background: var(--jc-color-surface-container-low);
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.hero-kicker {
  display: block;
  color: var(--jc-color-primary);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 72rpx;
  line-height: 88rpx;
  font-weight: 800;
}

.hero-subtitle {
  display: block;
  margin-top: 6rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 38rpx;
}

.account-area {
  position: relative;
  flex-shrink: 0;
  z-index: 30;
}

.account-trigger {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 76rpx;
  padding: 8rpx 12rpx 8rpx 8rpx;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 9999rpx;
  box-shadow: var(--jc-shadow-card);
}

.account-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 9999rpx;
}

.account-avatar__text {
  color: var(--jc-color-primary);
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 800;
}

.account-meta {
  display: none;
}

.account-name,
.account-role {
  display: block;
}

.account-name {
  max-width: 128rpx;
  overflow: hidden;
  color: var(--jc-color-on-surface);
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-role {
  color: var(--jc-color-on-surface-variant);
  font-size: 20rpx;
  line-height: 26rpx;
  font-weight: 700;
}

.account-menu {
  position: absolute;
  top: 92rpx;
  right: 0;
  width: 300rpx;
  padding: 12rpx;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 20rpx;
  box-shadow: var(--jc-shadow-elevated);
}

.account-menu__head {
  padding: 16rpx 18rpx 18rpx;
  border-bottom: 1rpx solid var(--jc-color-surface-container-highest);
}

.account-menu__name {
  display: block;
  color: var(--jc-color-on-surface);
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.account-menu__role {
  display: block;
  margin-top: 4rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 30rpx;
}

.account-menu__action {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-height: 72rpx;
  margin-top: 8rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
}

.account-menu__action:active {
  background: var(--jc-color-surface-container-low);
}

.account-menu__action-icon {
  color: var(--jc-color-primary);
  font-size: 28rpx;
  font-weight: 800;
}

.account-menu__action-text {
  color: var(--jc-color-primary);
  font-size: 26rpx;
  font-weight: 800;
}

.account-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 20;
  background: transparent;
}

@media (min-width: 420px) {
  .account-meta {
    display: block;
  }
}

.primary-card {
  margin-bottom: 24rpx;
}

.primary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.primary-label {
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.primary-arrow {
  color: var(--jc-color-primary);
  font-size: 48rpx;
  line-height: 48rpx;
}

.primary-title {
  display: block;
  margin-top: 24rpx;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 52rpx;
  line-height: 66rpx;
  font-weight: 800;
}

.primary-desc {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 40rpx;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 40rpx;
}

.quick-card {
  min-height: 160rpx;
}

.quick-mark {
  display: block;
  color: var(--jc-color-primary);
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: 900;
}

.quick-title {
  display: block;
  margin-top: 18rpx;
  color: var(--jc-color-on-surface);
  font-size: 26rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.quick-desc {
  display: block;
  margin-top: 2rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 20rpx;
  line-height: 28rpx;
}

.section-head {
  margin-bottom: 18rpx;
}

.section-head--secondary {
  margin-top: 40rpx;
}

.section-kicker {
  color: var(--jc-color-secondary);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.todo-state-card {
  margin-bottom: 40rpx;
}

.todo-state-text {
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 38rpx;
}

.todo-groups {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-bottom: 40rpx;
}

.todo-group-card {
  display: block;
}

.todo-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.todo-group-titleline {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.todo-group-title {
  color: var(--jc-color-on-surface);
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 800;
}

.todo-count {
  min-width: 44rpx;
  padding: 4rpx 12rpx;
  color: var(--jc-color-primary);
  background: var(--jc-color-primary-container);
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 900;
  text-align: center;
}

.todo-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  min-height: 48rpx;
}

.todo-more-text {
  color: var(--jc-color-primary);
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 800;
}

.todo-more-arrow {
  color: var(--jc-color-primary);
  font-size: 34rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.todo-items {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-top: 18rpx;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  min-height: 76rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid var(--jc-color-surface-container-highest);
}

.todo-item:active {
  opacity: 0.78;
}

.todo-item-main {
  flex: 1;
  min-width: 0;
}

.todo-item-title {
  display: block;
  overflow: hidden;
  color: var(--jc-color-on-surface);
  font-size: 26rpx;
  line-height: 36rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-item-subtitle {
  display: block;
  overflow: hidden;
  margin-top: 2rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 30rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-status {
  flex-shrink: 0;
  max-width: 150rpx;
  padding: 6rpx 12rpx;
  overflow: hidden;
  color: var(--jc-color-on-surface-variant);
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.module-card--note {
  align-items: flex-start;
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  color: var(--jc-color-primary);
  background: var(--jc-color-surface-container-low);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 18rpx;
  font-size: 24rpx;
  font-weight: 900;
}

.module-main {
  flex: 1;
  min-width: 0;
}

.module-title {
  display: block;
  color: var(--jc-color-on-surface);
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 800;
}

.module-desc {
  display: block;
  margin-top: 2rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 24rpx;
  line-height: 34rpx;
}

.module-arrow {
  flex-shrink: 0;
  color: var(--jc-color-primary);
  font-size: 42rpx;
}

.page-footer {
  padding: 40rpx 32rpx 0;
  text-align: center;
}

.pf-text {
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
}

</style>
