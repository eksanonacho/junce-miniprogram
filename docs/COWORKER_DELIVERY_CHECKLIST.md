# Coworker 最终交付核对清单

> 项目：君册财税内部管理小程序  
> 仓库：`eksanonacho/junce-miniprogram`  
> 核对基线：远程 `main` 最新提交  
> 编写日期：2026-07-24

## 1. 目的

这份清单用于确认 coworker 开发电脑中的最终版本，是否已经完整交付到 GitHub，并确保项目可以在一台全新电脑上从零安装、迁移、构建和运行。

交付目标不是“代码大部分已经上传”，而是：

- 不丢失任何业务逻辑；
- 不丢失任何接口、数据库表、字段、枚举和 migration；
- 不丢失任何页面、组件、样式、图片和字体；
- 不丢失任何权限、状态流转、请求参数和错误处理；
- 不依赖 coworker 电脑里未提交的文件或旧 `node_modules`；
- 从全新 clone 可以按文档恢复出与 coworker 当前版本一致的效果。

请 coworker 在自己的**最终开发目录**逐项检查。不要只回复“都 push 了”，必须按第 10 节模板返回结果。

## 2. 当前接手方已经确认的缺口

以下问题已在 2026-07-24 使用全新 clone 稳定复现。

### 2.1 前端 lockfile 与 package.json 不一致

正式前端目录：

```text
junce-miniprogram-frontend/
```

全新 clone 后执行：

```bash
cd junce-miniprogram-frontend
npm ci
```

结果：失败。npm 报告 `package.json` 与 `package-lock.json` 不同步，并列出大量 lockfile 中缺失的依赖。

请 coworker 检查：

- 本机最终版本的 `package.json`；
- 本机最终版本的 `package-lock.json`；
- 本机是否只靠已有 `node_modules` 才能构建；
- 是否曾修改依赖但没有提交更新后的 lockfile；
- 本机执行 `npm ci` 是否能在移走 `node_modules` 后成功。

必须返回：

- 本机是否存在正确且最新的 `package-lock.json`；
- 若存在：文件是否已 push，所在 commit SHA；
- 若未 push：提交正确 lockfile；
- 若不存在：明确回复“不存在，需要重新生成”，不要用旧 `node_modules` 代替。

### 2.2 Notification 模型缺少 Prisma migration

远程代码中的 `server/prisma/schema.prisma` 已存在 `Notification` 模型，但 `server/prisma/migrations/` 中没有对应的建表 migration。

这会导致：

- TypeScript 可以在生成新 Prisma Client 后通过构建；
- 但新环境执行 `prisma migrate deploy` 时不会创建通知表；
- 通知接口运行时可能出现数据库表不存在。

请 coworker 检查：

- 本机是否有尚未提交的通知表 migration；
- 本机数据库是否通过 `prisma db push` 或手工 SQL 建过通知表；
- 是否有只存在于数据库、没有进入 migration 的其他表、字段、索引或枚举；
- 通知表最终结构是否与当前 `schema.prisma` 完全一致。

必须返回：

- migration 存在或不存在；
- 若存在：目录名、文件清单和对应 commit SHA；
- 若不存在：说明当时通过什么方式创建通知表；
- 是否还有其他数据库结构只存在于本机数据库。

## 3. Git 未提交内容检查

请在 coworker 的最终开发目录执行：

```bash
git rev-parse --show-toplevel
git remote -v
git branch -vv
git rev-parse HEAD
git log -10 --oneline --decorate
git status --short --branch
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
git stash list
```

请检查并说明：

- 当前 HEAD 是否就是声称交付的最终版本；
- 是否在 `main` 以外的分支继续开发；
- 是否有未 push 的 commit；
- 是否有未提交的修改；
- 是否有 staged 但未 commit 的文件；
- 是否有 untracked 文件；
- 是否有 stash；
- 是否有只存在于 fork、临时分支或另一个仓库的提交。

如果有任何业务相关内容，必须列出文件路径和用途。以下内容不能因为是 untracked 就忽略：

- `.vue`、`.js`、`.ts`、`.scss`、`.css`；
- Prisma Schema、migration、seed；
- 图片、图标、字体和其他页面资源；
- 测试文件、mock 说明、接口样例；
- 构建配置、manifest、pages 配置；
- Docker、Nginx、部署脚本；
- API、数据库和测试文档。

`node_modules/`、`dist/`、日志和缓存不需要提交，但不能把其中内容当作源码交付。

## 4. 正式前端完整性检查

正式前端以 `junce-miniprogram-frontend/` 为准。旧 `client/` 不作为最终交付前端。

请逐项确认本机最终版本是否全部进入 Git：

- `src/pages.json` 中注册的全部页面；
- `src/pages/` 下全部页面；
- `src/components/` 下全部公共组件；
- `src/stores/` 中登录态和用户状态；
- `src/utils/request.js` 请求封装；
- `src/config/index.js` 后端地址配置；
- `src/App.vue`、`src/uni.scss` 和设计 token；
- `src/static/` 下图片、图标和其他资源；
- `src/manifest.json` 中微信小程序配置；
- `vite.config.js`、类型声明和构建配置；
- `package.json` 与正确的 `package-lock.json`；
- 所有新增通知、工作台、权限入口对应页面；
- coworker 本机实际展示所依赖的字体、图片或外部资源。

特别检查：

- 本机是否还有未提交的 `project.config.json`、`project.private.config.json` 或微信开发者工具配置；
- 微信 AppID 是否需要由项目负责人另行配置；
- 登录后实际默认页面与文档描述是否一致；
- BASE_URL 是否仍依赖 coworker 的局域网 IP；
- 是否存在只在 H5 正常、微信小程序端没有验证的功能；
- 是否存在条件编译文件没有提交；
- 是否存在本机绝对路径引用。

请在**临时移走现有 `node_modules` 后**执行：

```bash
cd junce-miniprogram-frontend
npm ci
npm run build:h5
npm run build:mp-weixin
git status --short
```

必须返回每条命令的结果。构建产物 `dist/` 不要求提交，但需要说明构建是否成功，并提供微信开发者工具实际运行截图。

## 5. 后端业务、接口和权限完整性检查

请确认本机最终版本中，以下内容没有未提交或未 push：

- 所有 NestJS module、controller、service、DTO；
- Auth、JWT、Guard、`@Roles()` 和权限服务；
- Customers；
- ServiceTemplates 和 ReadConfirmations；
- ServiceItems；
- StaffAssignments；
- WorkOrders；
- Charges 和 CollectionReminders；
- TenantRegisters；
- Tasks；
- Dashboard；
- Files；
- FissionLeads；
- ManualDashboard；
- Workbench；
- Notifications；
- Health；
- PrismaService、全局 ValidationPipe、CORS 和静态文件配置。

逐项检查：

- 本机是否有远程没有的接口；
- 本机是否改过接口路径、Method、请求 body、query 或返回字段；
- 本机是否改过角色权限；
- 本机是否改过状态流转规则；
- 本机是否改过 401、403、404、409 的处理；
- 本机是否改过上传文件限制或返回结构；
- 本机是否改过通知触发条件；
- 本机是否存在临时绕过权限或测试用硬编码；
- 当前 `docs/API_CONTRACT.md` 是否与最终代码一致。

请提供本机最终接口清单，或确认远程接口契约与本机完全一致。不能只提供接口总数。

## 6. 数据库完整性检查

请比较 coworker 本机数据库、`schema.prisma` 和 migrations，确认三者一致。

需要覆盖：

- 所有 model / 表；
- 所有字段和类型；
- 所有 relation / 外键；
- 所有唯一约束；
- 所有普通索引；
- 所有枚举及枚举值；
- 所有默认值；
- 所有金额字段精度；
- 所有 migration；
- `seed.ts` 的角色、账号、模板和演示数据。

金额字段必须继续使用：

```prisma
Decimal @db.Decimal(12,2)
```

请执行并返回结果：

```bash
cd server
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
```

还必须回答：

- 是否运行过 `prisma db push`；
- 是否手工执行过 SQL；
- 是否手工改过数据库表或数据；
- 是否有 migration 生成后没有提交；
- 是否有 migration 被修改或删除；
- 是否有仅存在于 coworker 数据库的结构；
- 是否有前端联调必须依赖、但 seed 中不存在的数据。

不要把真实客户数据库或真实客户数据提交 Git。若需要交接数据库结构或安全的演示数据，请提供：

- 无敏感数据的 schema-only dump，或
- 完整 migration + seed，或
- 脱敏测试数据导入说明。

## 7. 环境变量与运行配置交接

`.env` 不应提交 Git，但运行所需变量必须完整交接。

请核对并提供：

- 根目录 Docker Compose 使用的变量名；
- `server/.env` 使用的变量名；
- 开发环境、测试环境、staging 和生产环境的差异；
- 数据库地址格式；
- JWT 配置；
- CORS 配置；
- 上传目录和存储配置；
- 服务端口；
- seed 开关；
- 前端 BASE_URL 切换方法；
- 微信小程序 AppID、合法域名和开发者工具要求。

安全要求：

- 文档和 Git 中只写变量名与示例值；
- 真实密码、JWT_SECRET、云账号、AppID 私密配置通过安全渠道单独交付；
- 回复本清单时不要把真实秘密直接贴到公开聊天或 GitHub。

请确认 `server/.env.example` 是否覆盖全部必需变量。若缺少变量名，需要补齐示例文件，但不能提交真实值。

## 8. 测试与实际效果证据

请说明 coworker 最后一次验证使用的：

- commit SHA；
- Node、npm、pnpm 版本；
- 操作系统；
- 后端地址；
- 数据库版本和数据库状态；
- 微信开发者工具版本；
- 测试账号和测试数据来源。

请提供以下结果：

```bash
cd server
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm exec prisma generate
pnpm build
pnpm exec jest --runInBand
pnpm test:e2e
```

```bash
cd junce-miniprogram-frontend
npm ci
npm run build:h5
npm run build:mp-weixin
```

还需提供：

- 微信开发者工具中实际打开项目的截图；
- 登录页和首页截图；
- 主要页面截图；
- 六种角色的入口和权限验证结果；
- 客户 → 服务 → 人员 → 办件 → 打卡链路结果；
- 收费、托管、任务、裂变、看板结果；
- 通知和工作台结果；
- 文件上传结果；
- 已知问题、未测功能和无法复现的问题。

如果某项没测，请明确写“未测试”，不要写“应该可以”。

## 9. 可复现交付验收标准

以下条件全部满足，才算“已经拿全并且拿来能用”：

- coworker 本机 `git status` 已核对；
- 所有业务相关修改和文件均已进入远程 `main`；
- 没有业务代码留在其他分支、stash 或 untracked 文件中；
- 前端 `npm ci` 在干净环境成功；
- H5 构建成功；
- mp-weixin 构建成功；
- 后端按锁文件安装成功；
- Prisma validate 和 generate 成功；
- 所有 Schema 变化都有 migration；
- `prisma migrate deploy` 能建立完整数据库；
- seed 能建立安全的测试账号和基础数据；
- 后端构建成功；
- 单元测试和 E2E 结果明确；
- 前后端可以在新环境联机；
- 主要业务链路和角色权限通过；
- 微信开发者工具实际运行效果与 coworker 交付效果一致；
- 环境变量清单完整，真实秘密通过安全渠道交接；
- 所有失败项、未测试项和已知问题都有书面说明。

## 10. Coworker 必须使用的回复模板

请复制下面模板逐项填写，不要删除项目。

```markdown
# 君册小程序最终交付核对回复

## A. Git

- 最终开发目录：
- 当前分支：
- 当前 HEAD SHA：
- 远程 main SHA：
- 未 push commit：有 / 无
- 未提交修改：有 / 无
- untracked 业务文件：有 / 无
- stash：有 / 无
- 其他开发分支：有 / 无
- 若有，详细清单：

## B. 前端 lockfile

- 干净环境 npm ci：通过 / 失败 / 未测试
- 正确的 package-lock.json：存在 / 不存在
- 是否已 push：
- 所在 commit SHA：
- 若不存在或失败，原因：

## C. 前端文件

- 未提交页面：有 / 无
- 未提交组件：有 / 无
- 未提交样式或资源：有 / 无
- 未提交配置：有 / 无
- 微信开发者工具本地配置是否需要交接：
- H5 构建：通过 / 失败 / 未测试
- mp-weixin 构建：通过 / 失败 / 未测试
- 微信开发者工具运行：通过 / 失败 / 未测试
- 真机测试：通过 / 失败 / 未测试
- 详细说明：

## D. 后端

- 未提交接口或业务逻辑：有 / 无
- 未提交权限逻辑：有 / 无
- 未提交通知或工作台逻辑：有 / 无
- 本机接口与远程 API_CONTRACT：一致 / 不一致
- 若不一致，详细清单：

## E. 数据库

- Notification migration：存在 / 不存在
- 是否已 push：
- migration 路径或 commit：
- 是否运行过 prisma db push：
- 是否执行过手工 SQL：
- 是否有只存在于本机数据库的表、字段、索引或枚举：
- 是否有未提交 migration：
- seed 是否与最终联调数据要求一致：
- 详细说明：

## F. 环境配置

- server/.env.example 是否覆盖全部变量：是 / 否
- 缺失变量名：
- 是否需要安全渠道交接真实配置：是 / 否
- 前端最终 BASE_URL 配置方式：
- 微信 AppID/合法域名是否需要交接：
- 详细说明：

## G. 测试

- 后端 build：
- 单元测试：
- E2E：
- H5 build：
- mp-weixin build：
- 六角色权限：
- 完整业务链路：
- 通知：
- 工作台：
- 文件上传：
- 未测试项：
- 已知问题：

## H. 最终确认

- 我确认所有业务代码均已 push：是 / 否
- 我确认所有接口和权限均已 push：是 / 否
- 我确认所有数据库结构和 migration 均已 push：是 / 否
- 我确认所有前端页面、样式和资源均已 push：是 / 否
- 我确认远程版本可在干净环境复现：是 / 否
- 若任一项为“否”，缺失内容和补交计划：
```

## 11. 如果本机不存在缺失内容

如果 coworker 检查后确认某项在本机也不存在，必须明确回复：

- 哪个文件或 migration 不存在；
- 当时是如何完成开发或联调的；
- 是否依赖旧 `node_modules`、`prisma db push`、手工 SQL 或本机配置；
- 是否影响现有业务、接口、数据库或页面；
- 建议如何补齐；
- 是否有可用于还原的截图、构建产物、数据库结构或历史记录。

“本机也没有”不是问题，但必须留下书面证据，方便接手方在不丢业务逻辑的前提下补齐。

