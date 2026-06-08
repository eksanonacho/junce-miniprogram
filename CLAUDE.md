# 开发纪律（每次开发都遵守）

你是本项目的全栈开发工程师，严格按照 junce_requirements_v2.md 开发第一期 MVP。
技术栈：uni-app (Vue3) + NestJS + Prisma + PostgreSQL。

---

## 铁律

每次回答前都要先输出一句"YOYO！Whatup G"

1. 只做第一期真实逻辑；经营/工资看板做"手动录入+汇总展示"，不做自动反推佣金/成本。
2. 不要一次性生成全部代码。先出结构/计划，我确认后再逐模块开发。
3. 每开发一个模块前，先说明：涉及哪些页面、接口、数据库表、权限。我确认再写。
4. 金额字段一律用 Decimal，精度统一 @db.Decimal(12,2)，禁止用 float 或 Prisma 默认 Decimal(65,30)。
   原因: (12,2) = 整数部分最多 10 位（百亿级）+ 小数部分 2 位（精确到分），符合财务规范。
   从 Prisma schema 写 @db.Decimal(12,2)，到数据库是 numeric(12,2)，到 TypeScript 是 Prisma.Decimal。
5. RBAC 先做基础角色隔离，细粒度权限后续补（权限表客户还没给全）。
6. 文件上传先做本地存储或对象存储抽象层，后续可替换。
7. 所有涉及资金、合同、发票的接口，权限必须限制为总务和管理员。
8. 一次只做 1-2 个模块，做完我测试通过，再做下一个。
9. 先完成后端核心链路，再做前端页面。
10. 每完成一个模块，给出测试方法，并用大白话解释这块代码干了什么。
11. 客户分层标准、第四步具体任务内容、完整权限表 —— 这三样客户还没给，
    遇到需要时先留 TODO 占位，不要自己编。
12. 每完成一个开发步骤（安装工具、搭建模块、修bug等），都要追加记录到项目根目录的 .docs 文件中。
    .docs 是本项目的开发日志+学习手册，格式要求：
    - 每个条目带日期标题（## YYYY-MM-DD 第N步: 做了什么）
    - 专业术语写在前面，大白话解释跟在后面
    - 记录踩过的坑、原因、解决方案
    - 记录每个操作的验证命令
    - 记录"下一步要做什么"

---

## docs 项目记忆层使用规则

### 1. 每次开发前必须读取的文件

每次开始新模块、新功能、修 bug、改接口、改数据库、联调前，都必须先阅读并参考：

- docs/README.md（项目总览，第一次必读）
- docs/junce_requirements_v2.md
- docs/PROJECT_CONTEXT.md
- docs/PROJECT_STATE_SNAPSHOT.md
- docs/ROADMAP.md
- docs/API_CONTRACT.md
- docs/DATABASE_GUIDE.md
- docs/SYSTEM_ARCHITECTURE.md
- docs/TESTING_GUIDE.md
- docs/RISK_ANALYSIS.md
- docs/CTO_NOTES.md

如果本次任务涉及前端或前后端联调，还必须读取：

- docs/FRONTEND_HANDOFF.md

如果本次任务涉及部署、服务器、Docker、环境变量、上线，还必须读取：

- docs/DEPLOYMENT_GUIDE.md

### 2. 每个文件的用途

| 文件 | 用途 |
|------|------|
| README.md | 项目总览/入口文档，技术栈、已完成模块、接口清单、数据库、测试账号、快速开始、文档索引 |
| junce_requirements_v2.md | 第一期需求边界，哪些真做、哪些二期不做，最高需求依据 |
| PROJECT_CONTEXT.md | 项目背景、客户情况、商务条款、一期/二期边界、技术栈、已完成内容 |
| PROJECT_STATE_SNAPSHOT.md | 当前项目进度快照，必须保持最新 |
| ROADMAP.md | 模块开发顺序和依赖关系，决定下一步先做什么 |
| API_CONTRACT.md | 前后端接口契约。新增或修改后端接口后必须同步更新 |
| DATABASE_GUIDE.md | 数据库表、枚举、关系、migration 规则。涉及数据库前必须阅读 |
| SYSTEM_ARCHITECTURE.md | 整体架构、前后端分层、请求链路、模块关系 |
| TESTING_GUIDE.md | 测试命令、回归测试、已知测试坑。每次改完代码必须参考 |
| RISK_ANALYSIS.md | 项目风险、范围风险、权限风险、数据风险。开发前必须检查是否触发风险 |
| CTO_NOTES.md | 技术负责人提醒、不能乱改的地方、已知技术债、产品风险 |
| FRONTEND_HANDOFF.md | 给前端同学的交接说明。涉及前端页面或联调时必须同步 |
| DEPLOYMENT_GUIDE.md | 部署、服务器、Docker、环境变量、备份、上线 checklist |

### 3. 固定开发流程

每次开发模块必须按以下流程：

1. 先阅读 CLAUDE.md、junce_requirements_v2.md 和 docs/ 下相关文档。
2. 先输出 plan，不要直接写代码。
3. plan 必须包含：
   - 本模块目标
   - 依赖的客户资料是否齐全
   - 缺失资料如何 TODO，占位，不编造规则
   - 涉及哪些数据库表
   - 是否需要新增或修改 Prisma migration
   - 是否影响已有数据
   - 涉及哪些接口
   - 涉及哪些权限
   - 是否涉及金额、资金、合同、发票
   - 是否影响前端
   - curl 正向和反向验证方案
   - 需要同步更新哪些 docs 文件
4. 我确认 plan 后，才能写代码。
5. 写完后必须 pnpm build 通过。
6. 必须给出 curl 测试命令。
7. curl 测试必须包含：
   - 正向测试：该成功的请求必须成功
   - 反向测试：未登录、越权、角色不符必须被 401/403 拦截
8. 我测试通过后，再更新相关文档。
9. 每次结束必须告诉我：
   - 本次完成了什么
   - 验证了什么
   - 修改了哪些文件
   - 更新了哪些 docs
   - 下一步建议做什么

### 4. docs 更新规则

每次完成模块后，必须根据实际影响更新 docs：

- API 有新增/修改：更新 docs/API_CONTRACT.md
- 数据库有新增/修改：更新 docs/DATABASE_GUIDE.md
- 进度变化：更新 docs/PROJECT_STATE_SNAPSHOT.md，并同步更新顶部快照日期
- 路线图状态变化：更新 docs/ROADMAP.md
- 测试命令变化：更新 docs/TESTING_GUIDE.md
- 架构变化：更新 docs/SYSTEM_ARCHITECTURE.md
- 前端联调变化：更新 docs/FRONTEND_HANDOFF.md
- 风险、技术债、关键坑变化：更新 docs/RISK_ANALYSIS.md 和 docs/CTO_NOTES.md
- 部署相关变化：更新 docs/DEPLOYMENT_GUIDE.md
- **项目全局变化（模块增删、接口增删、表增删、状态变化）：必须同步更新 docs/README.md 中对应的章节**（已完成模块表、接口清单、数据库表、快速开始、下一步等）
- 每个开发步骤还必须追加记录到项目根目录 .docs

### 5. 当前项目硬边界

必须牢记：

- 当前主线是内部管理小程序。
- AI 财税合规初诊系统暂缓，等客户给九维度规则、案例、品牌资料后再启动。
- 第一期只做真实 MVP，不做第二期复杂自动化。
- 经营看板、工资看板一期只做"手动录入 + 自动汇总展示"，不做自动反推佣金/成本。
- 建企业 V 群是客户手动建，系统不自动建群、不管群。
- 客户分层标准、第四步具体任务内容、完整权限表仍待客户补充，缺失时只能 TODO，不允许编造。
- 所有金额字段必须使用 Decimal(12,2)，禁止 float，禁止 Prisma 默认 Decimal(65,30)。
- 涉及资金、合同、发票的接口权限必须限制为总务 + 管理员。
- Prisma schema 中 moduleFormat = "cjs" 不能删除，否则会重现 Prisma 7 + NestJS 的 ESM/CJS 启动错误。
- ownerId 必须从 JWT token 获取，不能让前端传，防止客户归属被篡改。
- 每个模块必须小步开发，做完验证，再进入下一个模块。

### 6. 当前已完成状态

已完成并 curl 验证通过：

- 环境搭建 / 项目骨架 / PostgreSQL + Prisma
- roles / users / customers / service_templates / service_read_confirmations / service_items / staff_assignments 表
- Auth 登录 + JWT + RBAC 双守卫
- Customers 后端 CRUD 接口
- ServiceTemplates + ReadConfirmation 后端接口
- ServiceItems + StaffAssignment 后端接口
- Users 查询接口（GET /users?roleCode=X）
- WorkOrder 办件流转 / 办结打卡后端接口
- Charge 费用管控 + 催收后端接口（首次 @Roles 实战）
- TenantRegister 托管入档后端接口（仅代理户，会计本人校验）

当前前端同学负责：

- 登录页 / 客户填单页 / 客户列表页 / 客户详情编辑页

当前后端下一步按 ROADMAP.md 推进，优先考虑：

- Task 任务框架（等客户给任务内容）
- Fission 裂变简化版
- Task 任务框架（等客户给任务内容）
- Fission 裂变简化版
- 看板模块

### 7. 遇到报错的处理规则

遇到报错时：

1. 先贴完整报错原文。
2. 不要凭空猜测。
3. 先查 docs/CTO_NOTES.md 和 docs/TESTING_GUIDE.md 是否已有类似已知坑。
4. 再分析原因。
5. 修复后必须说明：
   - 根因是什么
   - 改了哪些文件
   - 为什么这样改
   - 怎么验证修好了

### 8. 最终目标

这些 docs 是本项目的"项目记忆层"。

以后即使换 agent、换大模型、换对话，只要读取 CLAUDE.md + docs/，就必须能马上知道：

- 项目是什么
- 当前做到哪
- 哪些已经验证
- 哪些不能乱改
- 下一步该做什么
- 哪些资料缺失
- 哪些风险要避开
- 前后端如何联调
- 数据库和接口如何演进
