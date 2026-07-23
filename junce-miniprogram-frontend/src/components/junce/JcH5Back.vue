<template>
  <!-- #ifdef H5 -->
  <view class="jc-h5-back" @tap="goBack">
    <text class="jc-h5-back__arrow">‹</text>
    <text class="jc-h5-back__text">返回</text>
  </view>
  <!-- #endif -->
</template>

<script setup>
const props = defineProps({
  fallback: { type: String, default: '/pages/home/home' },
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({ url: props.fallback })
}
</script>

<style>
.jc-h5-back {
  position: fixed;
  top: 24rpx;
  left: 24rpx;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 18rpx 0 14rpx;
  color: var(--jc-color-on-surface);
  background: rgba(201, 198, 197, 0.92);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 9999rpx;
  box-shadow: var(--jc-shadow-card);
}

.jc-h5-back__arrow {
  color: var(--jc-color-primary);
  font-size: 42rpx;
  line-height: 42rpx;
  font-weight: 700;
}

.jc-h5-back__text {
  color: var(--jc-color-on-surface);
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 800;
}
</style>
