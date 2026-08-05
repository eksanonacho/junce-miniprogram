<template>
  <view class="container">
    <JcH5Back />
    <!-- loading -->
    <view v-if="pageMode === 'loading'" class="status-msg">加载中...</view>

    <!-- error -->
    <view v-else-if="pageMode === 'error'" class="status-msg">
      <text>任务不存在</text>
      <button class="retry-btn" @tap="goBack">返回</button>
    </view>

    <!-- view / edit -->
    <view v-else-if="task" class="detail">
      <view class="status-header">
        <text class="sh-label">{{ task.title || '—' }}</text>
        <text class="si-status" :class="getTaskStatusClass(task.status)">{{ task.status }}</text>
        <text class="sh-amount">{{ task.toUser?.realName || '未指派' }}</text>
      </view>
      <view class="card">
        <view class="card-title">任务信息</view>
        <template v-if="pageMode === 'edit'">
          <view class="form-item"><text class="label">标题</text><input class="input" v-model="form.title" :disabled="saving" /></view>
          <view class="form-item"><text class="label">内容</text><textarea class="textarea" v-model="form.content" :disabled="saving" /></view>
          <view class="form-item"><text class="label">接收人</text>
            <picker :value="toUserIndex" :range="userOptions" :disabled="saving" @change="onToUserChange">
              <view class="picker-view"><text :class="form.toUserId ? '' : 'placeholder'">{{ toUserLabel || '请选择' }}</text></view>
            </picker>
          </view>
          <view class="form-item"><text class="label">客户ID</text><input class="input" type="number" v-model="form.customerId" placeholder="选填" :disabled="saving" /></view>
          <view class="form-item"><text class="label">截止日期</text>
            <picker mode="date" :value="form.deadline" :disabled="saving" @change="onDeadlineChange">
              <view class="picker-view"><text :class="form.deadline ? '' : 'placeholder'">{{ form.deadline || '请选择' }}</text></view>
            </picker>
          </view>
          <view class="edit-actions">
            <button class="btn btn-primary" :disabled="saving" @tap="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
            <button class="btn btn-back" @tap="cancelEdit">取消</button>
          </view>
        </template>
        <template v-else>
          <view class="row"><text class="ll">标题</text><text class="vv">{{ task.title || '—' }}</text></view>
          <view class="row"><text class="ll">状态</text><text class="si-status" :class="getTaskStatusClass(task.status)">{{ task.status }}</text></view>
          <view class="row"><text class="ll">接收人</text><text class="vv">{{ task.toUser?.realName || task.toUserId || '未知' }}</text></view>
          <view class="row"><text class="ll">来自</text><text class="vv">{{ task.fromUser?.realName || task.fromUserId || '未知' }}</text></view>
          <view class="row"><text class="ll">客户</text><text class="vv">{{ task.customer?.companyName || (task.customerId ? '客户#' + task.customerId : '未关联') }}</text></view>
          <view class="row"><text class="ll">截止日期</text><text class="vv">{{ formatTime(task.deadline) }}</text></view>
        </template>
      </view>

      <!-- 内容 -->
      <view class="card" v-if="pageMode !== 'edit'">
        <view class="card-title">任务内容</view>
        <text class="content-text">{{ task.content || '暂无内容' }}</text>
      </view>

      <!-- 时间信息 -->
      <view class="card" v-if="pageMode !== 'edit'">
        <view class="card-title">时间信息</view>
        <view class="row"><text class="ll">确认时间</text><text class="vv">{{ formatTime(task.confirmedAt) }}</text></view>
        <view class="row"><text class="ll">确认人</text><text class="vv">{{ task.confirmer?.realName || task.confirmedBy?.realName || task.confirmedById || '—' }}</text></view>
        <view class="row"><text class="ll">完成时间</text><text class="vv">{{ formatTime(task.completedAt) }}</text></view>
        <view class="row"><text class="ll">完成人</text><text class="vv">{{ task.completer?.realName || task.completedBy?.realName || task.completedById || '—' }}</text></view>
        <view class="row"><text class="ll">创建时间</text><text class="vv">{{ formatTime(task.createdAt) }}</text></view>
        <view class="row"><text class="ll">更新时间</text><text class="vv">{{ formatTime(task.updatedAt) }}</text></view>
      </view>

      <!-- 操作按钮 (view) -->
      <view v-if="pageMode === 'view'" class="actions">
        <button v-if="canEdit" class="btn btn-primary" @tap="enterEdit">编辑任务</button>
        <button v-if="canConfirm" class="btn btn-primary" :disabled="saving" @tap="handleConfirm">{{ saving ? '处理中...' : '确认任务' }}</button>
        <button v-if="canComplete" class="btn btn-checkin" :disabled="saving" @tap="handleComplete">{{ saving ? '处理中...' : '完成任务' }}</button>
      </view>

      <!-- 返回 -->
      <view class="back-area"><button class="btn btn-back" @tap="goBack">返回</button></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post, patch } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
let currentId = ''
let skipNextShow = true
const pageMode = ref('loading')
const task = ref(null)
const saving = ref(false)

// edit form
const form = ref({ title: '', content: '', toUserId: null, customerId: '', deadline: '' })
const userList = ref([])
const userOptions = computed(() => ['请选择', ...userList.value.map(u => u.realName)])
const toUserIndex = computed(() => {
  if (!form.value.toUserId) return 0
  const i = userList.value.findIndex(u => u.id === form.value.toUserId)
  return i === -1 ? 0 : i + 1
})
const toUserLabel = computed(() => { const u = userList.value.find(u => u.id === form.value.toUserId); return u ? u.realName : '' })
function onToUserChange(e) { const i = e.detail.value; form.value.toUserId = i === 0 ? null : userList.value[i - 1].id }
function onDeadlineChange(e) { form.value.deadline = e.detail.value }

// ========== 权限 ==========
const roleCode = computed(() => userStore.user?.roleCode || '')
const currentUserId = computed(() => userStore.user?.id)
const canEdit = computed(() => roleCode.value === '主管' || roleCode.value === '管理员')
const canConfirm = computed(() => task.value?.status === '待确认' && (currentUserId.value === task.value?.toUserId || roleCode.value === '管理员'))
const canComplete = computed(() => task.value?.status === '进行中' && (currentUserId.value === task.value?.toUserId || roleCode.value === '管理员'))

// ========== 数据加载 ==========
onLoad((options) => {
  currentId = options.id
  if (currentId) fetchDetail()
  else pageMode.value = 'error'
})

onShow(() => {
  if (skipNextShow) { skipNextShow = false; return }
  if (currentId && pageMode.value !== 'edit') fetchDetail()
})

async function fetchDetail() {
  pageMode.value = 'loading'
  try { task.value = await get(`/tasks/${currentId}`); pageMode.value = 'view' }
  catch (e) { pageMode.value = 'error' }
}

// ========== 编辑 ==========
async function enterEdit() {
  try { userList.value = await get('/users') || [] } catch (e) { /* silent */ }
  form.value = {
    title: task.value.title || '',
    content: task.value.content || '',
    toUserId: task.value.toUserId || null,
    customerId: task.value.customerId != null ? String(task.value.customerId) : '',
    deadline: task.value.deadline || ''
  }
  pageMode.value = 'edit'
}
function cancelEdit() { pageMode.value = 'view' }

async function handleSave() {
  if (!form.value.title.trim()) { uni.showToast({ title: '请输入标题', icon: 'none' }); return }
  const payload = {}
  if (form.value.title.trim() !== (task.value.title || '')) payload.title = form.value.title.trim()
  if ((form.value.content || '') !== (task.value.content || '')) payload.content = form.value.content || ''
  if (form.value.toUserId !== task.value.toUserId) payload.toUserId = form.value.toUserId
  if (form.value.deadline !== (task.value.deadline || '')) payload.deadline = formatDeadlineForSubmit(form.value.deadline)
  const newCustId = form.value.customerId !== '' ? Number(form.value.customerId) : null
  if (newCustId !== null && newCustId !== (task.value.customerId || null)) payload.customerId = newCustId
  if (Object.keys(payload).length === 0) { uni.showToast({ title: '未修改任何字段', icon: 'none' }); return }
  saving.value = true
  try { await patch(`/tasks/${currentId}`, payload); uni.showToast({ title: '保存成功', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

// ========== 操作 ==========
async function handleConfirm() {
  saving.value = true
  try { await post(`/tasks/${currentId}/confirm`); uni.showToast({ title: '已确认', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

async function handleComplete() {
  saving.value = true
  try { await post(`/tasks/${currentId}/complete`); uni.showToast({ title: '已完成', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

function formatTime(val) { if (!val) return '—'; return val.replace('T', ' ').substring(0, 16) }
function formatDeadlineForSubmit(val) { if (!val) return val; if (val.includes('T')) return val; return new Date(val).toISOString() }
function getTaskStatusClass(status) { const map = { '待确认': 'status-pending', '进行中': 'status-processing', '已完成': 'status-completed' }; return map[status] || 'status-default' }
function goBack() { uni.navigateBack() }
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.retry-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: var(--jc-color-primary); background: var(--jc-color-surface-container-lowest); border: 2rpx solid var(--jc-color-primary); border-radius: 8rpx; }
.detail { padding-bottom: 48rpx; }
.status-header { margin: 24rpx; padding: 22rpx 24rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; border-left: 4rpx solid var(--jc-color-primary); display: flex; align-items: center; gap: 12rpx; }
.sh-label { font-size: 24rpx; color: var(--jc-color-on-surface-variant); }
.sh-amount { font-size: 24rpx; color: var(--jc-color-on-surface-variant); margin-left: auto; }
.card { margin: 24rpx; padding: 28rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: var(--jc-color-on-surface); margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 2rpx solid var(--jc-color-surface-container); }
.row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; }
.ll { font-size: 28rpx; color: var(--jc-color-outline); }
.vv { font-size: 28rpx; color: var(--jc-color-on-surface); text-align: right; max-width: 420rpx; word-break: break-all; }
.si-status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 6rpx; }
.status-pending { color: var(--jc-color-warning); background: rgba(245, 158, 11, 0.1); }
.status-processing { color: var(--jc-color-primary); background: rgba(247, 189, 72, 0.1); }
.status-completed { color: var(--jc-color-success); background: rgba(34, 197, 94, 0.08); }
.content-text { font-size: 28rpx; color: var(--jc-color-on-surface); line-height: 1.6; white-space: pre-wrap; }

.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.input { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); width: 100%; box-sizing: border-box; }
.textarea { width: 100%; min-height: 160rpx; padding: 16rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.edit-actions { margin-top: 24rpx; display: flex; gap: 16rpx; }
.actions { margin: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.back-area { margin: 0 24rpx 24rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-checkin { background: var(--jc-color-success); color: var(--jc-color-on-primary); }
.btn-back { background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); border: 2rpx solid var(--jc-color-primary); }

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
