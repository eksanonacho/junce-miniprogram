# 君册财税小程序前端交接手册 FRONTEND_HANDOFF

> **给谁看**：前端开发同学。
> **解决什么**：不用看后端代码，拿着这份手册就能独立开发全部第一期前端页面。
> 最后更新：2026-06-12。覆盖完整第一期前端范围（全部模块后端已就绪，55 个业务接口 + 1 个健康检查）。后端已 Docker 化部署，本地 Docker 演练通过。

---

## 1. 项目定位

这是给**青岛君册财税**开发的内部管理小程序（OA + 轻量 CRM + 任务流转）。
终端：微信小程序 + H5（uni-app Vue3）。

**用户是谁**：财税公司内部员工——商务/业务/会计/主管/总务/管理员。
**一期目标**：让整条客户管理流程在手机端跑通。

### 前端同学拿到这个文档后

1. 看第四节"当前完成情况"——知道哪些做完了、哪些没做
2. 按第五节"施工顺序"从第一阶段开始，逐个做未完成页面
3. 每做一个页面，打开第五节对应章节看——接口、字段、交互全写清楚了
4. 不需要再等主理人告诉你"下一步做什么"——文档里施工顺序就是路线图
5. 做完一页更新第四节状态表，主理人验收

---

## 2. 当前后端接口状态

> 接口总数：**56 个**（55 个业务接口 + 1 个健康检查），全部 curl 验证通过，Docker 部署已验证。
> 完整文档：`docs/API_CONTRACT.md`

| 模块 | 接口数 | 后端状态 | 前端页面 |
|------|--------|---------|---------|
| Health 健康检查 | 1 | ✅ | （基础设施，前端无页面） |
| Auth 登录 | 3 | ✅ | 登录页 🔄 |
| Customers 客户 | 4 | ✅ | 填单页 🔄 / 列表 🔄 / 详情 ⬜ / 编辑 ⬜ |
| ServiceTemplates 服务模板 | 2 | ✅ | ⬜ |
| ReadConfirmations 已读确认 | 2 | ✅ | ⬜ |
| ServiceItems 服务项 | 3 | ✅ | ⬜ |
| StaffAssignments 人员配置 | 2 | ✅ | ⬜ |
| Users 用户查询 | 1 | ✅ | ⬜（下拉数据源） |
| WorkOrders 办件 | 5 | ✅ | ⬜ |
| Charges 收费管控 | 7 | ✅ | ⬜ |
| TenantRegisters 托管入档 | 7 | ✅ | ⬜ |
| Tasks 任务 | 6 | ✅ | ⬜ |
| Fission 业务裂变 | 7 | ✅ | ⬜ |
| Dashboard 看板 | 5 | ✅ | ⬜ |
| Files 文件上传 | 1 | ✅ | ⬜ |
| ManualDashboard 手动看板 | 8 | ✅ | ⬜ |
| **总计** | **56** | | |

> 状态：✅ 已完成 / 🔄 进行中 / ⬜ 待开发

### TabBar 导航设计（待前端实现）

小程序底部 TabBar：

| Tab | 页面路由 | 哪些角色可见 |
|-----|---------|------------|
| 客户 | `/pages/customer/list` | 所有人 |
| 办件 | `/pages/workorder/list` | 所有人 |
| 任务 | `/pages/task/list` | 所有人 |
| 看板 | `/pages/dashboard/index` | 主管/总务/管理员 |
| 我的 | `/pages/mine/index` | 所有人（/auth/me 查当前用户信息） |

> 注意：不同角色登录后看到的"我的"页内容不同——商务显示"我的客户"，业务显示"我的办件"，会计显示"我的任务"。

### 角色首页路由

登录成功后根据 `GET /auth/me` 返回的 `roleCode` 跳转：
- 商务 → 客户列表页
- 业务 → 办件列表页
- 会计 → 任务列表页
- 主管 → 任务列表页
- 总务 → 客户列表页（带未收款角标）
- 管理员 → 客户列表页

---

## 3. 前端开发总原则

1. **不改后端**。接口、字段、枚举都以 `docs/API_CONTRACT.md` 为准。
2. **不碰数据库**。所有数据通过接口读写，不直接操作 PostgreSQL。
3. **不发明接口字段**。请求参数和返回字段严格按 API_CONTRACT 来。
4. **枚举值一字不差**。`tier` 传 `"VIP"` 不是 `"vip"`，`customerCategory` 传 `"新用户"` 不是 `"new"`。
5. **BASE_URL 集中配置**。一个变量控制，方便切换本机/联调/上线地址。
6. **token 自动带 Authorization**。封装 `uni.request`，请求拦截器自动加 `Bearer <token>`。
7. **401 跳登录**。响应拦截器遇到 401 自动清 token、跳回登录页。
8. **一个小页面一个路由**。不要把所有功能塞一个页面。
9. **报错先贴完整原文再分析**。
10. **每完成一页更新 PROJECT_STATUS.md**（如果有的话）告知进度。

---

## 4. 页面开发阶段规划

### 第一阶段：客户管理闭环（当前批次）

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 登录页 | `/pages/auth/login` | `POST /auth/login` | 所有人 | 🔄 已联调 |
| 客户填单页 | `/pages/customer/form` | `POST /customers` | 商务 | 🔄 已联调 |
| 客户列表页 | `/pages/customer/list` | `GET /customers` | 所有人 | 🔄 已联调 MVP |
| 客户详情页 | `/pages/customer/detail` | `GET /customers/:id` | 所有人 | ⬜ |
| 客户编辑页 | `/pages/customer/edit` | `PATCH /customers/:id` | 商务 | ⬜ |

### 第二阶段：客户业务配置

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 服务模板弹窗/选择页 | `/pages/customer/service-select` | `GET /service-templates`+`GET /service-templates/:id`+`POST /service-read-confirmations`+`GET /service-read-confirmations` | 所有人 | ⬜ |
| 服务模板弹窗-判断已读 | 嵌入选择页 | `GET /service-read-confirmations?customerId=&templateId=` | 所有人 | ⬜ |
| 服务项展示页 | 嵌入客户详情 | `GET /customers/:id/service-items` | 所有人 | ⬜ |
| 人员配置页 | `/pages/customer/staff-config` | `PUT/GET /customers/:id/staff-assignment`+`GET /users?roleCode=X` | 商务/主管 | ⬜ |

### 第三阶段：办件流转

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 办件列表页 | `/pages/workorder/list` | `GET /work-orders` | 所有人 | ⬜ |
| 办件详情页 | `/pages/workorder/detail` | `GET /work-orders/:id` | 所有人 | ⬜ |
| 创建办件页 | `/pages/workorder/create` | `POST /work-orders` | 所有人 | ⬜ |
| 办件状态更新 | 嵌入详情页 | `PATCH /work-orders/:id` | 业务 | ⬜ |
| 办结打卡页 | `/pages/workorder/checkin` | `POST /work-orders/:id/check-in`+归档材料录入 | 业务 | ⬜ |

### 第四阶段：收费管控

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| **未收款列表（总务）** | `/pages/charge/unpaid-list` | `GET /charges?chargeStatus=未收` | **总务+管理员** | ⬜ |
| 客户详情-收费摘要卡片 | 嵌入 customer-detail | `GET /charges?customerId=xxx` | 所有人可查 | ⬜ |
| 客户收费详情页 | `/pages/charge/detail` | `GET /charges/:id` | 所有人可查 | ⬜ |
| 收费录入/编辑 | 嵌入详情 | `POST/PATCH /charges` | 商务(创建)+总务(PATCH) | ⬜ |
| 总务确认已收 | 嵌入详情 | `POST /charges/:id/confirm` | **总务+管理员** | ⬜ |
| 发起催收 | 嵌入详情 | `POST /charges/:id/remind` | **总务+管理员** | ⬜ |
| 催收记录 | `/pages/charge/reminders` | `GET /charges/:id/reminders` | 所有人 | ⬜ |

### 第五阶段：代理户托管入档

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 托管入档列表 | 嵌入客户详情 | `GET /tenant-registers?customerId=X` | 所有人 | ⬜ |
| 托管入档详情 | `/pages/tenant/detail` | `GET /tenant-registers/:id` | 所有人 | ⬜ |
| 创建托管入档 | `/pages/tenant/create` | `POST /tenant-registers` | 会计/主管/管理员 | ⬜ |
| 更新概况/方案 | 嵌入详情 | `PATCH /tenant-registers/:id` | 会计/主管/管理员 | ⬜ |
| 主理人确认方案 | 嵌入详情 | `POST /tenant-registers/:id/confirm-plan` | 所有人 | ⬜ |
| 主管分派会计 | 嵌入详情 | `POST /tenant-registers/:id/assign-accountant` | **主管+管理员** | ⬜ |
| 会计确认分派 | 嵌入详情 | `POST /tenant-registers/:id/confirm-assignment` | 会计(须本人)/管理员 | ⬜ |

### 第六阶段：任务流转

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 任务列表页 | `/pages/task/list` | `GET /tasks` | 所有人 | ⬜ |
| 任务详情页 | `/pages/task/detail` | `GET /tasks/:id` | 所有人 | ⬜ |
| 主管创建任务 | `/pages/task/create` | `POST /tasks` | **主管+管理员** | ⬜ |
| 确认/完成任务 | 嵌入详情 | `POST /tasks/:id/confirm` `POST /tasks/:id/complete` | toUserId 本人/管理员 | ⬜ |

### 第七阶段：业务裂变

> ⚠️ @Roles: PATCH/confirm/archive/mark-invalid 限主管+管理员。

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 裂变填单页 | `/pages/fission/create` | `POST /fission-leads` | 所有人 | ⬜ |
| 裂变列表 | `/pages/fission/list` | `GET /fission-leads` | 所有人 | ⬜ |
| 裂变详情/确认 | `/pages/fission/detail` | `GET /fission-leads/:id`+`POST confirm/archive/mark-invalid` | 主管+管理员 | ⬜ |
| 办结凭证归档 | 嵌入详情 | `POST /fission-leads/:id/archive` | 主管+管理员 | ⬜ |

**业务规则**（来自需求文档）：
- 代理户裂变，由分派会计/主管向主理人填单（简化模板，含价格、含业务指派人）
- 相关人员确认后 → 协办后反馈、上传办结凭证归档
- **不做群协同**（客户手动建群）

### 第八阶段：手动经营/工资看板

> ⚠️ 金额敏感，权限限总务+管理员。前端不传 profitAmount/totalAmount。

| 页面 | 路径建议 | 接口 | 角色 | 状态 |
|------|---------|------|------|------|
| 经营录入页 | `/pages/manual-dashboard/business` | `POST/PATCH /manual-dashboard/business-reports` | 总务+管理员 | ⬜ |
| 经营汇总 | 嵌入页面 | `GET /manual-dashboard/business-reports/summary` | 主管+总务+管理员 | ⬜ |
| 工资录入页 | `/pages/manual-dashboard/salary` | `POST/PATCH /manual-dashboard/salary-reports` | 总务+管理员 | ⬜ |
| 工资汇总 | 嵌入页面 | `GET /manual-dashboard/salary-reports/summary` | 主管+总务+管理员 | ⬜ |

**前端注意事项**：
- 经营只传 `month/revenueAmount/costAmount/note`，**不传 profitAmount**
- 工资只传 `month/userId/baseSalary/commission/bonus/deduction/socialInsurance/note`，**不传 totalAmount**
- month 用 YYYY-MM 选择器（如 2026-06）
- 金额输入空值按 0，最终以后端返回为准
- summary 金额只展示，不在前端二次计算
- 403 弹"权限不足"，不要跳登录

### 第九阶段：看板（待后端接口）

> ⚠️ 后端接口尚未开发。

| 页面 | 备注 | 状态 |
|------|------|------|
| 服务看板 | 服务相关统计，自动统计 | ⬜ 等接口 |
| 老板看板 | 全局经营概览，自动统计 | ⬜ 等接口 |
| 客户看板 | 客户数据统计，自动统计 | ⬜ 等接口 |
| 经营看板 | 收入/成本/利润，手动录入+自动汇总 | ⬜ 等接口 |
| 工资看板 | 员工薪资汇总，手动录入+自动汇总 | ⬜ 等接口 |

---

## 5. 关键业务规则（前端必须知道）

| 规则 | 说明 |
|------|------|
| **金额字段** | 传数字，最多 2 位小数（如 `50000.00`），不要传字符串 |
| **ownerId 不要传** | 新建客户时后端自动取当前登录用户 |
| **枚举值** | 全部用中文，见 API_CONTRACT 枚举表，一字不差 |
| **角色权限** | 部分接口限特定角色（@Roles），403 表示没权限 |
| **重复创建** | 返回 409，响应含 `existingXxx` 字段，可提示用户 |
| **催收 toUserId** | 可选，不传默认客户主理人 |
| **打卡必须带 archiveFiles** | 空数组返回 400 |
| **托管入档仅代理户** | 非代理户创建返回 400 |
| **GET /auth/me 查当前用户** | 每次登录后调用，拿到 `roleCode`/`roleName`，前端根据角色决定显示哪些按钮、跳哪个首页 |
| **403 = 藏按钮，不是点完报错** | 如果接口限"总务+管理员"，前端根据当前用户 roleCode 判断——不是总务/管理员就隐藏"确认已收""发起催收""创建任务"等按钮，不要等点了才弹 403 |
| **401 = 清 token 跳登录** | 任何接口返回 401 → 清 Pinia store → 清本地 token → 跳 `/pages/auth/login` |
| **409 = 已存在，用 existingXxx** | 取返回的 `existingXxx` 字段展示具体信息，如"该服务项已有办件(状态：已打卡)" |
| **curl 测试加 --noproxy** | 本机有代理，不加会 502 |

---

## 6. 环境和工具

| 项 | 值 |
|------|------|
| **联调 BASE_URL** | `http://172.20.10.5:3000`（动态 IP，变了就问后端） |
| **本机测试** | `http://localhost:3000` |
| **登录接口** | `POST /auth/login` |
| **Token Header** | `Authorization: Bearer <token>` |
| **测试账号** | 6 个，密码统一 `123456`（shangwu/yewu/kuaiji/zhuguan/zongwu/admin） |

---

## 7. 旧版文档纠正

旧版 FRONTEND_HANDOFF（06-03）只覆盖客户管理 5 页，是因为当时后端只完成了 auth + customers。
**新版以当前 API_CONTRACT（06-10）为准，前端范围已扩展到完整第一期业务链路**——客户建档→服务选择→人员配置→办件流转→收费管控→托管入档→任务流→裂变→看板→手动看板。

当前后端已完成 55 个接口、15 张业务表，前端不必等后端，直接按 API_CONTRACT 开发即可。

---

## 8. 施工顺序（按这个做，做完一阶段验证一阶段）

```
第一阶段：客户闭环（先做完）
  ① 客户详情页（用 GET /customers/:id）
  ② 客户编辑页（用 PATCH /customers/:id）
  ③ TabBar 导航搭建（客户/办件/任务/看板/我的）
  ④ 登录后角色首页路由

第二阶段：客户业务配置
  ⑤ 服务模板弹窗+选择（用 GET /service-templates + POST /service-items）
  ⑥ 已读确认（用 POST /service-read-confirmations）
  ⑦ 人员配置页（用 GET /users + PUT staff-assignment）

第三阶段：办件流转
  ⑧ 办件列表页
  ⑨ 办件详情页
  ⑩ 创建办件
  ⑪ 办结打卡+归档材料录入

第四阶段：收费管控
  ⑫ 未收款列表页（总务首页可直达）
  ⑬ 收费详情+录入/编辑
  ⑭ 确认已收+催收按钮（藏显逻辑）

第五阶段：代理户托管入档
  ⑮ 托管入档详情+创建
  ⑯ 方案确认+会计分派+会计确认

第六阶段：任务流转
  ⑰ 任务列表+详情
  ⑱ 主管创建任务
  ⑲ 确认/完成任务

第七阶段：业务裂变
  ⑳ 裂变填单+列表+详情

第八阶段：手动经营/工资看板
  ㉑ 经营录入+汇总
  ㉒ 工资录入+汇总

第九阶段：自动看板
  ㉓ 5个看板展示页
```

**现在可以做的**：①–㉒（全部 55 个接口已就绪）
**仅自动看板展示页**：㉓（Dashboard 接口已就绪，前端图表展示待开发）

各阶段之间互不阻塞（除了五阶段依赖三阶段的办件完成），可以灵活排布。

---

> 📞 有问题随时在后端同学处同步。完整接口说明见 `docs/API_CONTRACT.md`。
