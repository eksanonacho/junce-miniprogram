<template>
  <view class="container">
    <JcH5Back />
    <view v-if="pageMode === 'loading'" class="status-msg">加载中...</view>
    <view v-else-if="pageMode === 'error'" class="status-msg">
      <text>线索不存在</text><button class="retry-btn" @tap="goBack">返回</button>
    </view>
    <view v-else-if="lead" class="detail">
      <view class="status-header">
        <text class="sh-label">{{ lead.leadName || '—' }}</text>
        <text class="si-status" :class="getFissionStatusClass(lead.status)">{{ lead.status }}</text>
        <text class="sh-amount">{{ lead.price != null ? '¥' + Number(lead.price).toLocaleString() : '—' }}</text>
      </view>
      <view class="card">
        <view class="card-title">裂变线索</view>
        <template v-if="pageMode === 'edit'">
          <view class="form-item"><text class="label">来源客户ID</text><input class="input" type="number" v-model="form.sourceCustomerId" placeholder="选填" :disabled="saving" /></view>
          <view class="form-item"><text class="label">线索名称</text><input class="input" v-model="form.leadName" :disabled="saving" /></view>
          <view class="form-item"><text class="label">联系人</text><input class="input" v-model="form.contactName" :disabled="saving" /></view>
          <view class="form-item"><text class="label">电话</text><input class="input" v-model="form.phone" :disabled="saving" /></view>
          <view class="form-item"><text class="label">描述</text><textarea class="textarea" v-model="form.description" :disabled="saving" /></view>
          <view class="form-item"><text class="label">协办人</text>
            <picker :value="assigneeIndex" :range="assigneeOptions" :disabled="saving" @change="onAssigneeChange">
              <view class="picker-view"><text :class="form.assigneeId ? '' : 'placeholder'">{{ assigneeLabel || '请选择' }}</text></view>
            </picker>
          </view>
          <view class="form-item"><text class="label">报价</text><input class="input" type="digit" v-model="form.price" :disabled="saving" /></view>
          <view class="edit-actions">
            <button class="btn btn-primary" :disabled="saving" @tap="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
            <button class="btn btn-back" @tap="cancelEdit">取消</button>
          </view>
        </template>
        <template v-else>
          <view class="row"><text class="ll">线索名称</text><text class="vv">{{ lead.leadName || '—' }}</text></view>
          <view class="row"><text class="ll">状态</text><text class="si-status" :class="getFissionStatusClass(lead.status)">{{ lead.status }}</text></view>
          <view class="row"><text class="ll">联系人</text><text class="vv">{{ lead.contactName || '—' }}</text></view>
          <view class="row"><text class="ll">电话</text><text class="vv">{{ lead.phone || '—' }}</text></view>
          <view class="row"><text class="ll">报价</text><text class="vv">{{ lead.price != null ? '¥' + Number(lead.price).toLocaleString() : '—' }}</text></view>
          <view class="row"><text class="ll">来源客户</text><text class="vv">{{ lead.sourceCustomer?.companyName || lead.sourceCustomerId || '无来源客户' }}</text></view>
          <view class="row"><text class="ll">协办人</text><text class="vv">{{ lead.assignee?.realName || lead.assigneeId || '未指派' }}</text></view>
          <view class="row"><text class="ll">发起人</text><text class="vv">{{ lead.initiatedBy?.realName || lead.initiator?.realName || lead.initiatedById || '未知' }}</text></view>
        </template>
      </view>
      <!-- 描述 -->
      <view class="card" v-if="pageMode !== 'edit' && lead.description">
        <view class="card-title">描述</view><text class="content-text">{{ lead.description }}</text>
      </view>
      <!-- 时间信息 -->
      <view class="card" v-if="pageMode !== 'edit'">
        <view class="card-title">时间信息</view>
        <view class="row"><text class="ll">确认时间</text><text class="vv">{{ formatTime(lead.confirmedAt) }}</text></view>
        <view class="row"><text class="ll">确认人</text><text class="vv">{{ lead.confirmer?.realName || lead.confirmedBy?.realName || lead.confirmedById || '—' }}</text></view>
        <view class="row"><text class="ll">归档时间</text><text class="vv">{{ formatTime(lead.archivedAt) }}</text></view>
        <view class="row"><text class="ll">归档人</text><text class="vv">{{ lead.archiver?.realName || lead.archivedBy?.realName || lead.archivedById || '—' }}</text></view>
        <view class="row"><text class="ll">创建时间</text><text class="vv">{{ formatTime(lead.createdAt) }}</text></view>
        <view class="row"><text class="ll">更新时间</text><text class="vv">{{ formatTime(lead.updatedAt) }}</text></view>
      </view>
      <!-- 归档材料 -->
      <view v-if="pageMode !== 'edit' && (lead.archiveFiles || []).length > 0" class="card">
        <view class="card-title">归档材料</view>
        <view v-for="(f,i) in (lead.archiveFiles||[])" :key="i" class="file-item"><text class="file-name">{{ f.name }}</text><text class="file-size">{{ formatSize(f.size) }}</text></view>
      </view>

      <!-- 归档上传区 -->
      <view v-if="canManage && lead.status === '已确认' && pageMode === 'view'" class="card">
        <view class="card-title">上传归档材料</view>
        <view v-if="archiveFiles.length > 0" class="file-list">
          <view v-for="(f,i) in archiveFiles" :key="i" class="file-item"><text class="file-name">{{ f.name }}</text><text class="file-size">{{ formatSize(f.size) }}</text><text class="file-del" @tap="removeFile(i)">×</text></view>
        </view>
        <view v-else class="card-empty">请添加归档文件</view>
        <view class="upload-actions"><button class="btn btn-upload" @tap="handleChooseFile">添加文件</button></view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="pageMode === 'view'" class="actions">
        <button v-if="canManage" class="btn btn-primary" @tap="enterEdit">编辑线索</button>
        <button v-if="canManage && lead.status === '待确认'" class="btn btn-primary" :disabled="saving" @tap="handleConfirm">{{ saving ? '处理中...' : '确认线索' }}</button>
        <button v-if="canManage && lead.status !== '无效'" class="btn btn-primary" :disabled="saving" @tap="handleArchive">{{ saving ? '归档中...' : '归档线索' }}</button>
        <button v-if="canMarkInvalid" class="btn" style="background:var(--jc-color-error);color:var(--jc-color-on-primary);" :disabled="saving" @tap="handleMarkInvalid">{{ saving ? '处理中...' : '标记无效' }}</button>
      </view>

      <view class="back-area"><button class="btn btn-back" @tap="goBack">返回</button></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, post, patch } from '../../utils/request.js'
import { BASE_URL } from '../../config/index.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
let currentId = ''
let skipNextShow = true
const pageMode = ref('loading')
const lead = ref(null)
const saving = ref(false)
const archiveFiles = ref([])

// edit
const form = ref({ sourceCustomerId: '', leadName: '', contactName: '', phone: '', description: '', assigneeId: null, price: '' })
const userList = ref([])
const assigneeOptions = computed(() => ['请选择', ...userList.value.map(u => u.realName)])
const assigneeIndex = computed(() => { if (!form.value.assigneeId) return 0; const i = userList.value.findIndex(u => u.id === form.value.assigneeId); return i === -1 ? 0 : i + 1 })
const assigneeLabel = computed(() => { const u = userList.value.find(u => u.id === form.value.assigneeId); return u ? u.realName : '' })
function onAssigneeChange(e) { const i = e.detail.value; form.value.assigneeId = i === 0 ? null : userList.value[i - 1].id }

// 权限
const roleCode = computed(() => userStore.user?.roleCode || '')
const canManage = computed(() => roleCode.value === '主管' || roleCode.value === '管理员')
const canArchive = computed(() => canManage.value && lead.value?.status === '已确认')
const canMarkInvalid = computed(() => canManage.value && (lead.value?.status === '待确认' || lead.value?.status === '已确认'))

// 数据
onLoad((options) => { currentId = options.id; if (currentId) fetchDetail(); else pageMode.value = 'error' })
onShow(() => { if (skipNextShow) { skipNextShow = false; return } if (currentId && pageMode.value !== 'edit') fetchDetail() })
async function fetchDetail() { pageMode.value = 'loading'; try { lead.value = await get(`/fission-leads/${currentId}`); pageMode.value = 'view' } catch (e) { pageMode.value = 'error' } }

// 编辑
async function enterEdit() {
  try { userList.value = await get('/users') || [] } catch (e) { /* */ }
  const l = lead.value
  form.value = { sourceCustomerId: l.sourceCustomerId != null ? String(l.sourceCustomerId) : '', leadName: l.leadName || '', contactName: l.contactName || '', phone: l.phone || '', description: l.description || '', assigneeId: l.assigneeId || null, price: l.price != null ? String(l.price) : '' }
  pageMode.value = 'edit'
}
function cancelEdit() { pageMode.value = 'view' }

function formatVal(v) { return v !== '' && !isNaN(Number(v)) ? Number(v) : null }

async function handleSave() {
  const f = form.value; const l = lead.value
  const p = {}
  const newSC = formatVal(f.sourceCustomerId); if (newSC !== null && newSC !== (l.sourceCustomerId || null)) p.sourceCustomerId = newSC
  if ((f.leadName||'') !== (l.leadName||'')) p.leadName = f.leadName || ''
  if ((f.contactName||'') !== (l.contactName||'')) p.contactName = f.contactName || ''
  if ((f.phone||'') !== (l.phone||'')) p.phone = f.phone || ''
  if ((f.description||'') !== (l.description||'')) p.description = f.description || ''
  const newA = f.assigneeId || null; if (newA !== null && newA !== (l.assigneeId || null)) p.assigneeId = newA
  const newP = formatVal(f.price); if (newP !== null && newP !== (l.price || null)) p.price = newP
  if (Object.keys(p).length === 0) { uni.showToast({ title: '未修改任何字段', icon: 'none' }); return }
  saving.value = true
  try { await patch(`/fission-leads/${currentId}`, p); uni.showToast({ title: '保存成功', icon: 'success' }); await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

// 操作
async function handleConfirm() { saving.value = true; try { await post(`/fission-leads/${currentId}/confirm`); uni.showToast({ title: '已确认', icon: 'success' }); await fetchDetail() } catch (e) { /* */ } finally { saving.value = false } }
async function handleMarkInvalid() { saving.value = true; try { await post(`/fission-leads/${currentId}/mark-invalid`); uni.showToast({ title: '已标记无效', icon: 'success' }); await fetchDetail() } catch (e) { /* */ } finally { saving.value = false } }

// 文件上传
function handleChooseFile() {
  // #ifdef H5
  uni.chooseFile({ count: 1, success: (res) => { uploadFile(res.tempFiles[0]) } })
  // #endif
  // #ifdef MP-WEIXIN
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择', '从聊天记录选择文件'],
    success: (ar) => {
      if (ar.tapIndex === 0) wx.chooseMedia({ count:1, mediaType:['image'], sourceType:['camera'], success: (r) => { uploadFile(r.tempFiles[0]) } })
      else if (ar.tapIndex === 1) wx.chooseMedia({ count:1, mediaType:['image'], sourceType:['album'], success: (r) => { uploadFile(r.tempFiles[0]) } })
      else wx.chooseMessageFile({ count:1, type:'all', success: (r) => { uploadFile(r.tempFiles[0]) } })
    }
  })
  // #endif
}
function uploadFile(tempFile) {
  const token = userStore.token
  uni.showLoading({ title: '上传中...' })
  uni.uploadFile({
    url: BASE_URL + '/files/upload', filePath: tempFile.path || tempFile.tempFilePath, name: 'file',
    header: { 'Authorization': `Bearer ${token}` },
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode < 200 || res.statusCode >= 300) { uni.showToast({ title: res.statusCode === 401 ? '登录已过期' : res.statusCode === 403 ? '无权限' : '文件上传失败', icon: 'none' }); return }
      try { archiveFiles.value.push(JSON.parse(res.data)) } catch (e) { uni.showToast({ title: '文件解析失败', icon: 'none' }) }
    },
    fail: () => { uni.hideLoading(); uni.showToast({ title: '文件上传失败', icon: 'none' }) }
  })
}
function removeFile(i) { archiveFiles.value.splice(i, 1) }

async function handleArchive() {
  if (lead.value?.status === '待确认') { uni.showToast({ title: '请先确认线索后再归档', icon: 'none' }); return }
  if (lead.value?.status === '已归档') { uni.showToast({ title: '该线索已归档', icon: 'none' }); return }
  if (lead.value?.status !== '已确认') { uni.showToast({ title: '当前状态不可归档', icon: 'none' }); return }
  if (archiveFiles.value.length === 0) { uni.showToast({ title: '请先上传归档凭证', icon: 'none' }); return }
  saving.value = true
  try { await post(`/fission-leads/${currentId}/archive`, { archiveFiles: archiveFiles.value }); uni.showToast({ title: '已归档', icon: 'success' }); archiveFiles.value = []; await fetchDetail() }
  catch (e) { /* */ }
  finally { saving.value = false }
}

function formatTime(v) { if (!v) return '—'; return v.replace('T', ' ').substring(0, 16) }
function formatSize(b) { if (b == null) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB' }
function getFissionStatusClass(status) { const map = { '待确认': 'status-pending', '已确认': 'status-confirmed', '已归档': 'status-archived', '无效': 'status-invalid' }; return map[status] || 'status-default' }
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
.status-confirmed { color: var(--jc-color-primary); background: rgba(247, 189, 72, 0.1); }
.status-archived { color: var(--jc-color-success); background: rgba(34, 197, 94, 0.08); }
.status-invalid { color: var(--jc-color-outline); background: var(--jc-color-surface-container); }
.content-text { font-size: 28rpx; color: var(--jc-color-on-surface); line-height: 1.6; white-space: pre-wrap; }
.card-empty { font-size: 26rpx; color: var(--jc-color-outline-variant); text-align: center; padding: 16rpx 0; }
.form-item { margin-bottom: 28rpx; }
.label { display: block; font-size: 28rpx; color: var(--jc-color-on-surface); margin-bottom: 12rpx; }
.input { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); width: 100%; box-sizing: border-box; }
.textarea { width: 100%; min-height: 160rpx; padding: 16rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); box-sizing: border-box; }
.picker-view { height: 80rpx; padding: 0 20rpx; border: 1rpx solid var(--jc-color-outline-variant); border-radius: 10rpx; font-size: 28rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; }
.placeholder { color: var(--jc-color-outline); }
.edit-actions { margin-top: 24rpx; display: flex; gap: 16rpx; }
.actions { margin: 24rpx; display: flex; flex-direction: column; gap: 16rpx; }
.back-area { margin: 0 24rpx 24rpx; }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 8rpx 0; }
.file-name { font-size: 26rpx; color: var(--jc-color-on-surface); flex: 1; }
.file-size { font-size: 24rpx; color: var(--jc-color-outline); }
.file-del { font-size: 36rpx; color: var(--jc-color-error); padding: 0 8rpx; }
.upload-actions { margin-top: 16rpx; }
.btn { height: 88rpx; line-height: 88rpx; border-radius: 12rpx; font-size: 32rpx; text-align: center; border: none; width: 100%; }
.btn-primary { background: var(--jc-color-primary); color: var(--jc-color-on-primary); }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }
.btn-back { background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); border: 2rpx solid var(--jc-color-primary); }
.btn-upload { background: var(--jc-color-surface-container-lowest); color: var(--jc-color-primary); border: 2rpx solid var(--jc-color-primary); height: 72rpx; line-height: 72rpx; font-size: 28rpx; }

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
