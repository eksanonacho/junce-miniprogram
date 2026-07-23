<template>
  <view class="container">
    <JcH5Back />
    <!-- 列表视图 -->
    <template v-if="currentView === 'list'">
      <!-- loading -->
      <view v-if="loading" class="status-msg">加载中...</view>

      <!-- error -->
      <view v-else-if="error" class="status-msg">
        <text>加载失败</text>
        <button class="retry-btn" @tap="fetchTemplates">重试</button>
      </view>

      <!-- 空列表 -->
      <view v-else-if="templates.length === 0" class="status-msg">暂无可用服务模板</view>

      <!-- 模板列表 -->
      <view v-else class="list-area">
        <view
          v-for="item in templates"
          :key="item.id"
          class="template-card"
          :class="{ selected: selectedIds.has(item.id) }"
        >
          <view class="card-left" @tap="toggleSelect(item.id)">
            <view class="checkbox" :class="{ checked: selectedIds.has(item.id) }">
              <text v-if="selectedIds.has(item.id)">✓</text>
            </view>
          </view>
          <view class="card-body" @tap="goToDetail(item)">
            <view class="top-row">
              <text class="service-type">{{ item.serviceType }}</text>
              <text class="confirm-tag" :class="confirmedIds.has(item.id) ? 'confirmed' : ''">
                {{ confirmedIds.has(item.id) ? '已确认' : '待确认' }}
              </text>
            </view>
            <view class="sub-row">
              <text class="sub-text">周期：{{ item.estimatedDuration }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view v-if="!loading && !error && templates.length > 0" class="bottom-bar">
        <button class="btn btn-primary" :disabled="selectedIds.size === 0 || submitting" @tap="handleCreateItems">
          {{ submitting ? '提交中...' : (selectedIds.size > 0 ? '确定（已选 ' + selectedIds.size + ' 项）' : '请选择服务') }}
        </button>
      </view>
    </template>

    <!-- 详情子视图 -->
    <template v-else-if="currentView === 'detail' && detailTemplate">
      <view class="detail">
        <view class="card">
          <view class="card-title">{{ detailTemplate.serviceType }}</view>

          <!-- 服务说明 -->
          <view v-if="matField('serviceDescription')" class="section">
            <text class="section-title">服务说明</text>
            <text class="content-text">{{ matField('serviceDescription') }}</text>
          </view>

          <!-- 适用客户 -->
          <view v-if="matField('suitableFor')" class="section">
            <text class="section-title">适用客户</text>
            <text class="content-text">{{ matField('suitableFor') }}</text>
          </view>

          <!-- 所需材料 -->
          <view class="section">
            <text class="section-title">所需材料</text>
            <view v-if="matList().length > 0" class="list">
              <view v-for="(m, i) in matList()" :key="i" class="list-item">
                <text class="dot">•</text>
                <text class="list-text">{{ m }}</text>
              </view>
            </view>
            <text v-else class="empty-text">暂无</text>
          </view>

          <!-- 流程步骤 -->
          <view class="section">
            <text class="section-title">办理流程</text>
            <view v-if="stepList().length > 0" class="list">
              <view v-for="(s, i) in stepList()" :key="i" class="list-item">
                <text class="dot">•</text>
                <text class="list-text">{{ s }}</text>
              </view>
            </view>
            <text v-else class="empty-text">暂无</text>
          </view>

          <!-- 预计周期 -->
          <view class="section">
            <text class="section-title">预估周期</text>
            <text class="duration-text">{{ detailTemplate.estimatedDuration || '暂无' }}</text>
          </view>

          <!-- 客户配合事项 -->
          <view v-if="matField('customerActions')" class="section">
            <text class="section-title">客户配合事项</text>
            <text class="content-text">{{ matField('customerActions') }}</text>
          </view>

          <!-- 交付结果 -->
          <view v-if="matField('delivery')" class="section">
            <text class="section-title">交付结果</text>
            <text class="content-text">{{ matField('delivery') }}</text>
          </view>

          <!-- 收费档位 -->
          <view v-if="matField('priceTiers')" class="section">
            <text class="section-title">收费档位</text>
            <view class="price-list">
              <view v-for="(pt, i) in matField('priceTiers')" :key="i" class="price-item">
                <text class="price-tier">{{ pt.tier }}</text>
                <text v-if="pt.amount" class="price-amount">{{ pt.amount }}</text>
                <text class="price-desc">{{ pt.desc }}</text>
              </view>
            </view>
          </view>

          <!-- 风险提示 -->
          <view v-if="matField('riskNotes')" class="section">
            <text class="section-title">注意事项</text>
            <view v-if="Array.isArray(matField('riskNotes'))" class="list">
              <view v-for="(r, i) in matField('riskNotes')" :key="i" class="list-item">
                <text class="dot">•</text>
                <text class="list-text">{{ r }}</text>
              </view>
            </view>
            <text v-else class="content-text">{{ matField('riskNotes') }}</text>
          </view>

          <!-- 内部负责角色 -->
          <view v-if="matField('responsibleRole')" class="section">
            <text class="section-title">负责角色</text>
            <text class="content-text">{{ roleMap[matField('responsibleRole')] || matField('responsibleRole') }}</text>
          </view>
        </view>

        <!-- 已读确认按钮 -->
        <view class="actions">
          <button
            class="btn"
            :class="confirmedIds.has(detailTemplate.id) ? 'btn-confirmed' : 'btn-primary'"
            :disabled="confirmedIds.has(detailTemplate.id) || confirming"
            @tap="handleConfirmRead"
          >
            {{ confirmedIds.has(detailTemplate.id) ? '已确认' : (confirming ? '确认中...' : '已阅读并确认') }}
          </button>
        </view>

        <!-- 返回列表 -->
        <view class="back-area">
          <button class="btn btn-back" @tap="backToList">返回列表</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post } from '../../utils/request.js'

let customerId = ''

// ========== 列表状态 ==========
const templates = ref([])
const loading = ref(false)
const error = ref(false)
const selectedIds = ref(new Set())
const confirmedIds = ref(new Set())

// ========== 详情子视图状态 ==========
const currentView = ref('list')
const detailTemplate = ref(null)

// ========== 操作状态 ==========
const confirming = ref(false)
const submitting = ref(false)

// ========== 详情展示辅助（兼容旧数组格式 / 新对象格式） ==========
const roleMap = { 商务: '商务', 业务: '业务', 会计: '会计', 主管: '主管', 总务: '总务', 管理员: '管理员' }

function matField(field) {
  const m = detailTemplate.value?.requiredMaterials
  if (!m) return null
  if (Array.isArray(m)) return null // 旧格式是简单数组，无子字段
  return m[field] || null
}

function matList() {
  const m = detailTemplate.value?.requiredMaterials
  if (!m) return []
  if (Array.isArray(m)) return m // 旧格式
  return m.materials || []
}

function stepList() {
  const s = detailTemplate.value?.processSteps
  if (!s) return []
  if (Array.isArray(s)) return s // 旧/新格式都是数组
  return []
}

onLoad((options) => {
  if (options.customerId) {
    customerId = options.customerId
    fetchTemplates()
  }
})

// ========== 模板列表 ==========
async function fetchTemplates() {
  loading.value = true
  error.value = false

  try {
    const templatesRes = await get('/service-templates')
    templates.value = Array.isArray(templatesRes) ? templatesRes : []
  } catch (e) {
    error.value = true
  }

  // 确认记录加载失败不影响模板列表展示
  try {
    const confirmationsRes = await get('/service-read-confirmations', { customerId })
    const confirms = Array.isArray(confirmationsRes) ? confirmationsRes : []
    confirmedIds.value = new Set(confirms.map(c => c.templateId))
  } catch (e) {
    // 确认记录加载失败，全部按"待确认"展示
  } finally {
    loading.value = false
  }
}

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function goToDetail(item) {
  detailTemplate.value = item
  currentView.value = 'detail'
}

// ========== 模板详情 ==========
function backToList() {
  currentView.value = 'list'
  detailTemplate.value = null
}

// ========== 已读确认 ==========
async function handleConfirmRead() {
  const templateId = detailTemplate.value.id
  confirming.value = true

  try {
    await post('/service-read-confirmations', { customerId: Number(customerId), templateId })
    // 标记为已确认
    const next = new Set(confirmedIds.value)
    next.add(templateId)
    confirmedIds.value = next
  } catch (e) {
    // request.js 已 toast（含 409）
  } finally {
    confirming.value = false
  }
}

// ========== 创建服务项 ==========
async function handleCreateItems() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请至少选择一项服务', icon: 'none' })
    return
  }

  const templateIds = Array.from(selectedIds.value)
  submitting.value = true

  try {
    const res = await post(`/customers/${customerId}/service-items`, { templateIds })

    const created = res.created || []
    const errors = res.errors || []

    if (created.length > 0 && errors.length === 0) {
      uni.showToast({ title: '添加成功', icon: 'success' })
      uni.navigateBack()
    } else if (created.length > 0 && errors.length > 0) {
      uni.showToast({ title: `已添加 ${created.length} 项，${errors.length} 项失败`, icon: 'none' })
      setTimeout(() => { uni.navigateBack() }, 1500)
    } else if (created.length === 0 && errors.length > 0) {
      errors.forEach(msg => {
        uni.showToast({ title: msg, icon: 'none' })
      })
    }
  } catch (e) {
    // request.js 已 toast
  } finally {
    submitting.value = false
  }
}
</script>

<style>
.container {
  min-height: 100vh;
  background: var(--jc-color-surface);
  display: flex;
  flex-direction: column;
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

/* 列表区域 */
.list-area {
  flex: 1;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.template-card {
  display: flex;
  align-items: center;
  margin: 16rpx 24rpx;
  padding: 24rpx;
  background: var(--jc-color-surface-container-lowest);
  border-radius: 12rpx;
  border: 2rpx solid var(--jc-color-surface-container);
}

.template-card.selected {
  border-color: var(--jc-color-primary);
  background: rgba(201, 168, 76, 0.1);
}

.card-left {
  margin-right: 20rpx;
}

.checkbox {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid var(--jc-color-outline-variant);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: var(--jc-color-on-primary);
}

.checkbox.checked {
  background: var(--jc-color-primary);
  border-color: var(--jc-color-primary);
}

.card-body {
  flex: 1;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.service-type {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--jc-color-on-surface);
}

.confirm-tag {
  font-size: 24rpx;
  color: var(--jc-color-outline);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
}

.confirm-tag.confirmed {
  color: var(--jc-color-success);
  border-color: var(--jc-color-success);
}

.sub-row {
  margin-top: 4rpx;
}

.sub-text {
  font-size: 24rpx;
  color: var(--jc-color-outline);
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--jc-color-surface-container-lowest);
  border-top: 2rpx solid var(--jc-color-surface-container);
}

/* 详情视图 */
.detail {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
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
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.section {
  margin-bottom: 28rpx;
}

.section-title {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-outline);
  margin-bottom: 12rpx;
}

.list-item {
  display: flex;
  align-items: flex-start;
  padding: 6rpx 0;
}

.dot {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  margin-right: 12rpx;
  line-height: 1.6;
}

.list-text {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  flex: 1;
  line-height: 1.6;
}

.empty-text {
  font-size: 28rpx;
  color: var(--jc-color-outline-variant);
}

.duration-text {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
}

/* 按钮 */
.actions {
  margin: 24rpx;
}

.back-area {
  margin: 0 24rpx 24rpx;
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

.btn-confirmed {
  background: var(--jc-color-surface-container);
  color: var(--jc-color-outline);
}

.btn-back {
  background: var(--jc-color-surface-container-lowest);
  color: var(--jc-color-primary);
  border: 2rpx solid var(--jc-color-primary);
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

/* P1 新增：服务模板详情增强 */
.content-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--jc-color-on-surface);
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.price-item {
  padding: 16rpx 20rpx;
  background: var(--jc-color-surface);
  border-radius: 10rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10rpx;
}

.price-tier {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--jc-color-primary);
}

.price-amount {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--jc-color-on-surface);
  background: var(--jc-color-surface-container-lowest);
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.price-desc {
  width: 100%;
  font-size: 24rpx;
  color: var(--jc-color-on-surface-variant);
  line-height: 1.5;
}
</style>
