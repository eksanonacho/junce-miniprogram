# CODEX_HANDOFF.md — Codex 接手说明

> **给谁看**：Codex（接手前端 UI 优化的 AI agent）
> **什么时候读**：每次开始任务前先通读本文档
> **解决什么问题**：独立理解项目状态、优化边界、验收标准和已知踩坑，不需要人工解释上下文

---

## 1. 项目背景

| 维度 | 说明 |
|---|---|
| 项目名称 | 君册财税内部管理小程序 |
| 技术栈 | uni-app + Vue3 + Vite + 微信小程序端 + H5 辅助调试 |
| 项目性质 | **真实公司内部管理系统**，不是 demo、课程作业、展示页 |
| 前端优化目标 | 专业、稳定、清晰、有秩序感、有产品感，适合财税公司内部员工长期使用 |

**不要的风格**：demo 感、通用 SaaS 模板感、大面积亮蓝、渐变、巨大按钮、只换颜色就声称产品化。

---

## 2. 当前状态

- **55/55** 业务接口已联调通过
- 后端默认地址 `localhost:3000`，前端 `src/config/index.js` 中配置
- 前端 **23 个页面**，已经历一轮 V1 UI 产品化优化
- `home.vue` 是当前 **V1 UI 样板页**
- 中文 CSS class 已清理，状态样式使用英文 class 映射（如 `status-todo`、`status-unpaid`）
- H5 和 mp-weixin 曾多次编译通过

**注意**：后续所有 UI 验收以微信开发者工具真实显示为准，不能只凭自评报告判断完成。

---

## 3. Codex 接手前必须先读的文件

按顺序阅读：

| # | 文件 | 内容 |
|---|---|---|
| 1 | `CLAUDE.md` | 项目铁律、开发流程、禁止事项 |
| 2 | `docs/PROJECT_STATUS.md` | 当前项目进度、接口完成情况、阶段状态 |
| 3 | `docs/FRONTEND_ARCHITECTURE.md` | 前端目录结构、request 封装、页面组织 |
| 4 | `docs/PAGE_ROADMAP.md` | 页面清单、优化路线、Future Task |
| 5 | `docs/DEBUG_NOTES.md` | 已知踩坑、WXSS 问题、中文 class 问题、sed 批量问题 |
| 6 | `src/pages/home/home.vue` | 当前 V1 UI 样板页 |
| 7 | `docs/CODEX_HANDOFF.md` | 本文档 |

如果某个文档不存在，先报告，不要凭空假设项目状态。

---

## 4. 绝对禁止事项

- ❌ 一次性大改全项目
- ❌ 批量 sed 注入 CSS
- ❌ 只换颜色就声称"产品化完成"
- ❌ 修改 script 业务逻辑
- ❌ 修改接口请求逻辑
- ❌ 修改 request.js
- ❌ 修改 store
- ❌ 修改 pages.json
- ❌ 修改权限逻辑
- ❌ 修改跳转路径
- ❌ 修改 POST / PATCH body、PATCH diff
- ❌ 修改上传逻辑、状态流转逻辑、登录 token 存储逻辑
- ❌ 伪造接口数据、新增假统计
- ❌ 引入 UI 库、动画库
- ❌ commit / push

**如果必须修改 script 才能完成 UI 需求，先停止并报告，不允许直接改。**

---

## 5. 允许修改范围

优先允许修改当前验收页面的：

- template 展示结构（不影响逻辑）
- class 名
- style 样式
- 页面布局、卡片结构、表单分组
- 状态展示区域
- 操作按钮视觉
- 空状态 / loading / error 状态视觉
- 纯展示 section / card header / 辅助说明

**原则**：一次只改 1-2 个页面，改完必须编译 + 微信开发者工具截图验收。

---

## 6. UI 视觉基准

以 `src/pages/home/home.vue` 的 V1 视觉语言为参考，但不要机械复制。

**基础色彩**：

| 角色 | 色值 |
|---|---|
| 页面背景 | `#F6F7F9` |
| 卡片背景 | `#FFFFFF` |
| 主文字 | `#111827` |
| 正文 | `#374151` / `#6B7280` |
| 弱文字 | `#9CA3AF` |
| 边框 | `#E5E7EB` / `#F3F4F6` |
| 主色 | `#1D4ED8` |
| 成功色 | `#10B981` |
| 警告色 | `#F59E0B` |
| 错误色 | `#EF4444` |

**禁止使用**：`#007aff`、`linear-gradient`、大面积亮蓝、大面积绿色横条、花哨阴影、中文 CSS class。

---

## 7. 微信小程序 WXSS 规则

微信小程序端必须保证 WXSS 能编译。

**禁止嵌套 CSS**：
```css
/* ❌ 错误 */
.a { .b { } }

/* ❌ 错误（未声明 lang="scss"） */
.btn { &:active { } }

/* ✅ 正确 */
.a { }
.b { }
.btn:active { }
```

**重要踩坑**：之前 sed 批量注入 `.form-section-label`，把 CSS 插进 `.container {}` 内部，导致 `WXSS unexpected {`。因此不允许批量 sed 盲插 CSS，每次改 CSS 后必须跑 mp-weixin 编译。

---

## 8. 状态标签规则

**禁止中文 CSS class**（如 `status-待办`、`status-已完成`、`status-未收`）。

**必须使用英文 class**：

| 中文状态 | 英文 class |
|---|---|
| 待办 | `status-todo` |
| 待确认 | `status-pending` |
| 办件中 / 进行中 | `status-processing` |
| 办结 / 已完成 | `status-done` / `status-completed` |
| 已打卡 | `status-checked` |
| 已收 | `status-paid` |
| 未收 | `status-unpaid` |
| 已确认 | `status-confirmed` |
| 已归档 | `status-archived` |
| 无效 | `status-invalid` |

中文状态值通过 `getXxxStatusClass()` 函数映射为英文 class。该函数属于 UI class 映射，不得改变业务状态含义。

---

## 9. 开发与验收流程

每次接到任务时，先判断：
1. 是 UI 问题还是业务问题
2. 是 WXSS 编译问题还是页面观感问题
3. 是否需要改代码、只需改哪个文件、是否会影响业务逻辑

**每次修改后必须输出**：
1. 修改了哪些文件
2. 修改了 template / style / script 哪部分
3. 是否改了业务逻辑、接口逻辑、跳转路径、提交 body
4. 是否改了 request.js / store / pages.json
5. mp-weixin 编译结果
6. 是否有 WXSS unexpected 报错
7. 是否有 #007aff / console.log
8. P0/P1/P2
9. 是否建议重新在微信开发者工具截图验收

---

## 10. 编译与微信开发者工具

**常用命令**：
```bash
npm run dev:h5              # H5 调试
npm run dev:mp-weixin       # 微信小程序开发构建（热更新）
npx uni build -p mp-weixin  # 微信小程序生产构建
```

**微信开发者工具导入**：`dist/dev/mp-weixin`（dev 命令产物）或 `dist/build/mp-weixin`（build 命令产物）。

游客模式下可能出现 `wx.operateWXData` 受限等警告，这些通常是微信开发者工具 / AppID / 游客模式问题，不等于页面代码错误。

真正需要优先处理的是：`WXSS unexpected`、`Cannot read property`、`navigateTo fail`、`request 500/502`、页面白屏。

---

## 11. 后端说明

- 默认后端地址：`localhost:3000`
- 前端 `src/config/index.js` 中 `BASE_URL` 指向该地址

Codex 接手时必须先确认：
1. 后端是否正在运行
2. 前端 BASE_URL 指向哪里
3. 微信开发者工具是否能请求到后端

**后端不可用时只能做**：静态 UI 验收、空状态验收、loading/error 状态验收、页面白屏检查、WXSS 编译验收。

**不能声称**：接口数据展示通过、表单提交通过、上传通过、状态流转通过、dashboard 真实统计通过。

---

## 12. Git 规则

当前阶段：**暂时不要 commit，暂时不要 push。**

最终提交前必须执行：
```bash
git status
git diff --name-only
git diff --stat
git diff --check
grep -R "#007aff" -n src/pages
grep -R "console.log" -n src/pages
grep -R "status-待" -n src/pages
grep -R "status-已" -n src/pages
grep -R "status-办" -n src/pages
grep -R "status-未" -n src/pages
grep -R "linear-gradient" -n src/pages
```

提交前确认：只修改允许文件、无 request.js/store/pages.json 修改、无临时/debug 文件、无 #007aff、无 console.log、无中文 CSS class、无 WXSS 编译错误。

---

## 13. Codex 当前第一步任务

**不要优化 UI。** 先输出《Codex 接手环境检查报告》。

必须检查：
1. git status
2. git diff --name-only
3. git diff --stat
4. 当前后端如何启动
5. 当前前端 BASE_URL 指向哪里
6. `npm run dev:mp-weixin` 是否能正常启动
7. 微信开发者工具应该导入哪个目录
8. 当前是否还有 WXSS 编译错误
9. 当前是否还有 #007aff / console.log / 中文 CSS class
10. 是否可以开始逐页截图验收

不要修改代码。不要 commit。不要 push。
