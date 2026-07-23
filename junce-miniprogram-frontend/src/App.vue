<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
page {
  min-height: 100%;
  background: var(--jc-color-surface);
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-body);
  font-size: 30rpx;
  line-height: 46rpx;
}

body {
  background: var(--jc-color-surface);
  color: var(--jc-color-on-surface);
  font-family: var(--jc-font-body);
}

page,
body {
  --jc-color-surface: #c9c6c5;
  --jc-color-surface-container-lowest: rgba(255, 255, 255, 0.55);
  --jc-color-surface-container-low: rgba(255, 255, 255, 0.35);
  --jc-color-surface-container: rgba(255, 255, 255, 0.25);
  --jc-color-surface-container-high: rgba(255, 255, 255, 0.65);
  --jc-color-surface-container-highest: rgba(0, 0, 0, 0.08);
  --jc-color-on-surface: #1a1a1a;
  --jc-color-on-surface-variant: #4a4a4a;
  --jc-color-primary: #C9A84C;
  --jc-color-on-primary: #0a0a0a;
  --jc-color-secondary: #8B6914;
  --jc-color-outline: #8a8a8a;
  --jc-color-outline-variant: rgba(0, 0, 0, 0.06);
  --jc-color-success: #16a34a;
  --jc-color-error: #dc2626;
  --jc-color-error-core: #dc2626;
  --jc-color-warning: #d97706;
  --jc-color-info: #b8860b;
  --jc-font-heading: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  --jc-font-body: "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  --jc-font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --jc-shadow-card: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  --jc-shadow-elevated: 0 20rpx 56rpx rgba(0, 0, 0, 0.12);
}

view,
text,
input,
textarea,
button {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  line-height: inherit;
}

button::after {
  border: 0;
}

input,
textarea {
  font-family: var(--jc-font-body);
}

.jc-page {
  min-height: 100vh;
  background: var(--jc-color-surface);
  color: var(--jc-color-on-surface);
  padding: 40rpx 32rpx calc(64rpx + env(safe-area-inset-bottom));
}

.jc-heading {
  font-family: var(--jc-font-heading);
  color: var(--jc-color-on-surface);
  letter-spacing: 0;
}

.jc-muted {
  color: var(--jc-color-on-surface-variant);
}

/* Legacy page harmonization: keeps older pages aligned while they are migrated. */
.container,
.content,
.detail,
.form {
  background: var(--jc-color-surface) !important;
  color: var(--jc-color-on-surface) !important;
}

.container,
.content {
  min-height: 100vh;
}

.page-head,
.top-bar,
.identity-row,
.month-bar {
  background: transparent !important;
  border-color: var(--jc-color-outline-variant) !important;
}

.page-kicker,
.top-kicker,
.form-section-label,
.section-kicker,
.sd-text {
  color: var(--jc-color-on-surface-variant) !important;
  font-size: 22rpx !important;
  line-height: 28rpx !important;
  font-weight: 800 !important;
  letter-spacing: 2rpx !important;
}

.page-title,
.top-title,
.section-title,
.card-title,
.info-type,
.sh-service,
.sh-label,
.company-name,
.task-title,
.name,
.charge-customer,
.mc-title,
.bm-name {
  color: var(--jc-color-on-surface) !important;
  font-family: var(--jc-font-heading) !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
}

.page-count,
.top-desc,
.brand-subtitle,
.mc-desc,
.bm-desc,
.se-desc,
.card-status,
.card-empty,
.content-text,
.sh-customer,
.task-customer,
.meta-label,
.info-label,
.amount-label,
.label,
.ll,
.sl,
.fb {
  color: var(--jc-color-on-surface-variant) !important;
}

.card,
.info-card,
.summary-card,
.status-header,
.customer-item,
.task-card,
.charge-card,
.template-card,
.main-card,
.biz-module,
.se-card,
.form-card {
  background: var(--jc-color-surface-container-lowest) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1rpx solid var(--jc-color-outline-variant) !important;
  border-radius: 24rpx !important;
  box-shadow: var(--jc-shadow-card) !important;
}

.card:active,
.customer-item:active,
.task-card:active,
.charge-card:active,
.template-card:active,
.main-card:active,
.biz-module:active,
.se-card:active {
  background: var(--jc-color-surface-container-low) !important;
}

.row,
.summary-row,
.stat-row,
.card-head,
.file-item,
.checkin-file-item,
.service-item {
  border-color: var(--jc-color-surface-container-highest) !important;
}

.value,
.vv,
.sv,
.meta-value,
.info-value,
.amount-value,
.month-picker,
.file-name,
.checkin-file-name,
.si-type {
  color: var(--jc-color-on-surface) !important;
}

.input,
.textarea,
.picker-view {
  background: var(--jc-color-surface-container-lowest) !important;
  border-color: var(--jc-color-outline-variant) !important;
  color: var(--jc-color-on-surface) !important;
  border-radius: 16rpx !important;
}

.placeholder {
  color: var(--jc-color-outline) !important;
}

.btn,
.retry-btn,
.back-btn,
.head-action,
.icon-btn,
.fab,
.primary-action {
  border-radius: 16rpx !important;
  font-weight: 800 !important;
}

.btn-primary,
.btn-checkin,
.filter-tab.active,
.fab,
.primary-action {
  background: var(--jc-color-primary) !important;
  border-color: var(--jc-color-primary) !important;
  color: var(--jc-color-on-primary) !important;
}

.btn-back,
.btn-upload,
.retry-btn,
.back-btn,
.head-action,
.icon-btn {
  background: var(--jc-color-surface-container-lowest) !important;
  border-color: var(--jc-color-primary) !important;
  color: var(--jc-color-primary) !important;
}

.btn-disabled {
  background: var(--jc-color-outline-variant) !important;
  color: var(--jc-color-on-surface-variant) !important;
}

.filter-tab {
  background: var(--jc-color-surface-container-lowest) !important;
  border-color: var(--jc-color-outline-variant) !important;
  color: var(--jc-color-on-surface-variant) !important;
}

.status-chip,
.si-status {
  border: 1rpx solid transparent !important;
  border-radius: 8rpx !important;
  font-weight: 800 !important;
}

.status-todo,
.status-pending,
.status-unpaid {
  color: var(--jc-color-warning) !important;
  background: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(245, 158, 11, 0.25) !important;
}

.status-processing,
.status-confirmed {
  color: var(--jc-color-info) !important;
  background: rgba(247, 189, 72, 0.1) !important;
  border-color: rgba(247, 189, 72, 0.2) !important;
}

.status-done,
.status-completed,
.status-paid,
.status-archived,
.status-checked {
  color: var(--jc-color-success) !important;
  background: rgba(34, 197, 94, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.2) !important;
}

.status-invalid,
.status-default {
  color: var(--jc-color-on-surface-variant) !important;
  background: var(--jc-color-surface-container) !important;
  border-color: var(--jc-color-outline-variant) !important;
}

.profit,
.si-create-link,
.retry-link,
.bm-arrow,
.mc-arrow,
.se-title {
  color: var(--jc-color-primary) !important;
}

.overdue,
.required,
.checkin-file-del {
  color: var(--jc-color-error) !important;
}

.status-msg {
  color: var(--jc-color-outline) !important;
}
</style>
