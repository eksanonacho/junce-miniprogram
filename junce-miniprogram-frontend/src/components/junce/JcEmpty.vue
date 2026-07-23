<template>
  <view class="jc-empty">
    <view class="jc-empty__mark"></view>
    <text class="jc-empty__text">{{ text }}</text>
    <slot name="action" />
  </view>
</template>

<script setup>
defineProps({
  text: { type: String, default: '暂无数据' },
})
</script>

<style>
.jc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360rpx;
  padding: 64rpx 32rpx;
  color: var(--jc-color-on-surface-variant);
  text-align: center;
}

.jc-empty__mark {
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 32rpx;
  border-radius: 32rpx;
  border: 1rpx solid var(--jc-color-outline-variant);
  background: var(--jc-color-surface-container-lowest);
  box-shadow: inset 0 0 0 16rpx var(--jc-color-surface-container-low);
}

.jc-empty__text {
  color: var(--jc-color-on-surface-variant);
  font-size: 30rpx;
  line-height: 46rpx;
}
</style>
