# CLAUDE.md — 君册财税内部管理小程序开发约束

> 最后更新：2026-07-24
> 适用范围：本仓库全部前端、后端、数据库、测试、文档与部署工作。
> 本文件是仓库内唯一的 Claude Code 项目约束文档。

---

## 1. 项目定位

本项目是君册财税内部管理小程序，一期定位为财税公司内部 OA、轻量 CRM 和业务流转工具。

核心链路：

客户填单 → 服务确认 → 人员配置 → 办件流转 → 办结打卡 → 收费催收 → 托管入档 → 任务跟进 → 业务裂变 → 经营/工资看板 → 管理看板

技术栈：

- 正式前端：`junce-miniprogram-frontend/`
- 前端技术：uni-app、Vue 3、Vite、Pinia，目标端为微信小程序，H5 用于辅助调试
- 后端：`server/`
- 后端技术：NestJS、TypeScript、Prisma、PostgreSQL、JWT
- 部署：Docker Compose、Nginx

根目录旧 `client/` 是早期前端骨架，不是当前正式前端。除非项目负责人明确要求，不要在 `client/` 继续开发。

AI 财税初诊网站是独立项目，不得把两个项目的前端、后端、数据库或接口直接合并。

---

## 2. 当前项目状态

当前基线提交：

- 远程同步基线：`31af7e1`
- 后端原封板基线：`96ccf7e`
- 远程新增：权限服务、角色工作台、通知系统、完整正式前端

当前代码覆盖：

- 后端一期核心业务模块已实现
- 正式前端 Phase 1–9 已编码
- 正式前端包含登录、客户、服务配置、人员配置、办件、收费、托管、任务、裂变、手动看板、管理看板和通知页面
- 前端交接文档声称 55/55 业务接口完成联调
- 历史后端记录为 63/63 回归和 21/21 Docker 冒烟通过

2026-07-24 接手复核的实际结果：

- `pnpm exec prisma validate`：通过
- `pnpm exec prisma generate`：通过
- `pnpm build`：重新生成 Prisma Client 后通过
- 后端单元测试：1/1 通过
- Jest 能发现 3 个 E2E 测试文件
- E2E 本轮未运行，因为需要明确的测试数据库且测试会写入数据
- 前端 `npm ci` 失败：`package.json` 与 `package-lock.json` 不同步
- 因依赖未能完成干净安装，H5 和 mp-weixin 构建本轮未能复现
- Prisma Schema 已有 `Notification` 模型，但 migrations 中没有对应通知表迁移
- 微信开发者工具完整回归、真机测试、审核发布和生产部署尚未验证

因此，不得把“历史文档声称完成”写成“当前环境已重新验证”。修复前端 lockfile、补齐通知 migration 并完成双端/数据库验证，是当前最高优先级。

---

## 3. 需求硬边界

一期只做真实 MVP。

禁止自行增加：

- 自动反推佣金、成本或工资
- 自动建企业微信群
- AI 自动判断业务结果
- 客户分层自动规则
- 未经客户确认的细粒度权限
- 第二期复杂自动化
- 虚构字段、虚构接口、假数据或假统计

经营看板和工资看板一期只允许“手动录入 + 后端汇总展示”。

以下资料仍缺失时，只能保留 TODO，不得编造：

- 客户分层标准
- 第四步具体任务内容
- 完整角色权限表

---

## 4. 开发前必读

每次开始任务，先读：

1. 本文件
2. `docs/README.md`
3. `docs/junce_requirements_v2.md`
4. `docs/PROJECT_CONTEXT.md`
5. `docs/PROJECT_STATE_SNAPSHOT.md`
6. `docs/ROADMAP.md`
7. `docs/API_CONTRACT.md`
8. `docs/DATABASE_GUIDE.md`
9. `docs/SYSTEM_ARCHITECTURE.md`
10. `docs/TESTING_GUIDE.md`
11. `docs/TEST_RESULTS.md`
12. `docs/RISK_ANALYSIS.md`
13. `docs/CTO_NOTES.md`

涉及正式前端时还要读：

- `junce-miniprogram-frontend/docs/PROJECT_STATUS.md`
- `junce-miniprogram-frontend/docs/FRONTEND_ARCHITECTURE.md`
- `junce-miniprogram-frontend/docs/DEBUG_NOTES.md`
- `junce-miniprogram-frontend/docs/TESTING_GUIDE.md`
- 根目录 `docs/FRONTEND_HANDOFF.md`

涉及部署时还要读：

- `docs/DEPLOYMENT_GUIDE.md`

文档可能过期。发生冲突时，以需求边界、当前代码、实际构建和测试证据为准，并同步修正文档。

---

## 5. 固定工作流程

开始改动前先输出计划，至少说明：

- 目标与范围
- 涉及的页面、接口、数据库表和权限
- 是否涉及金额、合同、发票或客户数据
- 是否需要 Prisma migration
- 是否影响已有数据或 API 契约
- 正向、反向和回归验证方案
- 需要更新的文档

未经项目负责人确认，不要一次性开发多个大模块。

每次只处理 1–2 个模块或一个清晰问题。先理解现有实现，再做最小范围修改。

遇到报错时：

1. 保留完整错误原文
2. 查 `docs/CTO_NOTES.md`、`docs/TESTING_GUIDE.md` 和前端 `DEBUG_NOTES.md`
3. 用代码和可复现步骤定位根因
4. 修复后说明根因、改动、影响和验证结果

不得用“历史上通过”“同事说通过”替代当前验证。

---

## 6. 后端与数据库铁律

- 金额字段统一使用 `Decimal` 和 `@db.Decimal(12,2)`
- 禁止用 `float` 或 Prisma 默认 `Decimal(65,30)` 保存财务金额
- `ownerId` 必须从 JWT 获取，禁止由前端传入
- 资金、合同、发票相关写接口必须由后端执行角色权限校验
- 前端显隐不是权限控制，后端是最终权限裁决方
- Prisma Schema 变化必须配套 migration，不能只改 `schema.prisma`
- 新 migration 必须评估已有数据、回滚风险和部署顺序
- `generator client` 的 `moduleFormat = "cjs"` 不得删除
- 文件上传必须经过现有存储抽象和安全校验，不暴露服务器内部路径
- 不得在 Git 中提交真实密钥、真实客户数据或生产凭据

后端改动后至少执行：

```bash
cd server
pnpm exec prisma validate
pnpm exec prisma generate
pnpm build
pnpm exec jest --runInBand
```

涉及接口、权限或数据库时，还必须在隔离测试数据库中运行相关 E2E 和正反向接口测试。

---

## 7. 正式前端铁律

正式前端目录是 `junce-miniprogram-frontend/`。

必须保持：

- API 路径、请求参数和返回结构与 `docs/API_CONTRACT.md` 一致
- token 存储、401/403 处理和角色权限逻辑一致
- POST/PATCH body 不添加后端不存在的字段
- PATCH 只提交允许且确实需要修改的字段
- 金额展示与提交语义不变
- 微信小程序端可编译，不只验证 H5
- loading、empty、error、无权限和提交中状态真实可用

禁止：

- 伪造接口数据或统计
- 为了视觉效果修改业务状态含义
- 使用中文 CSS class
- 盲目批量替换或用脚本注入 CSS
- 引入新 UI 框架而不先说明影响
- 把 H5 效果等同于微信小程序真实效果

前端改动后至少执行：

```bash
cd junce-miniprogram-frontend
npm ci
npm run build:h5
npm run build:mp-weixin
```

`npm ci` 必须能在干净环境成功。禁止只依赖开发者电脑中残留的 `node_modules`。

最终 UI 验收应在微信开发者工具中完成；关键流程还应进行真机测试。

---

## 8. 安全与环境配置

- `.env`、本地设置、真实 token、数据库密码不得提交
- `.env.example` 只能放示例值
- 前端 `BASE_URL` 不得长期绑定某位开发者的局域网 IP
- 开发、测试、生产地址必须明确区分
- 测试不得直接使用生产数据库
- E2E 会写入数据，运行前必须确认数据库用途和清理策略
- 上传目录、构建产物、日志和依赖目录不得误提交

当前仓库已跟踪以下本地性质文件，后续应单独审查是否保留：

- `junce-miniprogram-frontend/.claude/settings.local.json`
- `junce-miniprogram-frontend/.impeccable/config.local.json`

不要在未检查内容和用途前直接删除或继续扩散。

---

## 9. 文档同步

代码行为发生变化时必须同步：

- API：`docs/API_CONTRACT.md`
- 数据库：`docs/DATABASE_GUIDE.md`
- 架构：`docs/SYSTEM_ARCHITECTURE.md`
- 前端联调：`docs/FRONTEND_HANDOFF.md`
- 测试方法：`docs/TESTING_GUIDE.md`
- 测试结果：`docs/TEST_RESULTS.md`
- 风险和技术债：`docs/RISK_ANALYSIS.md`、`docs/CTO_NOTES.md`
- 部署：`docs/DEPLOYMENT_GUIDE.md`
- 当前状态：`docs/PROJECT_STATE_SNAPSHOT.md`
- 总览：`docs/README.md`
- 开发过程：根目录 `.docs`

前端目录内的历史交接文档可以保留作为记录，但项目约束只以根目录本文件为准，不再创建其他 `CLAUDE.md`。

---

## 10. Git 规则

- 开始前检查 `git status`
- 保留项目负责人和其他开发者的未提交修改
- 不使用 `git reset --hard`、强制推送或覆盖式 checkout
- 一个提交只表达一个清晰目的
- 提交前检查 `git diff`、构建和测试结果
- 未通过的检查必须如实记录
- 未经明确授权，不直接 push

每次结束说明：

- 完成了什么
- 修改了哪些文件
- 运行了哪些验证
- 哪些验证通过、失败或未运行
- 剩余风险
- 下一步建议

---

## 11. 当前接手优先级

1. 修复正式前端 `package.json` / `package-lock.json` 不一致，恢复干净安装
2. 补齐 `Notification` 对应 Prisma migration，并验证现有数据库升级
3. 运行后端完整 E2E 和角色权限回归
4. 重新执行 H5、mp-weixin 双构建
5. 在微信开发者工具完成全页面、多角色、主要业务闭环验收
6. 真机测试网络、上传、登录态、导航和样式降级
7. 清理过期状态文档、重复旧前端和仓库内本地工具配置
8. 完成 staging 部署演练后，再讨论生产发布
