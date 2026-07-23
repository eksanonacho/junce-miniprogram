# 前端项目状态

> 最后更新：2026-07-17
> 这是前端项目记忆库。换对话、换 AI、换 Agent 后，先读这个文件。

## 当前项目快照

| 项 | 值 |
|---|---|
| 当前阶段 | 第九阶段 联调通过 ✅（Phase 1-9 共 60/60 业务接口全部联调通过） |
| BASE_URL | `http://172.20.10.5:3000`（局域网 IP，会变） |
| H5 运行 | ✅ 正常 |
| 微信小程序 | 未完整测试 |
| 已联调接口 | 60/60 业务接口全部联调通过（Phase 1-9 全部完成 + Files 文件上传） |
| 后端接口总数 | 61 个就绪 |

## 已完成页面

| 页面 | 路径 | 接口 | 状态 |
|---|---|---|---|
| 登录页 | `pages/login/login` | `POST /auth/login` | ✅ 联调通过 |
| 客户填单页 | `pages/customer-form/customer-form` | `POST /customers` | ✅ 联调通过 |
| 客户列表页 | `pages/customer-list/customer-list` | `GET /customers` | ✅ 联调通过 |
| 客户详情页 | `pages/customer-detail/customer-detail` | `GET /customers/:id` + `GET /service-items` + `GET /staff-assignment` + `GET /charges` + `GET /tenant-registers` + 创建办件/收费/托管入口 | ✅ 联调通过（含 Phase 2+3+4+5 增强） |
| 客户编辑页 | `pages/customer-edit/customer-edit` | `PATCH /customers/:id` | ✅ 联调通过 |
| 服务模板选择页 | `pages/service-template-select/service-template-select` | `GET /service-templates` + `POST /service-read-confirmations` + `GET /service-read-confirmations` + `POST /customers/:id/service-items` | ✅ 联调通过 |
| 人员配置页 | `pages/staff-config/staff-config` | `GET /users?roleCode=X` + `GET /customers/:id/staff-assignment` + `PUT /customers/:id/staff-assignment` | ✅ 联调通过 |
| 办件列表页 | `pages/workorder-list/workorder-list` | `GET /work-orders` | ✅ 联调通过 |
| 创建办件页 | `pages/workorder-create/workorder-create` | `POST /work-orders` | ✅ 联调通过 |
| 办件详情页 | `pages/workorder-detail/workorder-detail` | `GET /work-orders/:id` + `PATCH /work-orders/:id` + `POST /work-orders/:id/check-in` | ✅ 联调通过 |
| 收费详情页 | `pages/charge-detail/charge-detail` | `GET /charges/:id` + `PATCH /charges/:id` + `POST confirm/remind` + `GET reminders` | ✅ 联调通过 |
| 未收款列表 | `pages/charge-unpaid-list/charge-unpaid-list` | `GET /charges?chargeStatus=未收` | ✅ 联调通过 |
| 托管入档详情 | `pages/tenant-detail/tenant-detail` | `GET /tenant-registers/:id` + `PATCH` + `POST confirm-plan/assign-accountant/confirm-assignment` | ✅ 联调通过 |
| 任务列表页 | `pages/task-list/task-list` | `GET /tasks` | ✅ 联调通过 |
| 任务详情页 | `pages/task-detail/task-detail` | `GET /tasks/:id` + `PATCH` + `POST confirm/complete` | ✅ 联调通过 |
| 任务创建页 | `pages/task-create/task-create` | `POST /tasks` | ✅ 联调通过 |
| 裂变列表页 | `pages/fission-list/fission-list` | `GET /fission-leads` | ✅ 联调通过 |
| 裂变详情页 | `pages/fission-detail/fission-detail` | `GET /fission-leads/:id` + `PATCH` + `POST confirm/archive/mark-invalid` | ✅ 联调通过 |
| 裂变创建页 | `pages/fission-create/fission-create` | `POST /fission-leads` | ✅ 联调通过 |
| 经营看板 | `pages/manual-business/manual-business` | `GET/POST/PATCH /manual-dashboard/business-reports` + summary | ✅ 联调通过 |
| 工资看板 | `pages/manual-salary/manual-salary` | `GET/POST/PATCH /manual-dashboard/salary-reports` + summary | ✅ 联调通过 |
| 数据看板 | `pages/dashboard/dashboard` | `GET /dashboard/overview` + customers/services/tasks/charges | ✅ 联调通过 |

## 已联调接口

| 接口 | 状态 |
|---|---|
| `POST /auth/login` | ✅ 通过 |
| `GET /auth/me` | 未测（前端目前未使用） |
| `POST /customers` | ✅ 通过 |
| `GET /customers` | ✅ 通过 |
| `GET /customers/:id` | ✅ 通过 |
| `PATCH /customers/:id` | ✅ 通过 |
| `GET /service-templates` | ✅ 联调通过 |
| `GET /service-templates/:id` | ✅ 联调通过 |
| `POST /service-read-confirmations` | ✅ 联调通过 |
| `GET /service-read-confirmations` | ✅ 联调通过 |
| `POST /customers/:customerId/service-items` | ✅ 联调通过 |
| `GET /customers/:customerId/service-items` | ✅ 联调通过 |
| `GET /users?roleCode=X` | ✅ 联调通过 |
| `GET /customers/:customerId/staff-assignment` | ✅ 联调通过 |
| `PUT /customers/:customerId/staff-assignment` | ✅ 联调通过 |
| `GET /work-orders` | ✅ 联调通过 |
| `POST /work-orders` | ✅ 联调通过 |
| `GET /work-orders/:id` | ✅ 联调通过 |
| `PATCH /work-orders/:id` | ✅ 联调通过 |
| `POST /files/upload` | ✅ 联调通过 |
| `POST /work-orders/:id/check-in` | ✅ 联调通过 |
| `GET /charges` | ✅ 联调通过 |
| `GET /charges/:id` | ✅ 联调通过 |
| `POST /charges` | ✅ 联调通过 |
| `PATCH /charges/:id` | ✅ 联调通过 |
| `POST /charges/:id/confirm` | ✅ 联调通过 |
| `POST /charges/:id/remind` | ✅ 联调通过 |
| `GET /charges/:id/reminders` | ✅ 联调通过 |
| `POST /tenant-registers` | ✅ 联调通过 |
| `GET /tenant-registers/:id` | ✅ 联调通过 |
| `GET /tenant-registers?customerId=X` | ✅ 联调通过 |
| `PATCH /tenant-registers/:id` | ✅ 联调通过 |
| `POST /tenant-registers/:id/confirm-plan` | ✅ 联调通过 |
| `POST /tenant-registers/:id/assign-accountant` | ✅ 联调通过 |
| `POST /tenant-registers/:id/confirm-assignment` | ✅ 联调通过 |
| `GET /tasks` | ✅ 联调通过 |
| `GET /tasks/:id` | ✅ 联调通过 |
| `POST /tasks` | ✅ 联调通过 |
| `PATCH /tasks/:id` | ✅ 联调通过 |
| `POST /tasks/:id/confirm` | ✅ 联调通过 |
| `POST /tasks/:id/complete` | ✅ 联调通过 |
| `GET /fission-leads` | ✅ 联调通过 |
| `GET /fission-leads/:id` | ✅ 联调通过 |
| `POST /fission-leads` | ✅ 联调通过 |
| `PATCH /fission-leads/:id` | ✅ 联调通过 |
| `POST /fission-leads/:id/confirm` | ✅ 联调通过 |
| `POST /fission-leads/:id/archive` | ✅ 联调通过 |
| `POST /fission-leads/:id/mark-invalid` | ✅ 联调通过 |
| `POST /manual-dashboard/business-reports` | ✅ 联调通过 |
| `GET /manual-dashboard/business-reports` | ✅ 联调通过 |
| `GET /manual-dashboard/business-reports/summary` | ✅ 联调通过 |
| `PATCH /manual-dashboard/business-reports/:id` | ✅ 联调通过 |
| `POST /manual-dashboard/salary-reports` | ✅ 联调通过 |
| `GET /manual-dashboard/salary-reports` | ✅ 联调通过 |
| `GET /manual-dashboard/salary-reports/summary` | ✅ 联调通过 |
| `PATCH /manual-dashboard/salary-reports/:id` | ✅ 联调通过 |
| `GET /dashboard/overview` | ✅ 联调通过 |
| `GET /dashboard/customers` | ✅ 联调通过 |
| `GET /dashboard/services` | ✅ 联调通过 |
| `GET /dashboard/tasks` | ✅ 联调通过 |
| `GET /dashboard/charges` | ✅ 联调通过 |
| `POST /files/upload` | ✅ 联调通过（Phase 3 A-2 专项验收 + Phase 7 复用） |
| 其余 0 个接口 | 🎉 60/60 业务接口全部联调完成 |

## 请求封装状态

| 项 | 值 |
|---|---|
| 封装文件 | `src/utils/request.js` |
| 导出方法 | `get` / `post` / `patch` / `put`；状态码覆盖 200/201/400/401/403/409/500 |
| BASE_URL | `src/config/index.js` |
| token 存储 | Pinia store + `uni.setStorageSync('accessToken')` |
| user 存储 | Pinia store + `uni.setStorageSync('user')`（JSON 字符串） |
| Authorization | 自动带 `Bearer <token>`（login 用 skipAuth 跳过） |
| 401 处理 | skipAuth 分流：认证类弹 message / 业务类清登录态+跳登录 |
| 403 处理 | toast "无权限" |
| 超时 | 15000ms |

## 当前问题

- BASE_URL 是局域网 IP，网络环境变化时需重新获取
- 微信小程序端未完整测试（H5 已验证配色和玻璃拟态效果，小程序 backdrop-filter 不生效）
- 小程序中玻璃拟态卡片无模糊效果（backdrop-filter 不支持），降级为半透明白色实底
- 登录页配色暂维持原暖色系独立硬编码，未跟随钛银迁移
- 已知限制 2 项（P1）：staff-assignment 404 toast 副作用 / MP 条件编译未实测

## 技术决策

- 配色方案：钛银底色 `#c9c6c5` + 香槟金品牌色 `#C9A84C` + 玻璃拟态卡片（半透明白 + backdrop-filter blur），依据 `COLOR_SCHEME.md`
- 全局 CSS 变量统一管理（`App.vue` / `tokens.scss` / `uni.scss`），所有页面组件通过 `var(--jc-color-*)` 引用
- 小程序端 backdrop-filter 不兼容，卡片降级为半透明实底（rgba 值），H5 端保留完整玻璃拟态效果

## 下一步计划

1. 小程序端完整回归测试（所有页面 + 所有角色）
2. 登录页配色统一（当前为独立暖色硬编码）
3. 微信小程序提交审核发布
4. 后端部署至云服务器

## 开发日志

### 2026-07-17
- 全项目配色迁移完成：暖色奶油系 → 钛银 + 香槟金暗色主题
- 依据 `COLOR_SCHEME.md`（深色钛金 + 香槟金规范），转译为小程序可用的 CSS 变量体系
- 核心改动：`App.vue` 20 个 --jc-color-* 变量 + `tokens.scss` 全部 SCSS 变量 + `uni.scss` 兼容映射
- 30 个文件批量替换：所有硬编码 hex/rgba 色值 → CSS 变量引用，无业务逻辑修改
- 玻璃拟态卡片：`rgba(255,255,255,0.55)` 半透明 + `backdrop-filter: blur(20px)`（H5 生效，小程序降级为实底）
- hero-panel 渐变更新：`linear-gradient(135deg, #d5d3d2, #e6e4e3)`
- 状态 chip 色迁移：浅色实底 → 暗色半透明（rgba 12%/25%）
- 阴影体系迁移：浅暖影 → 纯黑影（card 0.08 / elevated 0.12）
- pages.json 导航栏背景同步：`#fff8f3` → `#c9c6c5`
- JcInput 输入框背景：`var(--jc-color-surface)` → `rgba(255,255,255,0.35)`
- 登录页还原为 git 原始版本（CSS 变量引用），卡片设透明融入背景
- `npm run build:mp-weixin` 编译通过；H5 dev server 正常运行
- 30 文件 365+/360- 行，commit `903a023`，已 push origin/main

### 2026-06-26
- New Front 视觉转译 Batch 1.6 完成：login 登录页展示层升级
- 登录页转为 Executive Minimalist 品牌入口：JUNCAI TAX 顶部品牌区、Secure Access 登录卡片、下划线输入、深蓝主按钮、弱化系统 token 提示
- 严格保留登录业务逻辑：`POST /auth/login`、`skipAuth: true`、`userStore.setLoginInfo`、登录成功 `reLaunch('/pages/customer-list/customer-list')` 均未修改
- `npm run build:mp-weixin` 编译通过；`git diff --check` 通过；未发现 `#007aff` / `console.log` / 中文状态 class / `linear-gradient`
- New Front 视觉转译 Batch 1.5 完成：customer-form / customer-edit 两个客户表单页展示层升级
- 参考 `stitch_unified_frontend_design_system 2/_3` 编辑客户静态稿，转译为小程序可用结构：顶部说明区、Business Details / Financials & Status / Tax Profile 三段式卡片、下划线输入、固定底部主操作栏
- 严格保留 API_CONTRACT 约束：customer-form 仍只向 `POST /customers` 发送真实客户字段，不传 `ownerId` / `lifecycleStage`；customer-edit 仍保留 PATCH diff，只传改动字段且不传空字段
- 未引入静态稿中的虚构字段（统一社会信用代码、法人、电话、地址等），避免发明接口字段
- `npm run build:mp-weixin` 编译通过；`git diff --check` 通过；未发现 `#007aff` / `console.log` / 中文状态 class / `linear-gradient`
- New Front 视觉转译 Batch 1 完成：customer-list / workorder-list / charge-unpaid-list / task-list / fission-list 共 5 个列表页展示层升级
- 参考 `/Users/Zhuanz/Desktop/new front` 中 Stitch `Executive Minimalist` 设计稿，转译为 uni-app/WXSS 可编译结构：深蓝标题、白底描边卡片、信息网格、状态 chip、轻量操作入口
- 保持 API_CONTRACT 铁律：未修改接口路径、请求参数、request.js、store、pages.json、POST/PATCH body、状态流转逻辑、权限判断
- `customer-list` 保留 `GET /customers`、新增客户跳转、详情跳转；新增的金额/行业/状态 class 仅为展示格式化
- `task-list` 保留原有状态筛选和主管/管理员创建任务入口；修正客户展示为纯 UI 文案函数，不改变请求逻辑
- `npm run build:mp-weixin` 编译通过；`git diff --check` 通过；未发现 `#007aff` / `console.log` / 中文状态 class / `linear-gradient`
- 待微信开发者工具导入 `dist/build/mp-weixin` 截图验收真实观感

### 2026-06-13
- 全项目 23 页 UI 产品化优化完成（Batch 0-C + 二次改造 + 返工 + WXSS 修复），累计 23 文件 +604/-763 行
- home.vue V1 样板多轮 Impeccable 迭代：极简身份行 + 主卡 + 次入口 + 模块列表
- WXSS 中文 class 全部清除，#007aff 全部替换为 #1D4ED8
- sed CSS 嵌套修复（6 表单页 form-section-label 注入）
- Phase 9 Dashboard 自动看板编码完成（dashboard/dashboard.vue）
- Dashboard 5 区块独立 loading/error，safeNumber/formatMoney/formatObj 兜底
- Phase 9 联调通过 ✅ 5/5 PASS，P0=0
- 总务正确拦截（403），主管/管理员正常访问
- pages.json 注册 1 个新路由，共计 23 条路由
- 🎉 Phase 1-9 + Workbench + Notifications 全部 60/60 业务接口联调完成
- Phase 8 手动经营/工资看板整体编码完成（manual-business + manual-salary）
- ManualDashboard 全量联调通过 ✅ 8/8 PASS，P0=0
- profitAmount/totalAmount 零提交；金额字段均为 number；month 格式校验通过
- pages.json 注册 2 个新路由，共计 22 条路由
- Phase 1-8 累计 49/60 业务接口联调完成
- Phase 7 业务裂变整体编码完成（fission-list + fission-detail + fission-create）
- fission-detail 支持 view/edit + confirm/archive/mark-invalid + archiveFiles 上传
- Fission 全量联调通过 ✅ 7/7 PASS，P0=0
- 字段确认：initiatedBy/confirmer/archiver 路径全部正确命中
- P1-1 修复：PATCH 不传 null（sourceCustomerId/assigneeId/price）
- pages.json 注册 3 个新路由，共计 20 条路由
- Phase 1-7 全部 48 接口（历史）联调完成
- Phase 6 任务流转整体编码完成（task-list + task-detail + task-create）
- task-detail 支持 view/edit 双模式 + confirm/complete 操作 + onShow 刷新
- Task 全量联调通过 ✅ 6/6 PASS，P0=0
- 字段修复：confirmer/completer 路径对齐后端实际返回
- pages.json 注册 3 个新路由，共计 17 条路由
- Phase 1-6 全部 41 接口联调完成

### 2026-06-12
- Phase 5 托管入档整体编码完成（tenant-detail + customer-detail 第5次增量）
- tenant-detail 支持 view/create/edit 三模式 + confirm-plan/assign-accountant/confirm-assignment
- TenantRegister 全量联调通过 ✅ 7/7 PASS，P0=0
- 后端确认：enterpriseDetail/servicePlan(Json) / customer嵌套 / assignedAccountant嵌套 全部正确
- pages.json 注册 1 个新路由，共计 14 条路由

### 2026-06-11
- Phase 4 收费管控整体编码完成（charge-detail + charge-unpaid-list + customer-detail 收费卡片）
- charge-detail 支持 view/edit/create 三模式 + 催收弹窗 + 确认已收
- 联调前修复 ×2：B1(edit按钮saving) / S2(remindersLoading死代码)
- Charge 全量联调通过 ✅ 7/7 接口 PASS，P0=0
- 权限验证：总务/管理员 confirm+remind+PATCH ✅；业务/会计/主管 403 ✅
- pages.json 注册 2 个新路由，共计 13 条路由
- customer-detail 第 4 次增量（收费摘要卡片）

### 2026-06-10
- P1 遗留修复 ×3：staff-config loadError→error / workorder-create 过时注释清理 / workorder-detail 打卡子视图关闭按钮
- 第二阶段+第三阶段统一联调完成 ✅ 15/15 接口全部 PASS
- 上传链路端到端验证通过（multipart upload → check-in）
- 多角色权限验证通过（业务/会计/总务/管理员 RBAC 正确生效）
- 全链路 12 步骤走通（客户→服务→人员→办件→流转→打卡）
- P0 确认：POST service-items 三种场景全部 201 / 状态流转规则确认（含回退）
- 第三阶段整体编码完成（办件列表 + 创建办件 + 办件详情 + 状态流转 + 办结打卡）
- customer-detail.vue 第三次增量改动（服务项卡片"创建办件"入口）
- 联调前修复 ×4：409 分支 / uploadFile statusCode 校验 / 防重复提交 / Promise.all 容错
- 前端自验收通过：6 页面 88 项 + 11 链路 + 15 异常场景全部 PASS
- pages.json 注册 3 个新路由，共计 11 条路由

### 2026-06-09
- 死代码清理：移除服务模板选择页中 detailLoading/detailError 及相关模板节点
- 第二阶段整体编码完成 🔶
- 新增：服务模板选择页（模板列表 + 详情 + 已读确认 + 创建服务项）
- 新增：人员配置页（业务/会计/总务下拉 + PUT 保存）
- 增强：客户详情页（服务项卡片 + 人员配置摘要卡片 + 服务配置/配置人员按钮）
- request.js 新增 put 方法
- pages.json 注册 2 个新路由（扁平风格）
- 客户编辑页联调通过 ✅
- 客户管理模块闭环完成（POST + GET + GET/:id + PATCH）
- docs 文档库建立

### 2026-06-08
- 客户填单页联调通过（POST /customers）
- 客户列表页联调通过（GET /customers）
- 客户详情页联调通过（GET /customers/:id）
- API_CONTRACT.md 更新至 v2（41 个接口）
- CLAUDE.md 更新至 v2

### 2026-06-06
- 登录模块联调通过
- 修复 401 误报"登录已过期"bug

### 2026-06-05
- 第 3 步：登录页 + customer-list 占位页完成

### 2026-06-04
- 第 0-2 步：环境检查 + 项目骨架 + Pinia/Config/Store/Request 基础搭建
