<template>
  <view class="jc-page-header">
    <view class="jc-page-header__main">
      <text v-if="kicker" class="jc-page-header__kicker">{{ kicker }}</text>
      <text class="jc-page-header__title">{{ title }}</text>
      <text v-if="subtitle" class="jc-page-header__subtitle">{{ subtitle }}</text>
    </view>
    <view v-if="$slots.action || meta" class="jc-page-header__side">
      <slot name="action">
        <text class="jc-page-header__meta">{{ meta }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup>
defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  meta: { type: String, default: '' },
})
</script>

<style>
.jc-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32rpx;
  margin-bottom: 40rpx;
}

.jc-page-header__main {
  min-width: 0;
}

.jc-page-header__kicker {
  display: block;
  margin-bottom: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  text-transform: uppercase;
}

.jc-page-header__title {
  display: block;
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-heading);
  font-size: 64rpx;
  line-height: 84rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.jc-page-header__subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-on-surface-variant);
  font-size: 30rpx;
  line-height: 46rpx;
}

.jc-page-header__side {
  flex-shrink: 0;
  padding-bottom: 8rpx;
}

.jc-page-header__meta {
  color: var(--jc-color-on-surface-variant);
  font-size: 26rpx;
  font-weight: 700;
}
</style>
