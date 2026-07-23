<template>
  <view class="container">
    <JcH5Back />
    <view v-if="!canView" class="status-msg">无权限</view>
    <view v-else>
      <view class="month-bar">
        <picker mode="date" fields="month" :value="month" :end="todayMonth" @change="onMonthChange">
          <view class="month-picker">{{ month || '选择月份' }}</view>
        </picker>
      </view>

      <view class="card intro-card">
        <view class="card-title">工资报表</view>
        <text class="intro-text">用于录入和查看员工工资、提成、扣款和社保等工资数据。</text>
      </view>

      <!-- 汇总 -->
      <view v-if="summary" class="card summary-card">
        <view class="card-title">工资汇总</view>
        <view class="summary-row"><text class="sl">基本工资</text><text class="sv">{{ formatMoney(summary.totalBaseSalary) }}</text></view>
        <view class="summary-row"><text class="sl">提成</text><text class="sv">{{ formatMoney(summary.totalCommission) }}</text></view>
        <view class="summary-row"><text class="sl">奖金</text><text class="sv">{{ formatMoney(summary.totalBonus) }}</text></view>
        <view class="summary-row"><text class="sl">扣除</text><text class="sv">{{ formatMoney(summary.totalDeduction) }}</text></view>
        <view class="summary-row"><text class="sl">社保</text><text class="sv">{{ formatMoney(summary.totalSocialInsurance) }}</text></view>
        <view class="summary-row"><text class="sl">合计</text><text class="sv profit">{{ formatMoney(summary.totalAmount) }}</text></view>
        <view class="summary-row"><text class="sl">人数</text><text class="sv">{{ summary.recordCount || 0 }}</text></view>
      </view>

      <view v-if="canEdit && !showForm" class="create-bar">
        <button class="btn btn-primary" @tap="openCreate">新增工资记录</button>
      </view>

      <!-- 表单 -->
      <view v-if="showForm" class="card">
        <view class="card-title">{{ editingId ? '编辑工资记录' : '新增工资记录' }}</view>
        <view v-if="!editingId" class="form-item"><text class="label">员工</text>
          <picker :value="userIndex" :range="userOptions" :disabled="saving" @change="onUserChange">
            <view class="picker-view"><text :class="form.userId ? '' : 'placeholder'">{{ userLabel || '请选择' }}</text></view>
          </picker>
        </view>
        <view class="form-item"><text class="label">基本工资</text><input class="input" type="digit" v-model="form.baseSalary" placeholder="0" :disabled="saving" /></view>
        <view class="form-item"><text class="label">提成</text><input class="input" type="digit" v-model="form.commission" placeholder="0" :disabled="saving" /></view>
        <view class="form-item"><text class="label">奖金</text><input class="input" type="digit" v-model="form.bonus" placeholder="0" :disabled="saving" /></view>
        <view class="form-item"><text class="label">扣除</text><input class="input" type="digit" v-model="form.deduction" placeholder="0" :disabled="saving" /></view>
        <view class="form-item"><text class="label">社保</text><input class="input" type="digit" v-model="form.socialInsurance" placeholder="0" :disabled="saving" /></view>
        <view class="form-item"><text class="label">备注</text><input class="input" v-model="form.note" placeholder="选填" :disabled="saving" /></view>
        <view class="edit-actions">
          <button class="btn btn-primary" :disabled="saving" @tap="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
          <button class="btn btn-back" @tap="closeForm">取消</button>
        </view>
      </view>

      <view v-if="loading" class="status-msg">加载中...</view>
      <view v-else-if="error" class="status-msg"><text>加载失败</text><button class="retry-btn" @tap="fetchAll">重试</button></view>
      <view v-else-if="list.length === 0" class="status-msg">暂无工资记录</view>

      <view v-else class="list-area">
        <view v-for="item in list" :key="item.id" class="card">
          <view class="row"><text class="ll">员工</text><text class="vv">{{ item.user?.realName || item.employee?.realName || item.userId || '—' }}</text></view>
          <view class="row"><text class="ll">基本工资</text><text class="vv">{{ formatMoney(item.baseSalary) }}</text></view>
          <view class="row"><text class="ll">提成</text><text class="vv">{{ formatMoney(item.commission) }}</text></view>
          <view class="row"><text class="ll">奖金</text><text class="vv">{{ formatMoney(item.bonus) }}</text></view>
          <view class="row"><text class="ll">扣除</text><text class="vv">{{ formatMoney(item.deduction) }}</text></view>
          <view class="row"><text class="ll">社保</text><text class="vv">{{ formatMoney(item.socialInsurance) }}</text></view>
          <view class="row"><text class="ll">合计</text><text class="vv profit">{{ formatMoney(item.totalAmount) }}</text></view>
          <view v-if="item.note" class="row"><text class="ll">备注</text><text class="vv">{{ item.note }}</text></view>
          <view class="row"><text class="ll">更新时间</text><text class="vv">{{ formatTime(item.updatedAt) }}</text></view>
          <view v-if="canEdit" class="card-action-right"><text class="si-create-link" @tap="openEdit(item)">编辑</text></view>
        </view>
      </view>
    </view>
    <JcMobileTabBar />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import JcMobileTabBar from '../../components/junce/JcMobileTabBar.vue'
import { get, post, patch } from '../../utils/request.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const roleCode = computed(() => userStore.user?.roleCode || '')
const canView = computed(() => roleCode.value === '主管' || roleCode.value === '总务' || roleCode.value === '管理员')
const canEdit = computed(() => roleCode.value === '总务' || roleCode.value === '管理员')

const month = ref(new Date().toISOString().substring(0, 7))
const todayMonth = computed(() => new Date().toISOString().substring(0, 7))
const list = ref([])
const summary = ref(null)
const loading = ref(false)
const error = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = ref({ userId: null, baseSalary: '', commission: '', bonus: '', deduction: '', socialInsurance: '', note: '' })
const userList = ref([])
const userOptions = computed(() => ['请选择', ...userList.value.map(u => u.realName)])
const userIndex = computed(() => { if (!form.value.userId) return 0; const i = userList.value.findIndex(u => u.id === form.value.userId); return i === -1 ? 0 : i + 1 })
const userLabel = computed(() => { const u = userList.value.find(u => u.id === form.value.userId); return u ? u.realName : '' })
function onUserChange(e) { const i = e.detail.value; form.value.userId = i === 0 ? null : userList.value[i - 1].id }

onLoad(async () => { if (canView.value) { try { userList.value = await get('/users') || [] } catch (e) { /* */ } } })
onShow(() => { if (canView.value) fetchAll() })

function onMonthChange(e) { month.value = e.detail.value; fetchAll() }

async function fetchAll() {
  if (!isValidMonth(month.value)) return
  loading.value = true; error.value = false
  try {
    const [l, s] = await Promise.all([
      get('/manual-dashboard/salary-reports', { month: month.value }),
      get('/manual-dashboard/salary-reports/summary', { month: month.value })
    ])
    list.value = Array.isArray(l) ? l : []; summary.value = s
  } catch (e) { error.value = true }
  finally { loading.value = false }
}

function isValidMonth(v) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) }
function normalizeMoney(v) { if (v === '' || v == null) return 0; const n = Number(v); return isNaN(n) || n < 0 ? 0 : Math.round(n * 100) / 100 }
function openCreate() { form.value = { userId: null, baseSalary: '', commission: '', bonus: '', deduction: '', socialInsurance: '', note: '' }; editingId.value = null; showForm.value = true }
function openEdit(item) {
  form.value = { userId: item.userId, baseSalary: item.baseSalary != null ? String(item.baseSalary) : '', commission: item.commission != null ? String(item.commission) : '', bonus: item.bonus != null ? String(item.bonus) : '', deduction: item.deduction != null ? String(item.deduction) : '', socialInsurance: item.socialInsurance != null ? String(item.socialInsurance) : '', note: item.note || '' }
  editingId.value = item.id; showForm.value = true
}
function closeForm() { showForm.value = false }

async function handleSave() {
  const orig = editingId.value ? list.value.find(x => x.id === editingId.value) : null
  const p = {}
  const fields = ['baseSalary', 'commission', 'bonus', 'deduction', 'socialInsurance']
  if (!editingId.value) {
    if (!isValidMonth(month.value)) { uni.showToast({ title: '月份格式不正确', icon: 'none' }); return }
    if (!form.value.userId) { uni.showToast({ title: '请选择员工', icon: 'none' }); return }
    p.month = month.value; p.userId = form.value.userId
    fields.forEach(f => { p[f] = normalizeMoney(form.value[f]) })
  } else {
    fields.forEach(f => { const nv = normalizeMoney(form.value[f]); if (nv !== (orig?.[f] || 0)) p[f] = nv })
  }
  if (form.value.note || (editingId.value && form.value.note !== (orig?.note || ''))) p.note = form.value.note || ''
  if (Object.keys(p).length === 0) { uni.showToast({ title: '未修改任何字段', icon: 'none' }); return }
  saving.value = true
  try {
    if (editingId.value) await patch(`/manual-dashboard/salary-reports/${editingId.value}`, p)
    else await post('/manual-dashboard/salary-reports', p)
    uni.showToast({ title: '保存成功', icon: 'success' }); closeForm(); await fetchAll()
  } catch (e) { /* */ }
  finally { saving.value = false }
}

function formatMoney(v) { if (v == null || v === '') return '¥0.00'; return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function formatTime(v) { if (!v) return '—'; return v.replace('T', ' ').substring(0, 16) }
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.status-msg { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; font-size: 28rpx; color: var(--jc-color-outline); }
.retry-btn { margin-top: 32rpx; padding: 16rpx 48rpx; font-size: 26rpx; color: var(--jc-color-primary); background: var(--jc-color-surface-container-lowest); border: 2rpx solid var(--jc-color-primary); border-radius: 8rpx; }
.month-bar { padding: 16rpx 24rpx; background: var(--jc-color-surface-container-lowest); border-bottom: 2rpx solid var(--jc-color-surface-container); }
.month-picker { font-size: 32rpx; font-weight: bold; color: var(--jc-color-on-surface); }
.card { margin: 24rpx; padding: 28rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: var(--jc-color-on-surface); margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 2rpx solid var(--jc-color-surface-container); }
.intro-card { border-left: 6rpx solid var(--jc-color-primary); }
.intro-text { display: block; font-size: 24rpx; line-height: 36rpx; color: var(--jc-color-on-surface-variant); }
.summary-card { border-left: 6rpx solid var(--jc-color-success); }
.row { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; }
.ll { font-size: 28rpx; color: var(--jc-color-outline); }
.vv { font-size: 28rpx; color: var(--jc-color-on-surface); text-align: right; max-width: 420rpx; }
.profit { color: var(--jc-color-warning); font-weight: bold; }
.summary-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.sl { font-size: 28rpx; color: var(--jc-color-on-surface-variant); }
.sv { font-size: 28rpx; color: var(--jc-color-on-surface); font-weight: bold; }
.create-bar { padding: 16rpx 24rpx; }
.card-action-right { text-align: right; padding-top: 12rpx; }
.si-create-link { font-size: 26rpx; color: var(--jc-color-primary); }
.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.input { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); width: 100%; box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.edit-actions { margin-top: 24rpx; display: flex; gap: 16rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
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
