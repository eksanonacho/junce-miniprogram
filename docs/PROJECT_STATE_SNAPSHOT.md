# PROJECT_STATE_SNAPSHOT.md — 项目当前快照

> **这个文件是给谁看的**:任何想快速知道"项目现在做到哪了"的人(或 AI)。
> **什么时候用**:换对话、换开发者、隔一段时间回来接手、向客户/同学汇报进度时。
> **解决什么问题**:像游戏存档一样,一眼看清当前进度、下一步、卡在哪。
>
> ⚠️ 这是**会过期**的文件。每完成一个阶段必须更新"快照时间"和各模块状态。

---

## 快照时间

**2026-06-13**

---

## 当前完成度(按模块)

| 模块 | 状态 |
|---|---|
| 环境(Node/pnpm/PostgreSQL/Colima) | ✅ 已完成 |
| 数据库(roles/users/customers) | ✅ 已完成 |
| Auth 登录(JWT) | ✅ 已完成 |
| RBAC 权限(双守卫) | ✅ 已完成 |
| Customers 客户模块(后端接口) | ✅ 已完成 |
| ServiceTemplates 服务模板 + 已读确认(后端接口) | ✅ 已完成 |
| ServiceItems + StaffAssignment(后端接口) | ✅ 已完成 |
| Users 查询接口 | ✅ 已完成 |
| WorkOrder 办件流转 / 办结打卡(含409优化) | ✅ 已完成 |
| Charge 费用管控 + 催收 | ✅ 已完成 |
| TenantRegister 托管入档 | ✅ 已完成 |
| Task 任务框架 | ✅ 已完成 |
| Dashboard 看板接口 | ✅ 已完成 |
| Files 文件上传 | ✅ 已完成 |
| Fission 业务裂变 | ✅ 已完成 |
| ManualDashboard 手动看板 | ✅ 已完成 |
| 前端(客户模块页面) | 🔄 进行中(同学开发) |
| AI 财税初诊系统 | ⏳ 等客户(九维度规则) |

> 状态图例:✅ 已完成 / 🔄 进行中 / ⬜ 未开始 / ⏳ 等客户补资料

### 全量回归测试
- **回归日期**：2026-06-11
- **测试范围**：12 个模块
- **测试结果**：63/63 通过（0 失败）
- **详细报告**：docs/REGRESSION_TEST_REPORT_2026-06-11.md
- **当前阶段**：后端封板，Docker 本地演练通过（node:22-alpine），可进入 staging 云部署准备
- **Docker 状态**：build ✅ / up ✅ / seed ✅ / 冒烟 21/21 ✅ / GET /health ✅
- **接口统计**：业务接口 55 个 + 基础设施接口 1 个（GET /health）

---

## 已完成并验证通过

### 数据库表
- roles(角色,枚举 RoleCode,6 个角色种子数据)
- users(用户,bcrypt 密码,绑定角色)
- customers(客户企业画像,金额 Decimal(12,2),ownerId 外键)
- _prisma_migrations(Prisma 系统表)
- 5 个枚举:RoleCode / CompanyType / CustomerCategory / CustomerTier / LifecycleStage

### 登录接口(已 curl 验证)
- POST /auth/login — 账号密码登录,返回 JWT + 用户信息
- GET /auth/me — token 查当前用户

### 权限接口(已 curl 验证)
- RBAC 双守卫:JwtAuthGuard(401)+ RolesGuard(403)
- @Roles() 装饰器
- GET /auth/admin-only — 权限验证示例接口

### service_templates + service_read_confirmations(已 curl 验证)
- service_templates(服务模板,15 个种子数据,JSON 字段 requiredMaterials/processSteps)
- service_read_confirmations(已读确认,user 外键,customer 外键,template 外键,唯一约束)
- GET /service-templates(list/detail,按 serviceType 筛选)
- GET /service-templates/:id(模板详情)
- POST /service-read-confirmations(userId 自动从 JWT 取,重复返回 409)
- GET /service-read-confirmations?customerId / templateId(查确认记录)

### customers CRUD(已 curl 验证)
- POST /customers — 新建(ownerId 自动取登录人,lifecycleStage 默认填单)
- GET /customers — 列表(支持 tier / lifecycleStage / keyword 筛选)
- GET /customers/:id — 详情
- PATCH /customers/:id — 修改

### service_items + staff_assignments(已 curl 验证)
- service_items(客户服务项,uk customerId+templateId,枚举 ItemStatus)
- staff_assignments(人员配置,uk customerId,4 个岗位 FK→users,含角色校验)
- POST/GET /customers/:customerId/service-items(批量添加/列表)
- PATCH /service-items/:id(只改 status)
- PUT/GET /customers/:customerId/staff-assignment(upsert+角色校验/查询)

### curl 验证结论
- Auth 6 项全部通过(正确登录 200、错密码 401、无 token 401、越权 403、管理员 200、/me 200)
- Customers 增删改查 + 筛选 + 搜索全部通过
- ServiceTemplates 8 项全部通过(模板列表、筛选、详情、提交确认、重复 409、查确认记录、无 token 401×2)
- ServiceItems + StaffAssignment 9 项全部通过(批量添加、重复去重、列表、状态修改、人员配置 upsert、角色校验 400、查询配置、无 token 401×2)

---

## 当前正在推进

- **前端同学**:用 uni-app 开发客户模块前端(登录页 + 填单 + 列表 + 详情 + 编辑),连后端联调。交接文档:FRONTEND_HANDOFF.md + API_CONTRACT.md。
- **后端(主理人)**:核心链路全部完成（填单→服务项→人员配置→办件→打卡→收费→托管→任务→看板→文件上传），下一步 Fission 裂变。

---

## 等待客户补充(阻塞项)

| 待补资料 | 阻塞什么 |
|---|---|
| 客户分层标准(VIP/优质/中低/零申报怎么界定) | 分层自动判断逻辑(目前手动选) |
| 第四步具体任务内容(任务1/2/3) | 任务模块的任务内容 |
| 完整角色权限表(各角色能看/改什么) | 细粒度数据权限(目前只做基础角色隔离) |
| AI 九维度检查规则 + 案例 + 品牌资料 | AI 初诊项目启动 |

---

## 下一步建议

1. **业务裂变 Fission** — 裂变填单 + 确认 + 归档，仅代理户
2. **经营/工资看板** — 手动录入 + 汇总展示

> 完整施工路线见 ROADMAP.md;风险见 RISK_ANALYSIS.md;整体背景见 PROJECT_CONTEXT.md。

---

## 已知技术坑(已解决)

| 坑 | 原因 | 解决方法 |
|---|---|---|
| Prisma 7 + NestJS ESM/CJS 冲突 | Prisma 生成 ESM,NestJS 跑 CJS,启动报 `exports is not defined` | schema.prisma 的 generator client 加 `moduleFormat = "cjs"`,清 dist+generated 后重新 generate+build。**这行别删。** |
| 端口被占用 EADDRINUSE :3000 | 旧后端进程没关干净 | `lsof -ti:3000 \| xargs kill -9` 杀掉再启 |
| localhost 502 Bad Gateway | 本机代理/VPN 劫持了 localhost 请求 | curl 加 `--noproxy "*"`,或代理软件绕过本地,或关 VPN |
| python json.tool 报 Expecting value | 多行 curl 被拆开粘贴,或返回非 JSON | 整条命令一起执行;去掉 `\| python3 -m json.tool` 看原始返回 |
| Decimal 默认精度 (65,30) | Prisma Decimal 默认 30 位小数,对钱无意义 | 金额统一改 Decimal(12,2),已写入 CLAUDE.md |
