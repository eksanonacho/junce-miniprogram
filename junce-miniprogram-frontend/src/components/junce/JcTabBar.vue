<template>
  <view class="jc-tab-bar">
    <view
      v-for="item in tabs"
      :key="item.value"
      class="jc-tab-bar__item"
      :class="{ 'jc-tab-bar__item--active': item.value === modelValue }"
      @tap="$emit('update:modelValue', item.value)"
    >
      <text class="jc-tab-bar__text">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  tabs: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue'])
</script>

<style>
.jc-tab-bar {
  display: flex;
  gap: 40rpx;
  margin-bottom: 40rpx;
  border-bottom: 1rpx solid var(--jc-color-surface-container-highest);
  overflow-x: auto;
  white-space: nowrap;
}

.jc-tab-bar__item {
  position: relative;
  flex-shrink: 0;
  padding: 0 8rpx 24rpx;
}

.jc-tab-bar__item::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1rpx;
  width: 100%;
  height: 4rpx;
  background: transparent;
  border-radius: 9999rpx;
}

.jc-tab-bar__text {
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.jc-tab-bar__item--active::after {
  background: var(--jc-color-primary);
}

.jc-tab-bar__item--active .jc-tab-bar__text {
  color: var(--jc-color-primary);
}
</style>
