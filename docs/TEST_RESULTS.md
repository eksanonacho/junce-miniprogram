# TEST_RESULTS.md — 测试结果记录

> 每个模块完成后记录 curl 测试结果。正向 + 反向全部通过才算验收。

---

## 2026-06-08 Task 任务框架

**测试日期**：2026-06-08(深夜)
**测试人**：Claude + 主理人验收

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 主管创建任务 | status=待确认, toUser=会计王五 | ✅ |
| ② | 商务创建任务 | 403 | ✅ |
| ③ | 非被指派人确认 | 403 | ✅ |
| ④ | 被指派人确认 | status=进行中, confirmer=会计王五 | ✅ |
| ⑤ | 被指派人完成 | status=已完成, completer=会计王五 | ✅ |
| ⑥ | 重复完成 | 400 | ✅ |
| ⑦ | PATCH 改 title 不改 status | title更新, status不变 | ✅ |
| ⑧ | 无 token | 401 | ✅ |

**结论**：8/8 全部通过 ✅

**踩坑**：
- `grep` 匹配中文 JSON 会因 `\uXXXX` 编码误报失败 → 改用 `python3 -c "assert..."` 做精确断言

---

## 2026-06-09 Dashboard 看板接口

**测试日期**：2026-06-09

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 管理员 overview | 5 维度全返回 | ✅ |
| ② | 主管 customers | byCategory/byTier/byStage | ✅ |
| ③ | services/tasks/charges | 统计数据正确 | ✅ |
| ④ | 商务 overview | 403 | ✅ |
| ⑤ | 无 token | 401 | ✅ |
| ⑥ | 金额字段 | number(不是 string) | ✅ |

**结论**：6/6 全部通过 ✅（0 新表，纯聚合查询）

---

## 2026-06-09 Files 文件上传

**测试日期**：2026-06-09

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 上传 PDF | {name,url,size,mimeType,uploadedAt} | ✅ |
| ② | 上传 PNG | 200 | ✅ |
| ③ | 无 token | 401 | ✅ |
| ④ | .exe | 400 扩展名拒绝 | ✅ |
| ⑤ | >10MB | 413 | ✅ |
| ⑥ | 静态 URL | 200 可访问 | ✅ |
| ⑦ | archiveFiles 兼容 | DTO 校验通过 | ✅ |

**结论**：7/7 全部通过 ✅（0 新表，multer 本地存储）

---

## 2026-06-08 TenantRegister 托管入档

**测试日期**：2026-06-08(晚)

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 商务创建 | 403 | ✅ |
| ② | 会计创建代理户 | status=初始, planOk=False | ✅ |
| ③ | 非代理户创建 | 400 | ✅ |
| ④ | 主管分派会计 | accountant=会计王五 | ✅ |
| ⑤ | 分派非会计用户 | 400 | ✅ |
| ⑥ | 商务 confirm-plan | planConfirmed=True | ✅ |
| ⑦ | 会计本人 confirm | assignConfirmed=True | ✅ |
| ⑧ | 业务岗 confirm | 403 | ✅ |
| ⑨ | 管理员代确认 | assignConfirmed=True | ✅ |
| ⑩ | 无 token | 401 | ✅ |
| ⑪ | PATCH 更新概况 | enterpriseDetail 已更新 | ✅ |

**结论**：11/11 全部通过 ✅

---

## 2026-06-08 Charge 费用管控

**测试日期**：2026-06-08

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 商务创建 charge | amount=50000, status=未收 | ✅ |
| ② | 商务 PATCH | 403 | ✅ |
| ③ | 商务 confirm | 403 | ✅ |
| ④ | 商务 remind | 403 | ✅ |
| ⑤ | 总务催收(默认主理人) | from=总务钱七 to=商务张三 | ✅ |
| ⑥ | 总务确认已收 | status=已收, confirmer=总务钱七 | ✅ |
| ⑦ | 已收后催收 | 400 | ✅ |
| ⑧ | 筛选 customerId+chargeStatus | 正确筛选 | ✅ |
| ⑨ | 管理员 confirm | confirmer=管理员周八 | ✅ |
| ⑩ | 无 token | 401 | ✅ |

**结论**：10/10 全部通过 ✅（首次 @Roles 实战）

---

## 2026-06-07 WorkOrder 409 优化 + 回归

| # | 测试项 | 结果 |
|---|--------|------|
| ①-⑭ | 全模块回归(WorkOrder/Auth/Customers/ServiceItems/StaffAssignments/Templates/Users) | 14/14 ✅ |

---

## 2026-06-06 WorkOrder 办件流转

| # | 测试项 | 预期 | 结果 |
|---|--------|------|------|
| ① | 创建办件 | status=待办 | ✅ |
| ② | 重复创建 | 409 | ✅ |
| ③ | 列表 | 含嵌套 | ✅ |
| ④ | 改办件中 | status=办件中 | ✅ |
| ⑤ | 办结+归档 | status=办结, completedAt有值 | ✅ |
| ⑥ | PATCH 已打卡 | 400 | ✅ |
| ⑦ | 打卡 | status=已打卡, checkedInAt有值 | ✅ |
| ⑧ | 空归档打卡 | 400 | ✅ |
| ⑨ | 无 token 创建 | 401 | ✅ |
| ⑩ | 无 token 查询 | 401 | ✅ |

**结论**：10/10 全部通过 ✅

---

## 2026-06-06 Users 查询接口

| # | 测试项 | 结果 |
|---|--------|------|
| ①-④ | 查全部/按角色筛选/无token→401/非法roleCode→400 | 4/4 ✅ |

---

## 2026-06-05 ServiceItems + StaffAssignment

| # | 测试项 | 结果 |
|---|--------|------|
| ①-⑨ | 批量添加/重复去重/列表/状态修改/人员upsert/角色校验/查配置/401×2 | 9/9 ✅ |

---

## 2026-06-05 ServiceTemplates + ReadConfirmation

| # | 测试项 | 结果 |
|---|--------|------|
| ①-⑧ | 模板列表/筛选/详情/确认/重复409/查记录/401×2 | 8/8 ✅ |

---

## 2026-06-03 Customers CRUD

| # | 测试项 | 结果 |
|---|--------|------|
| ①-⑧ | 新建/列表/筛选/搜索/详情/修改/401×2 | 8/8 ✅ |

---

## 2026-06-03 Auth + RBAC

| # | 测试项 | 结果 |
|---|--------|------|
| ①-⑥ | 登录/错密码→401/无token→401/越权→403/管理员→200//me→200 | 6/6 ✅ |

---

> 最后更新：2026-06-09

---

## 2026-06-13: Docker 环境冒烟测试（node:22-alpine）

### 测试环境
- 镜像：node:22-alpine，postgres:16-alpine，nginx:alpine
- 访问方式：nginx:80 反向代理 → server:3000
- docker-compose 安全版（仅 nginx 暴露端口）

### 冒烟测试 21/21 全部通过

| # | 接口 | 测试内容 | 预期 | 结果 |
|---|------|---------|------|------|
| 1 | GET /health | 健康检查 | 200 | ✅ |
| 2 | POST /auth/login | admin 登录 | 201 | ✅ |
| 3 | GET /auth/me | 查当前用户 | 200 | ✅ |
| 4 | POST /customers | 新建客户 | 201 | ✅ |
| 5 | GET /customers?keyword | 搜索 | 200 | ✅ |
| 6 | GET /customers/:id | 详情 | 200 | ✅ |
| 7 | GET /customers | 列表 | 200 | ✅ |
| 8 | GET /service-templates | 模板 | 200 | ✅ |
| 9 | GET /users?roleCode=会计 | 用户筛选 | 200 | ✅ |
| 10 | POST /charges | 创建收费 | 201 | ✅ |
| 11 | GET /charges?customerId | 查询 | 200 | ✅ |
| 12 | POST /charges/:id/confirm | 总务确认 | 201 | ✅ |
| 13 | GET /dashboard/overview | admin 看板 | 200 | ✅ |
| 14 | POST /tasks | 主管创建任务 | 201 | ✅ |
| 15 | GET /tasks | 任务列表 | 200 | ✅ |
| 16 | GET /auth/me (无token) | 未认证 | 401 | ✅ |
| 17 | POST /auth/login (错密码) | 错误凭证 | 401 | ✅ |
| 18 | PATCH /charges (商务) | 越权修改 | 403 | ✅ |
| 19 | POST confirm (商务) | 越权确认 | 403 | ✅ |
| 20 | GET /dashboard/overview (商务) | 越权查看 | 403 | ✅ |
| 21 | POST /tasks (商务) | 越权创建 | 403 | ✅ |

### 基础设施验证
- seed ✅（6 角色 + 6 测试账号 + 15 服务模板）
- migrate ✅（10 migrations, No pending）
- GET /health ✅
- nginx 反向代理 ✅
- 3000/5432 端口对外不可访问 ✅
