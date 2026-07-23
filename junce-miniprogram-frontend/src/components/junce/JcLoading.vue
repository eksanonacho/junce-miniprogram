<template>
  <view class="jc-loading" :class="`jc-loading--${type}`">
    <view v-for="item in count" :key="item" class="jc-loading__item">
      <view class="jc-loading__line jc-loading__line--wide"></view>
      <view class="jc-loading__line"></view>
      <view v-if="type !== 'compact'" class="jc-loading__line jc-loading__line--short"></view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'card' },
  count: { type: Number, default: 3 },
})
</script>

<style>
.jc-loading {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.jc-loading__item {
  padding: 32rpx;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 24rpx;
}

.jc-loading__line {
  height: 24rpx;
  width: 58%;
  margin-top: 24rpx;
  border-radius: 9999rpx;
  background: var(--jc-color-surface-container-high);
}

.jc-loading__line:first-child {
  margin-top: 0;
}

.jc-loading__line--wide {
  width: 82%;
  height: 32rpx;
}

.jc-loading__line--short {
  width: 36%;
}
</style>
