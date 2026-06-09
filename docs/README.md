# 君册财税 — 内部管理小程序

> 项目总览 / 入口文档。无论你是第一次接触本项目的开发者、接手维护的工程师、还是 AI agent，读这个文件就能快速掌握项目全貌。

---

## 一、项目是什么

**君册财税内部管理小程序**：为财税服务公司打造的员工协同工具。

核心场景：商务谈成客户 → 在小程序填单录入企业信息 + 选服务类型 + 指派人员 → 业务岗办件 → 打卡归档 → 代理户进入日常维护 → 主管发布任务、会计执行确认。

**终端**：微信小程序 + H5（uni-app 一套代码双端）。

**当前阶段**：第一期 MVP 后端开发中，前端同学同步开发客户模块页面。

---

## 二、技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | uni-app (Vue 3 + Vite + TypeScript) | 一套代码编译微信小程序 + H5 |
| 后端 | NestJS 11 (TypeScript) | 模块化后端框架 |
| 数据库 | PostgreSQL 16 | 本地开发免密连接，库名 `junce_dev` |
| ORM | Prisma 7 | Schema 定义 + Migration + 类型安全查询 |
| 认证 | JWT + bcryptjs | 7 天过期，token 含角色信息 |
| 权限 | RBAC 双守卫 | JwtAuthGuard (401) + RolesGuard (403) |
| 包管理 | pnpm 11 | 快速、省磁盘 |
| 容器 | Colima + Docker | 轻量容器运行时 |
| 部署 | Docker Compose | 与 AI 初诊项目共用服务器、容器隔离 |

---

## 三、项目结构

```
junce-miniprogram/
├── CLAUDE.md                    # AI 开发纪律 + 铁律 + 工作流
├── .docs                        # 开发日志（每步记录）
├── docs/                        # 项目文档（长期记忆层）
│   ├── README.md                # ← 你正在看的这个文件
│   ├── junce_requirements_v2.md # 需求规格（最高依据）
│   ├── PROJECT_CONTEXT.md       # 项目背景、客户情况、一期/二期边界
│   ├── PROJECT_STATE_SNAPSHOT.md# 当前进度快照
│   ├── ROADMAP.md               # 开发路线图
│   ├── API_CONTRACT.md          # 前后端接口契约
│   ├── DATABASE_GUIDE.md        # 数据库设计文档
│   ├── SYSTEM_ARCHITECTURE.md   # 系统架构
│   ├── TESTING_GUIDE.md         # 测试指南
│   ├── RISK_ANALYSIS.md         # 风险分析
│   ├── CTO_NOTES.md             # 技术负责人提醒
│   ├── FRONTEND_HANDOFF.md      # 前端交接说明
│   └── DEPLOYMENT_GUIDE.md      # 部署指南
├── client/                      # uni-app 前端
│   └── src/pages/               # 页面（前端同学负责）
├── server/                      # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma        # 数据库表定义
│   │   ├── seed.ts              # 种子数据
│   │   └── migrations/          # 迁移文件
│   └── src/
│       ├── main.ts              # 应用入口（CORS + ValidationPipe + 监听 0.0.0.0:3000）
│       ├── app.module.ts        # 根模块
│       ├── prisma/              # PrismaService（全局单例）
│       ├── auth/                # 登录 + JWT + RBAC 守卫
│       ├── customers/           # 客户填单/管理 CRUD
│       ├── service-templates/   # 服务模板 + 已读确认
│       ├── service-items/       # 客户服务项
│       ├── staff-assignments/   # 人员配置
│       ├── users/               # 用户查询
│       ├── work-orders/         # 办件流转/打卡
│       ├── charges/             # 费用管控+催收
│       └── tenant-registers/    # 托管入档(仅代理户)
```

---

## 四、已完成模块

| 模块 | 内容 | 状态 |
|------|------|------|
| **地基** | Node/pnpm/PG/Docker、项目骨架、git | ✅ |
| **数据库** | 11 张业务表 + 8 个枚举 | ✅ |
| **Auth** | JWT 登录、bcrypt 密码 | ✅ |
| **RBAC** | JwtAuthGuard + RolesGuard + @Roles() | ✅ |
| **Customers** | 客户 CRUD、筛选搜索、ownerId 自动注入 | ✅ |
| **ServiceTemplates** | 15 个服务模板、JSON 字段、已读确认 | ✅ |
| **ServiceItems** | 批量添加、唯一约束防重复、状态修改 | ✅ |
| **StaffAssignments** | 人员配置 upsert、角色校验 | ✅ |
| **WorkOrder** | 办件流转、状态机、办结打卡、归档必传、409+existingWorkOrder | ✅ |
| **Charge** | 收费记录、总务审核、催收、@Roles 实战(总务+管理员) | ✅ |
| **TenantRegister** | 托管入档(仅代理户)、方案确认、会计分派、本人校验 | ✅ |
| **Task** | 通用任务流转、确认/完成、管理员代操作 | ✅ |
| **Dashboard** | 5 统计接口、纯聚合查询、@Roles(主管+管理员) | ✅ |
| **Files** | multer 本地存储、10MB 限制、扩展名白名单 | ✅ |

### 当前接口清单（47 个）

```
POST   /auth/login                          # 登录
GET    /auth/me                             # 当前用户
GET    /auth/admin-only                     # 权限验证

POST   /customers                           # 新建客户
GET    /customers                           # 客户列表（筛选/搜索）
GET    /customers/:id                       # 客户详情
PATCH  /customers/:id                       # 修改客户

GET    /service-templates                   # 服务模板列表
GET    /service-templates/:id               # 模板详情
POST   /service-read-confirmations          # 提交已读确认
GET    /service-read-confirmations          # 查询确认记录

POST   /customers/:customerId/service-items # 批量添加服务项
GET    /customers/:customerId/service-items # 客户服务项列表
PATCH  /service-items/:id                   # 修改服务项状态

PUT    /customers/:customerId/staff-assignment # 配置人员
GET    /customers/:customerId/staff-assignment # 查人员配置

GET    /users                                # 用户列表
GET    /users?roleCode=会计                  # 按角色筛选

POST   /work-orders                          # 创建办件
GET    /work-orders                          # 办件列表
GET    /work-orders/:id                      # 办件详情
PATCH  /work-orders/:id                      # 更新办件
POST   /work-orders/:id/check-in             # 办结打卡

POST   /charges                               # 创建收费
GET    /charges                               # 查询收费(按状态筛选)
PATCH  /charges/:id                           # 修改收费(总务+管理员)
POST   /charges/:id/confirm                   # 确认已收(总务+管理员)
POST   /charges/:id/remind                    # 发起催收(总务+管理员)
GET    /charges/:id/reminders                 # 催收记录

POST   /tenant-registers                      # 创建托管入档(会计+主管+管理员)
GET    /tenant-registers/:id                  # 托管详情
PATCH  /tenant-registers/:id                  # 更新概况/方案
POST   /tenant-registers/:id/confirm-plan     # 主理人确认方案
POST   /tenant-registers/:id/assign-accountant # 分派会计(主管+管理员)
POST   /tenant-registers/:id/confirm-assignment # 会计确认分派(须本人)

POST   /tasks                                 # 创建任务
GET    /tasks                                 # 任务列表
PATCH  /tasks/:id                             # 更新任务
POST   /tasks/:id/confirm                     # 确认任务
POST   /tasks/:id/complete                    # 完成任务

GET    /dashboard/overview                    # 老板总览
GET    /dashboard/customers                   # 客户看板
GET    /dashboard/services                    # 服务看板
GET    /dashboard/tasks                       # 任务看板
GET    /dashboard/charges                     # 收费看板

POST   /files/upload                          # 文件上传
```

全部已 curl 验证通过（正向 + 反向 401/403）。

---

## 五、数据库

**库名**：`junce_dev`，本地 `postgresql://a1234@localhost:5432/junce_dev`

### 业务表（11 张）

| 表 | 行数 | 用途 |
|----|------|------|
| `roles` | 6 | 角色（商务/业务/会计/主管/总务/管理员） |
| `users` | 6 | 用户（每角色 1 个测试账号，密码 `123456`） |
| `customers` | 5 | 客户企业画像 |
| `service_templates` | 15 | 服务模板（资料清单/流程/时效，待客户补充） |
| `service_read_confirmations` | ~ | 已读确认记录 |
| `service_items` | ~ | 客户选择的服实例 |
| `staff_assignments` | ~ | 客户人员配置 |
| `work_orders` | ~ | 办件工单 |
| `charges` | ~ | 收费记录 |
| `collection_reminders` | ~ | 催收记录 |
| `tenant_registers` | ~ | 托管入档(仅代理户) |
| `tasks` | ~ | 任务 |

### 枚举（10 个）

`RoleCode` / `CompanyType` / `CustomerCategory` / `CustomerTier` / `LifecycleStage` / `ItemStatus` / `WorkOrderStatus` / `ChargeMode` / `ChargeStatus` / `TaskStatus`

### Files 模块（无新表）

文件通过 multer 存本地 `server/uploads/`，不建数据库表。

`RoleCode` / `CompanyType` / `CustomerCategory` / `CustomerTier` / `LifecycleStage` / `ItemStatus`

---

## 六、测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `shangwu` | `123456` | 商务 |
| `yewu` | `123456` | 业务 |
| `kuaiji` | `123456` | 会计 |
| `zhuguan` | `123456` | 主管 |
| `zongwu` | `123456` | 总务 |
| `admin` | `123456` | 管理员 |

---

## 七、快速开始

### 启动后端

```bash
cd server
pnpm start:dev        # 开发模式（热重载）
# 或
pnpm build && pnpm start  # 生产模式
```

服务在 `http://localhost:3000`。

### 测试接口

```bash
# 登录
TOKEN=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# 后续请求带 token
curl -s --noproxy "*" http://localhost:3000/customers \
  -H "Authorization: Bearer $TOKEN"
```

> ⚠️ 本机有代理（FlClash:7890），curl 必须加 `--noproxy "*"`。

### 前端联调地址

- 本机：`http://localhost:3000`
- 局域网：`http://172.20.10.5:3000`（动态 IP，`ipconfig getifaddr en0` 获取）

---

## 八、核心规则（不可违反）

1. **金额一律 Decimal(12,2)**，禁止 float
2. **ownerId 从 JWT 自动取**，前端不可传
3. **Prisma schema 保留 `moduleFormat = "cjs"`**，删除会重现 ESM/CJS 启动错误
4. **`import 'dotenv/config'` 在 main.ts 最顶部**，删掉会导致 DATABASE_URL 未加载
5. **涉及资金/合同/发票的接口限总务+管理员**
6. **缺失的客户资料只能 TODO 占位**，不编造业务规则
7. **一次只做 1-2 个模块**，先 plan 后写代码
8. **每次改完必须 pnpm build 通过** + **curl 正向反向都测**

---

## 九、下一步

按 [ROADMAP.md](ROADMAP.md)：
1. **业务裂变 Fission**（简化版：填单+确认+归档）
2. **经营/工资看板**（手动录入+汇总展示）

---

## 十、文档索引

| 想了解什么 | 看哪个 |
|-----------|--------|
| 需求边界、哪些做哪些不做 | [junce_requirements_v2.md](junce_requirements_v2.md) |
| 项目背景、客户情况 | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) |
| 当前做到哪了 | [PROJECT_STATE_SNAPSHOT.md](PROJECT_STATE_SNAPSHOT.md) |
| 下一步做什么 | [ROADMAP.md](ROADMAP.md) |
| 接口怎么调 | [API_CONTRACT.md](API_CONTRACT.md) |
| 数据库怎么设计的 | [DATABASE_GUIDE.md](DATABASE_GUIDE.md) |
| 系统怎么架构的 | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) |
| 怎么测试 | [TESTING_GUIDE.md](TESTING_GUIDE.md) |
| 有什么风险 | [RISK_ANALYSIS.md](RISK_ANALYSIS.md) |
| 不能乱改什么 | [CTO_NOTES.md](CTO_NOTES.md) |
| 前端怎么联调 | [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md) |
| 怎么部署 | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| AI 开发纪律 | [../CLAUDE.md](../CLAUDE.md) |
| 开发日志 | [../.docs](../.docs) |

---

> 最后更新：2026-06-09
