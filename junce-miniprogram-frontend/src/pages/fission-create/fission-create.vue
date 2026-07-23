<template>
  <view class="container"><JcH5Back /><view class="form">
    <view class="form-item"><text class="label">来源客户ID</text><input class="input" type="number" v-model="form.sourceCustomerId" placeholder="选填" :disabled="submitting" /></view>
    <view class="form-item"><text class="label">线索名称</text><input class="input" v-model="form.leadName" placeholder="选填" :disabled="submitting" /></view>
    <view class="form-item"><text class="label">联系人</text><input class="input" v-model="form.contactName" placeholder="选填" :disabled="submitting" /></view>
    <view class="form-item"><text class="label">电话</text><input class="input" v-model="form.phone" placeholder="选填" :disabled="submitting" /></view>
    <view class="form-item"><text class="label">描述</text><textarea class="textarea" v-model="form.description" placeholder="选填" :disabled="submitting" /></view>
    <view class="form-item"><text class="label">协办人</text>
      <picker :value="assigneeIndex" :range="assigneeOptions" :disabled="submitting || userLoading" @change="onAssigneeChange">
        <view class="picker-view"><text :class="form.assigneeId ? '' : 'placeholder'">{{ assigneeLabel || (userLoading ? '加载中...' : '请选择') }}</text></view>
      </picker>
    </view>
    <view class="form-item"><text class="label">报价</text><input class="input" type="digit" v-model="form.price" placeholder="选填" :disabled="submitting" /></view>
    <view class="submit-area"><button class="btn" :class="submitting ? 'btn-disabled' : 'btn-primary'" :disabled="submitting" @tap="handleSubmit">{{ submitting ? '提交中...' : '创建' }}</button></view>
  </view></view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post } from '../../utils/request.js'
const form = ref({ sourceCustomerId: '', leadName: '', contactName: '', phone: '', description: '', assigneeId: null, price: '' })
const submitting = ref(false)
const userList = ref([])
const userLoading = ref(true)
const assigneeOptions = computed(() => ['请选择', ...userList.value.map(u => u.realName)])
const assigneeIndex = computed(() => { if (!form.value.assigneeId) return 0; const i = userList.value.findIndex(u => u.id === form.value.assigneeId); return i === -1 ? 0 : i + 1 })
const assigneeLabel = computed(() => { const u = userList.value.find(u => u.id === form.value.assigneeId); return u ? u.realName : '' })
function onAssigneeChange(e) { const i = e.detail.value; form.value.assigneeId = i === 0 ? null : userList.value[i - 1].id }
onLoad(async () => { try { userList.value = await get('/users') || [] } catch (e) { /* */ } finally { userLoading.value = false } })

function buildPayload() {
  const p = {}
  const f = form.value
  if (f.sourceCustomerId !== '' && !isNaN(Number(f.sourceCustomerId))) p.sourceCustomerId = Number(f.sourceCustomerId)
  if (f.leadName.trim()) p.leadName = f.leadName.trim()
  if (f.contactName.trim()) p.contactName = f.contactName.trim()
  if (f.phone.trim()) p.phone = f.phone.trim()
  if (f.description.trim()) p.description = f.description.trim()
  if (f.assigneeId) p.assigneeId = f.assigneeId
  if (f.price !== '' && !isNaN(Number(f.price))) p.price = Number(f.price)
  return p
}

async function handleSubmit() {
  const payload = buildPayload()
  if (Object.keys(payload).length === 0) { uni.showToast({ title: '请至少填写一个字段', icon: 'none' }); return }
  submitting.value = true
  try { const res = await post('/fission-leads', payload); uni.showToast({ title: '创建成功', icon: 'success' }); uni.redirectTo({ url: `/pages/fission-detail/fission-detail?id=${res.id}` }) }
  catch (e) { /* */ }
  finally { submitting.value = false }
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); }
.form-section-label { margin: 28rpx 28rpx 10rpx 28rpx; font-size: 22rpx; color: var(--jc-color-outline); font-weight: 500; letter-spacing: 1rpx; }
.form { padding: 32rpx; }
.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.input { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); width: 100%; box-sizing: border-box; }
.textarea { width: 100%; min-height: 160rpx; padding: 16rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.submit-area { margin-top: 48rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }

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
