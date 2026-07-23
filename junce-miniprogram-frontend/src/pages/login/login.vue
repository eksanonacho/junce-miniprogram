<template>
  <view class="login-page">
    <view class="login-shell">
      <view class="brand">
        <view class="brand-mark">
          <text class="brand-mark__text">君</text>
        </view>
        <text class="brand-title">Junce</text>
        <text class="brand-subtitle">税务管理系统</text>
      </view>

      <JcCard class="login-card" padding="lg">
        <view class="card-head">
          <text class="section-kicker">SECURE ACCESS</text>
          <text class="lc-title">员工登录</text>
          <text class="lc-sub">使用内部账号进入客户、办件、任务与看板工作台。</text>
        </view>

        <view class="form">
          <JcInput
            v-model="username"
            class="field"
            label="用户名"
            prefix="账号"
            placeholder="请输入用户名"
            :disabled="loading"
          />
          <JcInput
            v-model="password"
            class="field"
            label="密码"
            prefix="密码"
            type="password"
            placeholder="请输入密码"
            :disabled="loading"
          />
          <JcButton :loading="loading" loading-text="登录中..." @tap="handleLogin">登录</JcButton>
        </view>
      </JcCard>

      <view class="footer-note">
        <text class="footer-text">内部系统，仅限授权人员访问。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import JcButton from '../../components/junce/JcButton.vue'
import JcCard from '../../components/junce/JcCard.vue'
import JcInput from '../../components/junce/JcInput.vue'
import { useUserStore } from '../../stores/user.js'
import { post } from '../../utils/request.js'

const username = ref('')
const password = ref('')
const loading = ref(false)

const userStore = useUserStore()

function validate() {
  if (!username.value.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return false
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return false
  }
  return true
}

async function handleLogin() {
  if (!validate()) return

  loading.value = true
  try {
    const res = await post('/auth/login', {
      username: username.value.trim(),
      password: password.value
    }, { skipAuth: true })

    userStore.setLoginInfo(res.accessToken, res.user)

    // 按角色分流跳转
    const rolePageMap = {
      '管理员': '/pages/home/home',
      '主管': '/pages/home/home',
      '商务': '/pages/home/home',
      '业务': '/pages/home/home',
      '会计': '/pages/home/home',
      '总务': '/pages/home/home',
    }
    const target = rolePageMap[res.user.roleCode] || '/pages/home/home'
    uni.reLaunch({ url: target })
  } catch (e) {
    // request.js 已弹 toast，页面层不弹
  } finally {
    loading.value = false
  }
}
</script>

<style>
.login-page {
  min-height: 100vh;
  padding: 64rpx 32rpx 48rpx;
  background: var(--jc-color-surface-container-highest);
}

.login-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: calc(100vh - 112rpx);
  padding: 76rpx 0 24rpx;
  background: var(--jc-color-surface);
  border: 8rpx solid var(--jc-color-surface-container-highest);
  border-radius: 48rpx;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  text-align: center;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 128rpx;
  height: 128rpx;
  margin-bottom: 40rpx;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 32rpx;
  box-shadow: var(--jc-shadow-card);
}

.brand-mark__text {
  color: var(--jc-color-primary);
  font-family: var(--jc-font-heading);
  font-size: 52rpx;
  line-height: 60rpx;
  font-weight: 800;
}

.brand-title {
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 80rpx;
  line-height: 88rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.brand-subtitle {
  margin-top: 8rpx;
  color: var(--jc-color-secondary);
  font-size: 30rpx;
  line-height: 46rpx;
}

.login-card {
  margin: 0 40rpx;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.card-head {
  margin-bottom: 40rpx;
}

.section-kicker {
  display: block;
  margin-bottom: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.lc-title {
  display: block;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 44rpx;
  line-height: 56rpx;
  font-weight: 700;
}

.lc-sub {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 40rpx;
}

.field {
  margin-bottom: 32rpx;
}

.footer-note {
  margin-top: auto;
  padding: 64rpx 32rpx 0;
  text-align: center;
}

.footer-text {
  color: var(--jc-color-on-surface-variant);
  font-size: 20rpx;
  line-height: 28rpx;
  letter-spacing: 2rpx;
}
</style>
