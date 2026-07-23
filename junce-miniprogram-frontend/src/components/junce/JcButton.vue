<template>
  <button
    class="jc-button"
    :class="[
      `jc-button--${variant}`,
      `jc-button--${size}`,
      {
        'jc-button--loading': loading,
        'jc-button--disabled': disabled || loading
      }
    ]"
    :disabled="disabled || loading"
    @tap="$emit('tap', $event)"
  >
    <text class="jc-button__text">
      <slot>{{ loading ? loadingText : text }}</slot>
    </text>
  </button>
</template>

<script setup>
defineProps({
  text: { type: String, default: '' },
  loadingText: { type: String, default: '处理中...' },
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

defineEmits(['tap'])
</script>

<style>
.jc-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  font-family: var(--jc-font-body);
  font-weight: 700;
  transition: transform 0.16s ease, opacity 0.16s ease, background-color 0.16s ease;
}

.jc-button:active {
  transform: scale(0.98);
}

.jc-button--disabled {
  opacity: 0.52;
}

.jc-button--md {
  min-height: 88rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
}

.jc-button--sm {
  min-height: 68rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
}

.jc-button--lg {
  min-height: 104rpx;
  padding: 0 40rpx;
  font-size: 30rpx;
}

.jc-button--primary {
  background: var(--jc-color-primary);
  color: var(--jc-color-on-primary);
}

.jc-button--outline {
  background: var(--jc-color-surface-container-lowest);
  color: var(--jc-color-primary);
  border-color: var(--jc-color-primary);
}

.jc-button--text {
  background: transparent;
  color: var(--jc-color-primary);
}

.jc-button__text {
  color: inherit;
}
</style>
