<template>
  <text class="jc-status-chip" :class="[`jc-status-chip--${tone}`, `jc-status-chip--${size}`]">
    {{ label || status || '未知' }}
  </text>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
  size: { type: String, default: 'md' },
})

const tone = computed(() => {
  const map = {
    待办: 'warning',
    待处理: 'warning',
    未收: 'warning',
    未付款: 'warning',
    办件中: 'info',
    处理中: 'info',
    已确认: 'info',
    办结: 'success',
    已完成: 'success',
    已打卡: 'success',
    已收: 'success',
    已付款: 'success',
    逾期: 'error',
    已取消: 'neutral',
    作废: 'neutral',
  }

  return map[props.status] || 'neutral'
})
</script>

<style>
.jc-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1rpx solid transparent;
  border-radius: 8rpx;
  font-family: var(--jc-font-body);
  font-weight: 700;
  letter-spacing: 1rpx;
}

.jc-status-chip--sm {
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  line-height: 26rpx;
}

.jc-status-chip--md {
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  line-height: 30rpx;
}

.jc-status-chip--warning {
  color: var(--jc-color-warning);
  background: var(--jc-color-surface-container);
  border-color: var(--jc-color-outline-variant);
}

.jc-status-chip--info {
  color: var(--jc-color-info);
  background: var(--jc-color-surface-container);
  border-color: var(--jc-color-outline-variant);
}

.jc-status-chip--success {
  color: var(--jc-color-success);
  background: var(--jc-color-surface-container);
  border-color: var(--jc-color-outline-variant);
}

.jc-status-chip--error {
  color: var(--jc-color-error);
  background: var(--jc-color-surface-container);
  border-color: var(--jc-color-outline-variant);
}

.jc-status-chip--neutral {
  color: var(--jc-color-on-surface-variant);
  background: var(--jc-color-surface-container);
  border-color: var(--jc-color-outline-variant);
}
</style>
