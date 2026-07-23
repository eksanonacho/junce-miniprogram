<template>
  <view
    class="jc-card"
    :class="[
      `jc-card--${padding}`,
      {
        'jc-card--interactive': interactive,
        'jc-card--muted': muted,
        'jc-card--accent': accent,
      },
    ]"
    @tap="$emit('tap')"
  >
    <slot />
  </view>
</template>

<script setup>
defineProps({
  padding: { type: String, default: 'md' },
  interactive: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  accent: { type: Boolean, default: false },
})

defineEmits(['tap'])
</script>

<style>
.jc-card {
  position: relative;
  overflow: hidden;
  background: var(--jc-color-surface-container-lowest);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 24rpx;
  box-shadow: var(--jc-shadow-card);
}

.jc-card--sm {
  padding: 24rpx;
}

.jc-card--md {
  padding: 32rpx;
}

.jc-card--lg {
  padding: 40rpx;
}

.jc-card--muted {
  background: var(--jc-color-surface-container-low);
}

.jc-card--accent::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4rpx;
  height: 100%;
  background: var(--jc-color-primary);
  opacity: 0.82;
}

.jc-card--interactive {
  transition: border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

.jc-card--interactive:active {
  border-color: var(--jc-color-primary);
  background: var(--jc-color-surface-container-low);
  transform: scale(0.99);
}
</style>
