<template>
  <view class="jc-input" :class="{ 'jc-input--error': error, 'jc-input--disabled': disabled }">
    <text v-if="label" class="jc-input__label">{{ label }}</text>
    <view class="jc-input__control">
      <text v-if="prefix" class="jc-input__prefix">{{ prefix }}</text>
      <input
        class="jc-input__field"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        placeholder-class="jc-input__placeholder"
        @input="handleInput"
      />
    </view>
    <text v-if="error" class="jc-input__error">{{ error }}</text>
  </view>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  prefix: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

function handleInput(event) {
  emit('update:modelValue', event.detail.value)
}
</script>

<style>
.jc-input {
  width: 100%;
}

.jc-input__label {
  display: block;
  margin-bottom: 16rpx;
  color: var(--jc-color-on-surface);
  font-size: 26rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.jc-input__control {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.35);
  border: 1rpx solid var(--jc-color-outline-variant);
  border-radius: 16rpx;
}

.jc-input__prefix {
  flex-shrink: 0;
  min-width: 64rpx;
  color: var(--jc-color-secondary);
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 700;
}

.jc-input__field {
  flex: 1;
  height: 86rpx;
  color: var(--jc-color-on-surface);
  font-size: 30rpx;
}

.jc-input__placeholder {
  color: var(--jc-color-outline);
}

.jc-input--error .jc-input__control {
  border-color: var(--jc-color-error-core);
}

.jc-input__error {
  display: block;
  margin-top: 8rpx;
  color: var(--jc-color-error);
  font-size: 22rpx;
}

.jc-input--disabled {
  opacity: 0.56;
}
</style>
