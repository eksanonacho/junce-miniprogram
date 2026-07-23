<template>
  <view class="container">
    <JcH5Back />
    <view class="top-bar">
      <text class="top-kicker">CUSTOMER INTAKE</text>
      <text class="top-title">客户填单</text>
      <text class="top-desc">按真实接口字段创建客户档案，ownerId 与 lifecycleStage 由后端处理。</text>
    </view>

    <view class="form">
      <view class="form-card">
        <view class="section-head">
          <text class="section-kicker">Business Details</text>
          <text class="section-title">工商基本信息</text>
        </view>

        <view class="form-item">
          <text class="label">企业名称 <text class="required">*</text></text>
          <input class="input" v-model="form.companyName" placeholder="请输入企业名称" :disabled="loading" />
        </view>

        <view class="form-grid">
          <view class="form-item">
            <text class="label">客户分类 <text class="required">*</text></text>
            <picker :value="categoryIndex" :range="categoryOptions" :disabled="loading" @change="onCategoryChange">
              <view class="picker-view">
                <text :class="form.customerCategory ? '' : 'placeholder'">{{ form.customerCategory || '请选择' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="label">公司类型</text>
            <picker :value="companyTypeIndex" :range="companyTypeOptions" :disabled="loading" @change="onCompanyTypeChange">
              <view class="picker-view">
                <text :class="form.companyType ? '' : 'placeholder'">{{ form.companyType || '请选择' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="label">行业</text>
          <input class="input" v-model="form.industry" placeholder="请输入行业" :disabled="loading" />
        </view>

        <view class="form-grid">
          <view class="form-item">
            <text class="label">注册日期</text>
            <picker mode="date" :value="form.registerDate" :disabled="loading" @change="onDateChange">
              <view class="picker-view">
                <text :class="form.registerDate ? '' : 'placeholder'">{{ form.registerDate || '请选择' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="label">区域</text>
            <input class="input" v-model="form.region" placeholder="请输入区域" :disabled="loading" />
          </view>
        </view>
      </view>

      <view class="form-card">
        <view class="section-head">
          <text class="section-kicker">Financials & Status</text>
          <text class="section-title">财务与分层</text>
        </view>

        <view class="form-grid">
          <view class="form-item">
            <text class="label">年流水（元）</text>
            <input class="input money-input" type="digit" v-model="form.annualRevenue" placeholder="0.00" :disabled="loading" />
          </view>

          <view class="form-item">
            <text class="label">人员数</text>
            <input class="input" type="number" v-model="form.staffCount" placeholder="请输入" :disabled="loading" />
          </view>
        </view>

        <view class="form-item">
          <text class="label">客户分层</text>
          <picker :value="tierIndex" :range="tierOptions" :disabled="loading" @change="onTierChange">
            <view class="picker-view">
              <text :class="form.tier ? '' : 'placeholder'">{{ form.tier || '请选择' }}</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-card">
        <view class="section-head">
          <text class="section-kicker">Tax Profile</text>
          <text class="section-title">税务信息</text>
        </view>

        <view class="form-item">
          <text class="label">税务类型</text>
          <input class="input" v-model="form.taxType" placeholder="请输入税务类型" :disabled="loading" />
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <button
        class="primary-action"
        :class="loading ? 'btn-disabled' : ''"
        :disabled="loading"
        @tap="handleSubmit"
      >
        {{ loading ? '提交中...' : '提交客户档案' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import JcH5Back from '../../components/junce/JcH5Back.vue'
import { post } from '../../utils/request.js'

// ========== 枚举定义 ==========
const categoryOptions = ['请选择', '新用户', '代理户']
const companyTypeOptions = ['请选择', '一人公司', '多股东', '个体户']
const tierOptions = ['请选择', 'VIP', '优质', '中低', '零申报']

// ========== 表单初始值 ==========
function getInitialForm() {
  return {
    companyName: '',
    customerCategory: '',
    industry: '',
    registerDate: '',
    taxType: '',
    region: '',
    annualRevenue: '',
    staffCount: '',
    companyType: '',
    tier: ''
  }
}

const form = ref(getInitialForm())
const loading = ref(false)

// ========== picker 索引（用于 :value 绑定） ==========
const categoryIndex = computed(() => {
  const i = categoryOptions.indexOf(form.value.customerCategory)
  return i === -1 ? 0 : i
})
const companyTypeIndex = computed(() => {
  const i = companyTypeOptions.indexOf(form.value.companyType)
  return i === -1 ? 0 : i
})
const tierIndex = computed(() => {
  const i = tierOptions.indexOf(form.value.tier)
  return i === -1 ? 0 : i
})

// ========== picker change ==========
function onCategoryChange(e) {
  const index = e.detail.value
  form.value.customerCategory = index === 0 ? '' : categoryOptions[index]
}
function onCompanyTypeChange(e) {
  const index = e.detail.value
  form.value.companyType = index === 0 ? '' : companyTypeOptions[index]
}
function onTierChange(e) {
  const index = e.detail.value
  form.value.tier = index === 0 ? '' : tierOptions[index]
}
function onDateChange(e) {
  form.value.registerDate = e.detail.value
}

// ========== 校验 ==========
function validate() {
  if (!form.value.companyName.trim()) {
    uni.showToast({ title: '请输入企业名称', icon: 'none' })
    return false
  }
  if (!form.value.customerCategory) {
    uni.showToast({ title: '请选择客户分类', icon: 'none' })
    return false
  }
  return true
}

function validateNumberFields() {
  const f = form.value

  if (f.annualRevenue !== '') {
    const v = f.annualRevenue
    if (isNaN(Number(v))) {
      uni.showToast({ title: '年流水格式不正确', icon: 'none' })
      return false
    }
    if (Number(v) < 0) {
      uni.showToast({ title: '年流水不能为负数', icon: 'none' })
      return false
    }
    const parts = v.split('.')
    if (parts.length === 2 && parts[1].length > 2) {
      uni.showToast({ title: '年流水最多保留两位小数', icon: 'none' })
      return false
    }
  }

  if (f.staffCount !== '') {
    const v = f.staffCount
    if (isNaN(Number(v))) {
      uni.showToast({ title: '人员数格式不正确', icon: 'none' })
      return false
    }
    if (!Number.isInteger(Number(v))) {
      uni.showToast({ title: '人员数须为整数', icon: 'none' })
      return false
    }
    if (Number(v) < 0) {
      uni.showToast({ title: '人员数不能为负数', icon: 'none' })
      return false
    }
  }

  return true
}

// ========== 提交 ==========
function buildPayload() {
  const f = form.value
  const payload = {}

  if (f.companyName.trim()) payload.companyName = f.companyName.trim()
  if (f.customerCategory) payload.customerCategory = f.customerCategory

  if (f.industry.trim()) payload.industry = f.industry.trim()
  if (f.registerDate) payload.registerDate = f.registerDate
  if (f.taxType.trim()) payload.taxType = f.taxType.trim()
  if (f.region.trim()) payload.region = f.region.trim()

  if (f.annualRevenue !== '') payload.annualRevenue = Number(f.annualRevenue)
  if (f.staffCount !== '') payload.staffCount = Number(f.staffCount)

  if (f.companyType) payload.companyType = f.companyType
  if (f.tier) payload.tier = f.tier

  return payload
}

function resetForm() {
  form.value = getInitialForm()
}

async function handleSubmit() {
  if (!validate()) return
  if (!validateNumberFields()) return

  loading.value = true
  try {
    const payload = buildPayload()
    await post('/customers', payload)
    uni.showToast({ title: '提交成功', icon: 'success' })
    resetForm()
  } catch (e) {
    // request.js 已弹 toast
  } finally {
    loading.value = false
  }
}
</script>

<style>
.container { min-height: 100vh; background: var(--jc-color-surface); padding-bottom: 160rpx; box-sizing: border-box; }
.top-bar { padding: 36rpx 32rpx 22rpx; }
.top-kicker { display: block; margin-bottom: 8rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 2rpx; color: var(--jc-color-on-surface-variant); }
.top-title { display: block; font-size: 40rpx; line-height: 48rpx; font-weight: 700; color: var(--jc-color-primary); }
.top-desc { display: block; margin-top: 10rpx; font-size: 24rpx; line-height: 34rpx; color: var(--jc-color-on-surface-variant); }
.form { padding: 0 32rpx; }
.form-card { margin-bottom: 24rpx; padding: 32rpx; background: var(--jc-color-surface-container-lowest); border: 1rpx solid var(--jc-color-outline-variant); border-radius: 16rpx; box-sizing: border-box; }
.section-head { margin-bottom: 28rpx; }
.section-kicker { display: block; margin-bottom: 8rpx; font-size: 20rpx; line-height: 26rpx; letter-spacing: 3rpx; color: var(--jc-color-on-surface-variant); }
.section-title { display: block; font-size: 32rpx; line-height: 40rpx; font-weight: 700; color: var(--jc-color-on-surface); }
.form-item { margin-bottom: 30rpx; }
.form-item:last-child { margin-bottom: 0; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32rpx; }
.label { display: block; font-size: 24rpx; line-height: 32rpx; font-weight: 600; color: var(--jc-color-on-surface-variant); margin-bottom: 8rpx; }
.required { color: var(--jc-color-error-core); }
.input { height: 76rpx; padding: 0 4rpx; border: none; border-bottom: 2rpx solid var(--jc-color-outline); border-radius: 0; font-size: 30rpx; line-height: 76rpx; background: var(--jc-color-surface-container-lowest); color: var(--jc-color-on-surface); box-sizing: border-box; }
.money-input { color: var(--jc-color-primary); font-weight: 600; }
.picker-view { height: 76rpx; padding: 0 4rpx; border: none; border-bottom: 2rpx solid var(--jc-color-outline-variant); border-radius: 0; font-size: 30rpx; background: var(--jc-color-surface-container-lowest); display: flex; align-items: center; box-sizing: border-box; color: var(--jc-color-on-surface); }
.placeholder { color: var(--jc-color-outline); }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 24rpx 32rpx 34rpx; background: rgba(201, 198, 197, 0.94); border-top: 1rpx solid var(--jc-color-outline-variant); box-sizing: border-box; }
.primary-action { width: 100%; height: 88rpx; line-height: 88rpx; border-radius: 10rpx; background: var(--jc-color-primary); color: var(--jc-color-on-primary); font-size: 30rpx; font-weight: 700; border: none; }
.btn-disabled { background: var(--jc-color-outline); color: var(--jc-color-on-primary); }
</style>
