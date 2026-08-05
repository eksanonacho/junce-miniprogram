<template>
  <view class="container">
    <JcH5Back />
    <!-- loading -->
    <view v-if="loading" class="status-msg">加载中...</view>

    <!-- error / 404 -->
    <view v-else-if="error" class="status-msg">
      <text>办件不存在</text>
      <button class="retry-btn" @tap="goBack">返回</button>
    </view>

    <!-- 正常详情 -->
    <view v-else-if="wo" class="detail">
      <!-- 状态概览 -->
      <view class="status-header">
        <text class="sh-service">{{ wo.serviceItem?.serviceTemplate?.serviceType || '—' }}</text>
        <view class="sh-row">
          <text class="si-status" :class="getWoStatusClass(wo.status)">{{ wo.status }}</text>
          <text class="sh-customer">{{ wo.customer?.companyName || '—' }}</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">办件信息</view>
        <view class="row"><text class="ll">客户</text><text class="vv">{{ wo.customer?.companyName || '—' }}</text></view>
        <view class="row" @tap="canOperate && wo.status !== '已打卡' && startPickUser('handler')">
          <text class="ll">对接人</text>
          <text class="vv" :class="{ 'vv-edit': canOperate && wo.status !== '已打卡' }">{{ wo.handler?.realName || '未指派' }} {{ canOperate && wo.status !== '已打卡' ? '›' : '' }}</text>
        </view>
        <view class="row" @tap="canOperate && wo.status !== '已打卡' && startPickUser('receiver')">
          <text class="ll">回执接收人</text>
          <text class="vv" :class="{ 'vv-edit': canOperate && wo.status !== '已打卡' }">{{ wo.receiptReceiver?.realName || '未指派' }} {{ canOperate && wo.status !== '已打卡' ? '›' : '' }}</text>
        </view>

        <!-- 人员选择浮层 -->
        <view v-if="showUserPicker" class="picker-mask" @tap="showUserPicker = false">
          <view class="picker-panel" @tap.stop>
            <view class="picker-title">选择{{ pickTarget === 'handler' ? '业务对接人' : '回执接收人' }}</view>
            <scroll-view class="picker-list" scroll-y>
              <view
                v-for="u in userList"
                :key="u.id"
                class="picker-item"
                :class="{ 'picker-item--selected': (pickTarget === 'handler' ? selectedHandlerId : selectedReceiverId) === u.id }"
                @tap="selectUser(u)"
              >
                <text class="picker-item-name">{{ u.realName }}</text>
                <text class="picker-item-role">{{ u.role?.name || u.roleCode }}</text>
              </view>
            </scroll-view>
            <view class="picker-actions">
              <button class="btn btn-back" @tap="showUserPicker = false">取消</button>
              <button class="btn btn-primary" @tap="confirmPickUser">确认</button>
            </view>
          </view>
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="card">
        <view class="card-title">时间信息</view>
        <view class="row"><text class="ll">创建时间</text><text class="vv">{{ formatTime(wo.createdAt) }}</text></view>
        <view class="row"><text class="ll">办结时间</text><text class="vv">{{ formatTime(wo.completedAt) }}</text></view>
        <view class="row"><text class="ll">打卡时间</text><text class="vv">{{ formatTime(wo.checkedInAt) }}</text></view>
      </view>

      <!-- 归档材料 -->
      <view class="card">
        <view class="card-title">归档材料</view>
        <view v-if="(wo.archiveFiles || []).length === 0" class="card-empty">暂无</view>
        <view v-else>
          <view v-for="(f, i) in (wo.archiveFiles || [])" :key="i" class="file-item">
            <text class="file-name">{{ f.name }}</text>
            <text class="file-size">{{ formatSize(f.size) }}</text>
          </view>
        </view>
      </view>

      <!-- 状态流转按钮 -->
      <view v-if="canOperate && wo.status !== '已打卡'" class="actions">
        <button
          v-if="wo.status === '待办'"
          class="btn btn-primary"
          :disabled="saving"
          @tap="changeStatus('办件中')"
        >
          {{ saving ? '处理中...' : '开始办件' }}
        </button>
        <button
          v-if="wo.status === '办件中'"
          class="btn btn-primary"
          :disabled="saving"
          @tap="changeStatus('办结')"
        >
          {{ saving ? '处理中...' : '办结' }}
        </button>
        <button
          v-if="wo.status === '办结'"
          class="btn btn-checkin"
          :disabled="saving"
          @tap="showCheckin = true"
        >
          办结打卡
        </button>
      </view>
      <view v-else-if="wo.status === '已打卡'" class="actions">
        <text class="terminal-text">已打卡（终态）</text>
      </view>
      <view v-else class="actions">
        <text class="terminal-text">仅查看，由当前对接人办理</text>
      </view>

      <!-- 办结打卡子视图 -->
      <view v-if="showCheckin" class="checkin-area">
        <view class="card">
          <view class="card-title">
            <text>办结打卡</text>
            <text class="checkin-cancel" @tap="closeCheckin">取消</text>
          </view>

          <!-- 已选文件列表 -->
          <view v-if="checkinFiles.length > 0" class="file-list">
            <view v-for="(f, i) in checkinFiles" :key="i" class="checkin-file-item">
              <view class="checkin-file-info">
                <text class="checkin-file-name">{{ f.name }}</text>
                <text class="checkin-file-size">{{ formatSize(f.size) }}</text>
              </view>
              <text class="checkin-file-del" @tap="removeFile(i)">×</text>
            </view>
          </view>
          <view v-else class="card-empty">请添加归档文件</view>

          <!-- 添加文件按钮 -->
          <view class="upload-actions">
            <button class="btn btn-upload" @tap="handleChooseFile">添加文件</button>
          </view>

          <!-- 提交 -->
          <view class="checkin-submit">
            <button
              class="btn btn-primary"
              @tap="handleCheckin"
            >
              {{ submittingCheckin ? '提交中...' : '确认打卡' }}
            </button>
          </view>
        </view>
      </view>

      <!-- 返回 -->
      <view class="back-area">
        <button class="btn btn-back" @tap="goBack">返回</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { get, patch, post } from '../../utils/request.js'
import { BASE_URL } from '../../config/index.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()

let currentId = ''
let skipNextShow = true

// ========== 状态 ==========
const wo = ref(null)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)

// 人员选择
const showUserPicker = ref(false)
const pickTarget = ref('handler')
const userList = ref([])
const selectedHandlerId = ref(0)
const selectedReceiverId = ref(0)

// 打卡子视图
const showCheckin = ref(false)
const checkinFiles = ref([])
const submittingCheckin = ref(false)

// 对接人本人负责办理；主管和管理员保留兜底权限。
const canOperate = computed(() => {
  const user = userStore.user
  if (!user || !wo.value) return false
  if (user.roleCode === '管理员' || user.roleCode === '主管') return true
  return Number(wo.value.handler?.id) === Number(user.id)
})

onLoad((options) => {
  currentId = options.id
  if (currentId) {
    fetchDetail()
  } else {
    error.value = true
  }
})

onShow(() => {
  if (skipNextShow) {
    skipNextShow = false
    return
  }
  if (currentId) {
    fetchDetail()
  }
})

// ========== 数据加载 ==========
async function fetchDetail() {
  loading.value = true
  error.value = false

  try {
    const res = await get(`/work-orders/${currentId}`)
    wo.value = res
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

// ========== 状态流转 ==========
async function changeStatus(newStatus) {
  saving.value = true
  try {
    await patch(`/work-orders/${currentId}`, { status: newStatus })
    uni.showToast({ title: '操作成功', icon: 'success' })
    await fetchDetail()
  } catch (e) {
    // request.js 已 toast
  } finally {
    saving.value = false
  }
}

// ========== 文件上传 ==========
function handleChooseFile() {
  // #ifdef H5
  uni.chooseFile({
    count: 1,
    success: (res) => {
      uploadFile(res.tempFiles[0])
    }
  })
  // #endif

  // #ifdef MP-WEIXIN
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择', '从聊天记录选择文件'],
    success: (actionRes) => {
      switch (actionRes.tapIndex) {
        case 0:
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['camera'],
            success: (res) => { uploadFile(res.tempFiles[0]) }
          })
          break
        case 1:
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album'],
            success: (res) => { uploadFile(res.tempFiles[0]) }
          })
          break
        case 2:
          wx.chooseMessageFile({
            count: 1,
            type: 'all',
            success: (res) => { uploadFile(res.tempFiles[0]) }
          })
          break
      }
    }
  })
  // #endif
}

function uploadFile(tempFile) {
  const token = userStore.token

  uni.showLoading({ title: '上传中...' })

  uni.uploadFile({
    url: BASE_URL + '/files/upload',
    filePath: tempFile.path || tempFile.tempFilePath,
    name: 'file',
    header: {
      'Authorization': `Bearer ${token}`
    },
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (res.statusCode === 401) {
          uni.showToast({ title: '登录已过期', icon: 'none' })
        } else if (res.statusCode === 403) {
          uni.showToast({ title: '无权限', icon: 'none' })
        } else {
          uni.showToast({ title: '文件上传失败', icon: 'none' })
        }
        return
      }
      try {
        const fileObj = JSON.parse(res.data)
        checkinFiles.value.push(fileObj)
      } catch (e) {
        uni.showToast({ title: '文件解析失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '文件上传失败', icon: 'none' })
    }
  })
}

function removeFile(index) {
  checkinFiles.value.splice(index, 1)
}

function closeCheckin() {
  showCheckin.value = false
  checkinFiles.value = []
}

// ========== 办结打卡 ==========
async function handleCheckin() {
  if (submittingCheckin.value) {
    uni.showToast({ title: '正在提交，请稍候', icon: 'none' })
    return
  }
  if (checkinFiles.value.length === 0) {
    uni.showToast({ title: '请先上传办结归档材料', icon: 'none' })
    return
  }

  submittingCheckin.value = true
  try {
    await post(`/work-orders/${currentId}/check-in`, {
      archiveFiles: checkinFiles.value
    })
    uni.showToast({ title: '打卡成功', icon: 'success' })
    showCheckin.value = false
    checkinFiles.value = []
    await fetchDetail()
  } catch (e) {
    // request.js 已 toast
  } finally {
    submittingCheckin.value = false
  }
}

// ========== 工具 ==========
function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 16)
}

function formatSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getWoStatusClass(status) { const map = { '待办': 'status-todo', '办件中': 'status-processing', '办结': 'status-done', '已打卡': 'status-checked' }; return map[status] || 'status-default' }

// ========== 人员选择 ==========
async function startPickUser(target) {
  pickTarget.value = target
  if (target === 'handler') {
    selectedHandlerId.value = wo.value?.handler?.id || 0
  } else {
    selectedReceiverId.value = wo.value?.receiptReceiver?.id || 0
  }
  try {
    const users = await get('/users')
    userList.value = Array.isArray(users) ? users : []
  } catch (e) {
    userList.value = []
  }
  showUserPicker.value = true
}

function selectUser(u) {
  if (pickTarget.value === 'handler') {
    selectedHandlerId.value = u.id
  } else {
    selectedReceiverId.value = u.id
  }
}

async function confirmPickUser() {
  const field = pickTarget.value === 'handler' ? 'handlerId' : 'receiptReceiverId'
  const value = pickTarget.value === 'handler' ? selectedHandlerId.value : selectedReceiverId.value
  if (!value) {
    uni.showToast({ title: '请选择人员', icon: 'none' })
    return
  }
  showUserPicker.value = false
  try {
    await patch(`/work-orders/${currentId}`, { [field]: value })
    uni.showToast({ title: '已更新', icon: 'success' })
    await fetchDetail()
  } catch (e) {
    // request.js handles toast
  }
}
function goBack() {
  uni.navigateBack()
}
</script>

<style>
.container {
  min-height: 100vh;
  background: var(--jc-color-surface);
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

.detail { padding-bottom: 48rpx; }
.status-header { margin: 24rpx; padding: 22rpx 24rpx; background: var(--jc-color-surface-container-lowest); border-radius: 12rpx; border-left: 4rpx solid var(--jc-color-primary); }
.sh-service { display: block; font-size: 28rpx; font-weight: 600; color: var(--jc-color-on-surface); margin-bottom: 8rpx; }
.sh-row { display: flex; align-items: center; gap: 12rpx; }
.sh-customer { font-size: 24rpx; color: var(--jc-color-on-surface-variant); }

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
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.ll {
  font-size: 28rpx;
  color: var(--jc-color-outline);
}

.vv {
  font-size: 28rpx;
  color: var(--jc-color-on-surface);
  text-align: right;
  max-width: 420rpx;
  word-break: break-all;
}

.vv-edit {
  color: var(--jc-color-primary);
}

/* 人员选择浮层 */
.picker-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: flex-end;
}

.picker-panel {
  background: var(--jc-color-surface-container-lowest);
  border-radius: 24rpx 24rpx 0 0;
  width: 100%; max-height: 70vh;
  display: flex; flex-direction: column;
}

.picker-title {
  font-size: 32rpx; font-weight: 700;
  color: var(--jc-color-on-surface);
  padding: 28rpx 32rpx 16rpx;
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.picker-list {
  flex: 1; max-height: 50vh;
}

.picker-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--jc-color-outline-variant);
}

.picker-item--selected {
  background: var(--jc-color-surface-container-low);
}

.picker-item-name {
  font-size: 28rpx; color: var(--jc-color-on-surface); font-weight: 600;
}

.picker-item-role {
  font-size: 24rpx; color: var(--jc-color-on-surface-variant);
}

.picker-actions {
  display: flex; gap: 16rpx; padding: 20rpx 32rpx 32rpx;
  border-top: 1rpx solid var(--jc-color-outline-variant);
}

.si-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.status-todo {
  color: var(--jc-color-warning);
  background: rgba(245, 158, 11, 0.1);
}

.status-processing {
  color: var(--jc-color-primary);
  background: rgba(247, 189, 72, 0.1);
}

.status-done {
  color: var(--jc-color-success);
  background: rgba(34, 197, 94, 0.08);
}

.status-checked {
  color: var(--jc-color-outline);
  background: var(--jc-color-surface-container);
}

.card-empty {
  font-size: 26rpx;
  color: var(--jc-color-outline-variant);
  text-align: center;
  padding: 16rpx 0;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.file-name {
  font-size: 26rpx;
  color: var(--jc-color-on-surface);
  flex: 1;
}

.file-size {
  font-size: 24rpx;
  color: var(--jc-color-outline);
}

.terminal-text {
  width: 100%;
  text-align: center;
  font-size: 28rpx;
  color: var(--jc-color-outline);
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
  width: 100%;
}

.btn-primary {
  background: var(--jc-color-primary);
  color: var(--jc-color-on-primary);
}

.btn-checkin {
  background: var(--jc-color-success);
  color: var(--jc-color-on-primary);
}

.btn-back {
  background: var(--jc-color-surface-container-lowest);
  color: var(--jc-color-primary);
  border: 2rpx solid var(--jc-color-primary);
}

.btn-upload {
  background: var(--jc-color-surface-container-lowest);
  color: var(--jc-color-primary);
  border: 2rpx solid var(--jc-color-primary);
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
}

/* 打卡区域 */
.checkin-area {
  /* inline into detail flow */
}

.checkin-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 2rpx solid var(--jc-color-surface-container);
}

.checkin-file-info {
  flex: 1;
}

.checkin-file-name {
  display: block;
  font-size: 26rpx;
  color: var(--jc-color-on-surface);
}

.checkin-file-size {
  font-size: 22rpx;
  color: var(--jc-color-outline);
  margin-top: 4rpx;
}

.checkin-file-del {
  font-size: 36rpx;
  color: var(--jc-color-error-core);
  padding: 8rpx 16rpx;
}

.file-list {
  margin-bottom: 16rpx;
}

.upload-actions {
  margin-top: 16rpx;
}

.checkin-cancel {
  font-size: 28rpx;
  color: var(--jc-color-primary);
}

.checkin-submit {
  margin-top: 24rpx;
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

</style>
