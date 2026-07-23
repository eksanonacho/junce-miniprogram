# 前端页面路线图

> 最后更新：2026-06-13。基于 docs/FRONTEND_HANDOFF.md 和 docs/API_CONTRACT.md 生成。

## 第一阶段：客户管理闭环

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 登录页 | `pages/login/login` | `POST /auth/login` | ✅ 联调通过 |
| 客户填单页 | `pages/customer-form/customer-form` | `POST /customers` | ✅ 联调通过 |
| 客户列表页 | `pages/customer-list/customer-list` | `GET /customers` | ✅ 联调通过 |
| 客户详情页 | `pages/customer-detail/customer-detail` | `GET /customers/:id` | ✅ 联调通过 |
| 客户编辑页 | `pages/customer-edit/customer-edit` | `PATCH /customers/:id` | ✅ 联调通过 |

> 🎉 第一阶段全部完成，客户管理模块闭环。

**待补**：TabBar 导航、登录后角色首页路由。

---

## 第二阶段：客户业务配置

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 服务模板选择页 | `pages/service-template-select/service-template-select` | `GET /service-templates` + `GET /service-templates/:id` + `POST /service-read-confirmations` + `GET /service-read-confirmations` + `POST /customers/:id/service-items` | ✅ 联调通过 |
| 已读确认 | 嵌入选择页 | `POST /service-read-confirmations` + `GET /service-read-confirmations` | ✅ 联调通过 |
| 服务项展示 | 嵌入客户详情 | `GET /customers/:id/service-items` | ✅ 联调通过 |
| 人员配置页 | `pages/staff-config/staff-config` | `GET /users` + `GET /customers/:id/staff-assignment` + `PUT /customers/:id/staff-assignment` | ✅ 联调通过 |

---

## 第三阶段：办件流转

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 办件列表页 | `pages/workorder-list/workorder-list` | `GET /work-orders` | ✅ 联调通过 |
| 办件详情页 | `pages/workorder-detail/workorder-detail` | `GET /work-orders/:id` + `PATCH /work-orders/:id` | ✅ 联调通过 |
| 创建办件页 | `pages/workorder-create/workorder-create` | `POST /work-orders` | ✅ 联调通过 |
| 办件状态更新 | 嵌入详情 | `PATCH /work-orders/:id` | ✅ 联调通过 |
| 办结打卡+文件上传 | 嵌入详情 | `POST /check-in` + `POST /files/upload` | ✅ 联调通过 |

---

## 第四阶段：收费管控

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 未收款列表 | `pages/charge-unpaid-list/charge-unpaid-list` | `GET /charges?chargeStatus=未收` | ✅ 联调通过 |
| 收费详情页 | `pages/charge-detail/charge-detail` | `GET /charges/:id` + `PATCH` + `POST confirm/remind` + `GET reminders` | ✅ 联调通过 |
| 收费录入/编辑 | 嵌入 charge-detail（edit 模式） | `POST/PATCH /charges` | ✅ 联调通过 |
| 确认已收 | 嵌入 charge-detail | `POST /charges/:id/confirm` | ✅ 联调通过 |
| 发起催收 | 嵌入 charge-detail（弹窗） | `POST /charges/:id/remind` | ✅ 联调通过 |
| 催收记录 | 嵌入 charge-detail | `GET /charges/:id/reminders` | ✅ 联调通过 |
| 收费摘要卡片 | 嵌入 customer-detail | `GET /charges?customerId=X` | ✅ 联调通过 |

---

## 第五阶段：代理户托管入档

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 托管入档详情 | `pages/tenant-detail/tenant-detail` | `GET /tenant-registers/:id` + `PATCH` + `POST confirm-plan/assign-accountant/confirm-assignment` | ✅ 联调通过 |
| 创建托管入档 | 嵌入 tenant-detail（create 模式） | `POST /tenant-registers` | ✅ 联调通过 |
| 更新概况/方案 | 嵌入 tenant-detail（edit 模式） | `PATCH /tenant-registers/:id` | ✅ 联调通过 |
| 主理人确认方案 | 嵌入 tenant-detail | `POST /tenant-registers/:id/confirm-plan` | ✅ 联调通过 |
| 主管分派会计 | 嵌入 tenant-detail（弹窗） | `POST /tenant-registers/:id/assign-accountant` | ✅ 联调通过 |
| 会计确认分派 | 嵌入 tenant-detail | `POST /tenant-registers/:id/confirm-assignment` | ✅ 联调通过 |
| 托管摘要卡片 | 嵌入 customer-detail | `GET /tenant-registers?customerId=X` | ✅ 联调通过 |

---

## 第六阶段：任务流转

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 任务列表页 | `pages/task-list/task-list` | `GET /tasks` | ✅ 联调通过 |
| 任务详情页 | `pages/task-detail/task-detail` | `GET /tasks/:id` + `PATCH` + `POST confirm/complete` | ✅ 联调通过 |
| 创建任务页 | `pages/task-create/task-create` | `POST /tasks` | ✅ 联调通过 |
| 确认/完成任务 | 嵌入 task-detail | `POST /tasks/:id/confirm` `POST /tasks/:id/complete` | ✅ 联调通过 |

---

## 第七阶段：业务裂变

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 裂变列表页 | `pages/fission-list/fission-list` | `GET /fission-leads` | ✅ 联调通过 |
| 裂变详情页 | `pages/fission-detail/fission-detail` | `GET /:id` + `PATCH` + `POST confirm/archive/mark-invalid` | ✅ 联调通过 |
| 裂变创建页 | `pages/fission-create/fission-create` | `POST /fission-leads` | ✅ 联调通过 |
| 办结凭证归档 | 嵌入 fission-detail | `POST /fission-leads/:id/archive`（复用 POST /files/upload） | ✅ 联调通过 |

---

## 第八阶段：手动经营/工资看板

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 经营看板 | `pages/manual-business/manual-business` | `GET/POST/PATCH /manual-dashboard/business-reports` + summary | ✅ 联调通过 |
| 工资看板 | `pages/manual-salary/manual-salary` | `GET/POST/PATCH /manual-dashboard/salary-reports` + summary | ✅ 联调通过 |

## 第九阶段：自动看板

| 页面 | 实际路径 | 接口 | 状态 |
|---|---|---|---|
| 数据看板 | `pages/dashboard/dashboard` | `GET /dashboard/overview` + customers/services/tasks/charges | ✅ 联调通过 |

---

---

## Future Task：全局页面动画与交互过渡统一优化

> ✅ 已完成（2026-06-13 ~ 2026-06-21）。25 页 V2 钛银配色 + Impeccable 迭代 + WXSS 中文 class 清除 + 结构改造。

**优化范围**：页面进入动画、卡片淡入/上滑、列表项轻量过渡、按钮点击反馈、loading/empty 过渡、看板数字动效、表单弹出/收起、整体动效风格统一。

**原则**：不影响业务逻辑和接口请求，不引入重型动画库，优先 CSS transition/animation，保持小程序性能，动画克制不花哨，每次优化一类页面。

**风险**：P1（一次性改动过多页面可能影响稳定性）、P2（不同端动画差异需小程序实测）。

---

## 当前进度总览

- 🎉 **全部完成**：Phase 1-9 = 55/55 业务接口，25 页面
- 📋 **后续优化**：全局页面动画与交互过渡统一优化（待启动）
