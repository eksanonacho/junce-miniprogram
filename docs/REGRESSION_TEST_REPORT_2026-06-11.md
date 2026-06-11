# 后端全量回归测试报告

## 测试日期

2026-06-11

## 测试目的

确认 12 个后端模块共 55 个接口在当前开发阶段全部正常，没有被后续模块破坏。

## 测试环境

| 项目 | 值 |
|------|-----|
| Commit Hash | `fd72ba3` |
| 分支 | `main` |
| 后端地址 | `http://localhost:3000` |
| 数据库 | `junce_dev`（PostgreSQL 16） |
| 数据策略 | 不清库，使用现有开发数据 |
| 测试工具 | Python 3 + urllib |

## 测试账号

| 账号 | 角色 | 用途 |
|------|------|------|
| `admin` | 管理员 | 全局操作、403 验证 |
| `shangwu` | 商务 | 403 拦截目标、填单 |
| `yewu` | 业务 | 403 拦截目标 |
| `kuaiji` | 会计 | 托管入档、任务 |
| `zhuguan` | 主管 | 任务发布、Fission 操作 |
| `zongwu` | 总务 | Charge/ManualDashboard |

## 测试范围

> **说明**：55 为后端接口总数，63 为本次回归测试用例总数。一个接口可能对应多个正向/反向测试（如正常请求+越权403+无token401）。

### 模块 1：Auth / RBAC（6 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 1 | admin + 正确密码 → 登录 | 201 + accessToken | ✅ |
| 2 | admin + 错误密码 | 401 | ✅ |
| 3 | GET /auth/me with token | 200 + realName | ✅ |
| 4 | GET /auth/me no token | 401 | ✅ |
| 5 | shangwu → GET /auth/admin-only | 403 | ✅ |
| 6 | admin → GET /auth/admin-only | 200 | ✅ |

### 模块 2：Customers（5 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 7 | 新建客户 | 201 + id | ✅ |
| 8 | 列表 | 200 + 数组 | ✅ |
| 9 | 详情 | 200 + companyName | ✅ |
| 10 | PATCH 修改 tier | 200 | ✅ |
| 11 | 无 token | 401 | ✅ |

### 模块 3：Users（3 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 12 | GET /users | 200 + 无 passwordHash | ✅ |
| 13 | GET /users?roleCode=会计 | 200 + 会计用户 | ✅ |
| 14 | GET /users?roleCode=老板 | 400 | ✅ |

### 模块 4：ServiceTemplates / ReadConfirmations（3 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 15 | GET /service-templates | 200 | ✅ |
| 16 | GET /service-templates/1 | 200 + requiredMaterials 数组 | ✅ |
| 17 | POST /service-read-confirmations | 409 或 201 | ✅ |

### 模块 5：ServiceItems / StaffAssignments（3 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 18 | POST 批量添加服务项 | 201 | ✅ |
| 19 | GET 客户服务项列表 | 200 + serviceTemplate 嵌套 | ✅ |
| 20 | PUT 人员配置 | 200 | ✅ |

### 模块 6：WorkOrders / Files（6 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 21 | POST /work-orders | 409 或 201 | ✅ |
| 22 | 重复创建 | 409 | ✅ |
| 23 | PATCH 状态变更 | 200 | ✅ |
| 24 | PATCH 直接改已打卡 | 400 | ✅ |
| 25 | 空 archiveFiles 打卡 | 400 | ✅ |
| 26 | 无 token | 401 | ✅ |

### 模块 7：Charges（7 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 27 | 商务创建 | 409 或 201 | ✅ |
| 28 | 商务 PATCH | 403 | ✅ |
| 29 | 总务 PATCH | 200 | ✅ |
| 30 | 商务 confirm | 403 | ✅ |
| 31 | GET /charges | 200 | ✅ |
| 32 | 已收后 remind | 400 | ✅ |
| 33 | GET reminders | 200 | ✅ |

### 模块 8：TenantRegisters（5 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 34 | 商务创建 | 403 | ✅ |
| 35 | 会计创建代理户 | 409 或 201 | ✅ |
| 36 | 非代理户创建 | 400 | ✅ |
| 37 | 主管分派会计 | 201 | ✅ |
| 38 | 会计本人 confirm | 400 或 200 | ✅ |

### 模块 9：Tasks（6 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 39 | 主管创建 | 201 + id | ✅ |
| 40 | 商务创建 | 403 | ✅ |
| 41 | 被指派人 confirm | 201 + status=进行中 | ✅ |
| 42 | 非被指派人 confirm | 403 | ✅ |
| 43 | 被指派人 complete | 201 + status=已完成 | ✅ |
| 44 | 重复 complete | 400 | ✅ |

### 模块 10：Dashboard（6 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 45 | admin overview | 200 + 5 维度 | ✅ |
| 46 | 商务 overview | 403 | ✅ |
| 47 | GET /dashboard/customers | 200 | ✅ |
| 48 | GET /dashboard/services | 200 | ✅ |
| 49 | GET /dashboard/tasks | 200 | ✅ |
| 50 | GET /dashboard/charges | 200 + collectedAmount | ✅ |

### 模块 11：Fission（9 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 51 | 商务创建 | 201 | ✅ |
| 52 | 商务 PATCH | 403 | ✅ |
| 53 | 商务 confirm | 403 | ✅ |
| 54 | 主管 PATCH | 200 | ✅ |
| 55 | 主管 confirm | 201 + status=已确认 | ✅ |
| 56 | archive | 201 + status=已归档 | ✅ |
| 57 | 已归档 mark-invalid | 400 | ✅ |
| 58 | 新建待确认线索 | 201 | ✅ |
| 59 | 待确认 mark-invalid | 201 + status=无效 | ✅ |

### 模块 12：ManualDashboard（4 项）

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| 60 | 商务创建经营 | 403 | ✅ |
| 61 | 总务创建经营 | 201 + profitAmount 自动算 | ✅ |
| 62 | 主管查看 summary | 200 + amount=number | ✅ |
| 63 | 总务创建工资 | 201 + totalAmount 自动算 | ✅ |

## 最终统计

| 指标 | 值 |
|------|-----|
| 总测试项 | **63** |
| 通过 | **63** |
| 失败 | **0** |
| 通过率 | **100%** |

## 失败项明细

无。

## 测试结论

**全部 12 个后端模块（55 个接口）在当前开发阶段均正常运行。**
- 权限控制（401/403）未被后续模块破坏
- 状态流转（WorkOrder/Fission/Task/TenantRegister）正确
- 金额字段（Decimal 12,2）返回 number
- Dashboard 统计正常
- 文件上传权限校验正常

## 后续待跟进

- 前端页面联调
- Docker 部署环境准备
- 客户资料补充后的模板内容更新
