# CLAUDE.md — Claude Code 工作准则

每次读到此为止,请务必在对话框输出:你好

## 一、每次开始任务前,必须先阅读以下文件

1. `docs/API_CONTRACT.md` — 后端接口契约（字段/枚举/请求体/返回结构/权限说明的最高依据）
2. `docs/FRONTEND_HANDOFF.md` — 前端交接手册（页面范围、阶段规划、页面与接口对应关系）
3. `docs/API_CONTRACT_USAGE.md` — API 使用规范（如何正确使用接口，不允许发明字段）
4. `docs/PROJECT_STATUS.md` — 项目记忆库（当前进度、已完成页面、已联调接口、当前问题、下一步计划）
5. `docs/FRONTEND_ARCHITECTURE.md` — 前端架构（目录结构、request 封装、store、路由、token/401/403 处理）
6. `docs/PAGE_ROADMAP.md` — 页面路线图（8 个阶段、各页面状态、决定下一步做什么）
7. `docs/API_USAGE_GUIDE.md` — 接口调用实战指南（token、PATCH、状态流转接口等代码示例）
8. `docs/TESTING_GUIDE.md` — 测试指南（每个页面的测试步骤）
9. `docs/DEBUG_NOTES.md` — 踩坑记录（遇到报错先查已知问题）
10. `README.md` — 项目启动方式与基本说明

读完后，先输出"当前我理解的项目状态"，再进入本次任务。

## 二、文档冲突时的优先级

1. `docs/API_CONTRACT.md`（最高）— 接口字段、枚举、请求体、返回结构，一律以它为准
2. `docs/FRONTEND_HANDOFF.md` — 页面范围、页面顺序、前端任务边界
3. `docs/PROJECT_STATUS.md` — 当前进度、已完成页面、已联调接口
4. `docs/PAGE_ROADMAP.md` — 页面开发顺序参考
5. 其他 docs — 架构、测试、Debug、接口使用

如果文档之间存在冲突，先报告冲突，不要自行选择，等我确认后再改。

## 三、核心工作流程（每个任务都遵守）

1. 读取 docs（按第一节清单）
2. 分析当前状态
3. 输出 Plan
4. **等我确认**
5. 修改代码或文档
6. 给出验证方法
7. 更新 `docs/PROJECT_STATUS.md`
8. 如涉及测试，更新 `docs/TESTING_GUIDE.md`
9. 如遇到坑，更新 `docs/DEBUG_NOTES.md`
10. 输出 git status
11. 等我决定是否 commit（或按既定规则执行）

- 未经我确认,禁止修改任何代码或文件。
- 一次只做一个页面 / 一个小步骤,做完验证通过才进下一步。
- 出现任何错误立即停止,贴出完整报错,不要自行尝试修复或更换方案,等我判断。

## 四、铁律

- 只做前端,不修改后端代码、不碰数据库。
- 不发明接口字段;所有接口的地址/方法/字段/枚举值,以 `docs/API_CONTRACT.md` 为准,一字不差。
- 枚举值用中文原值,不允许自己编造。
- 页面范围和开发顺序，以 `docs/FRONTEND_HANDOFF.md` 和 `docs/PAGE_ROADMAP.md` 为准。
- 所有需登录的请求必须带 `Authorization: Bearer <token>`;401 时清登录态跳登录页。
- 新建客户不传 ownerId、lifecycleStage;修改客户(PATCH)只传改动的字段。
- PATCH 只传改动字段，不传空字段。
- 状态流转不能用 PATCH 偷改状态，必须使用对应动作接口（如 Task: confirm/complete、Charge: confirm/remind、WorkOrder: check-in、TenantRegister: assign-accountant 等）。
- BASE_URL 只在 `src/config/index.js` 一处配置,不写死在各请求里。

## 五、禁止自动升级依赖

- 未经确认,不得升级、降级、替换任何依赖版本。
- 涉及 npm install、npm uninstall、修改 package.json 时,必须先出方案,等待确认后再执行。

## 六、先查证再回答

涉及以下内容时,必须先用 ls / cat / npm ls 等命令查证,禁止凭经验、记忆或推测回答:

- 文件是否存在
- 当前代码内容
- 当前项目结构
- 包版本
- 依赖是否安装
- 接口是否已在 `docs/API_CONTRACT.md` 中定义
- 页面是否已在 `src/pages.json` 注册
- 某个页面是否已开发、某个接口是否已联调
- 命令是否可执行

## 七、文档维护规则

每完成一个步骤后,根据任务类型更新：

### 必须更新
- `docs/PROJECT_STATUS.md` — 当前状态、已完成、当前任务、下一步计划、最近修改文件、联调状态

### 视情况更新
- `docs/TESTING_GUIDE.md` — 页面测试方法变化或新增页面时
- `docs/DEBUG_NOTES.md` — 遇到新 bug、新坑、新解决方案时
- `docs/FRONTEND_ARCHITECTURE.md` — 目录结构、request、store、路由、token 处理变化时
- `docs/PAGE_ROADMAP.md` — 页面状态变化、路线图变化时
- `docs/API_USAGE_GUIDE.md` — 前端接口使用规则变化时
- `README.md` — 启动方式、项目结构、技术栈变化时

### 需要确认后才能修改
- `docs/API_CONTRACT.md` — 只能以后端提供的最新版为准，不能前端自行改接口
- `docs/FRONTEND_HANDOFF.md` — 属于团队交接文档，修改前需要确认

未经确认，不得擅自修改以上文件。如发现与后端实际行为不一致，先报告，等我确认后再改。

## 八、文档整理规则

所有项目文档统一在 `docs/` 目录下：

- 核心文档：CLAUDE.md、API_CONTRACT.md、FRONTEND_HANDOFF.md、PROJECT_STATUS.md、PAGE_ROADMAP.md、README.md 等
- 历史 Debug / Bug Report：归档 `docs/bug-reports/`

**未经确认不得移动核心文档。**

## 九、PROJECT_STATUS.md 更新回执格式

每次更新 `docs/PROJECT_STATUS.md` 后,必须输出如下变更摘要:

```
PROJECT_STATUS.md 更新内容

修改位置:
- 当前状态
- 当前任务
- 已完成
- 下一步计划
- 最近修改文件
- 关键技术决策
- 避坑提示

本次新增内容:
- xxx

本次修改内容:
- 修改前：xxx
- 修改后：xxx

本次删除内容:
- xxx

实际修改文件:
- docs/PROJECT_STATUS.md
- xxx
```

如果本次任务按规则要求更新了 PROJECT_STATUS.md，则必须输出该回执。
如果未更新 PROJECT_STATUS.md，必须说明原因。
禁止仅回复"已更新 PROJECT_STATUS.md"。
必须明确说明更新了哪些内容。

## 十、任务完成固定输出格式

每次任务结束时必须输出:

1. 修改文件列表
2. 关键代码变更摘要
3. `docs/PROJECT_STATUS.md` 更新回执（按第九节格式）
4. 验证步骤
5. git status
6. 是否建议 commit

不得省略第 3 项。

## 十一、Git 工作流

每次任务完成并通过验证后，按顺序执行：

1. 更新 `docs/PROJECT_STATUS.md`
2. 输出 PROJECT_STATUS.md 更新回执（按第九节格式）
3. 输出修改文件列表
4. 输出验证步骤
5. 输出 git status
6. 输出 Commit 前检查报告（按第十二节格式）
7. `git add`
8. `git commit`

### commit message 格式

- `feat: xxx` — 新功能
- `fix: xxx` — Bug 修复
- `docs: xxx` — 文档变更
- `refactor: xxx` — 重构

### push 规则

**禁止自动 git push。**

只有当我明确回复：

> 允许 push

才可以执行：

```bash
git push origin main
```

### Git Commit 报告

提交完成后必须输出：

- Commit 类型
- Commit Message
- Commit Hash
- 包含文件
- 当前 git status

## 十二、Commit 前检查报告

执行 git add / git commit 前，必须输出 Commit 前检查报告。

### 检查内容

1. 是否存在 DEBUG 文件未归档到 `docs/bug-reports/`
2. 是否存在临时测试文件
3. 是否存在 console.log
4. 是否存在临时代码 / TODO 是否合理
5. `docs/PROJECT_STATUS.md` 是否已更新
6. `docs/TESTING_GUIDE.md` 是否需要更新
7. `docs/DEBUG_NOTES.md` 是否需要更新
8. `README.md` 是否需要更新
9. 是否误修改 `docs/API_CONTRACT.md`
10. 是否误修改 `docs/FRONTEND_HANDOFF.md`
11. git status 当前有哪些文件变化

### 报告格式

```
### Commit 前检查报告

DEBUG 文件：
- 发现 / 未发现
- 处理方式：xxx

console.log：
- 发现 / 未发现

临时代码：
- 发现 / 未发现

PROJECT_STATUS.md：
- 已更新 / 未更新
- 更新摘要：xxx

需确认文档：
- docs/API_CONTRACT.md：未修改 / 已修改（需说明）
- docs/FRONTEND_HANDOFF.md：未修改 / 已修改（需说明）

结论：
- 建议提交
- 或不建议提交，原因：xxx
```

### 阻断规则

如果检查发现以下情况，不允许自动 commit，必须先报告给我确认：

- DEBUG 文件未归档到 `docs/bug-reports/`
- 临时测试代码未清理
- `docs/PROJECT_STATUS.md` 未更新
- `docs/API_CONTRACT.md` 或 `docs/FRONTEND_HANDOFF.md` 被意外修改

## 十三、联调验收规则

页面开发完成后，不得直接标记为"完成"。

必须经过：

1. 编码完成
2. 前端验收
3. 后端联调
4. `docs/PROJECT_STATUS.md` 更新
5. Git Commit

后才可标记为：

> ✅ 已联调通过

### PROJECT_STATUS.md 状态规范

| 状态 | 标记 | 含义 |
|---|---|---|
| 开发完成但未联调 | `🔶 编码完成，待联调` | 代码已写完，前端自测通过，等待后端联调 |
| 联调通过 | `✅ 联调通过` | 后端联调验收全部通过 |
| 发现问题 | `❌ 联调失败（记录问题）` | 联调中发现问题，需修复后重新联调 |

### 联调记录要求

联调通过后必须在 `docs/PROJECT_STATUS.md` 中记录：

- 联调日期
- 实测接口
- 关键验证结果
- 是否发现问题
- 是否需要后续跟进
