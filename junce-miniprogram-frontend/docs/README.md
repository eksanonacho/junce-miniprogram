# 君册财税 — 内部管理小程序（前端）

## 1. 项目简介

青岛君册财税服务公司内部员工使用的客户管理微信小程序。管理客户从进来到服务完成的全过程。

第一阶段只做**客户管理模块**，当前仅开发以下 5 个页面：

1. 登录页
2. 客户填单页
3. 客户列表页
4. 客户详情页
5. 客户编辑页

办件、费用、任务、看板等模块后续再排。

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | uni-app (Vue 3) |
| 构建工具 | Vite 5.2 |
| 状态管理 | Pinia 2.0.33 |
| 目标平台 | 微信小程序（调试阶段以 H5 为主） |
| 后端 | 已由搭档完成，前端只对接接口 |

## 3. 项目目录结构

```
juncai-app/
├── index.html                  # H5 入口 HTML
├── package.json                # 依赖与 npm scripts
├── vite.config.js              # Vite 构建配置
├── API_CONTRACT.md             # 接口契约（最高优先级）
├── PROJECT_PLAN.md             # 项目计划与铁律
├── FRONTEND_HANDOFF.md         # 前端交接文档
├── ../CLAUDE.md                # 仓库根目录唯一的 AI 助手指令
└── src/
    ├── main.js                 # 入口文件：挂载 Vue + Pinia
    ├── App.vue                 # 根组件
    ├── pages.json              # 页面路由配置与全局样式
    ├── manifest.json           # uni-app 端配置
    ├── uni.scss                # 全局 SCSS 变量
    ├── shime-uni.d.ts          # TypeScript 类型声明
    ├── config/
    │   └── index.js            # BASE_URL 集中配置（唯一改地址的地方）
    ├── stores/                 # 待创建 — Pinia 仓库（token、user）
    ├── utils/                  # 待创建 — 请求封装等工具函数
    ├── pages/
    │   └── index/
    │       └── index.vue       # 默认示例页（后续替换为业务页面）
    └── static/
        └── logo.png            # 静态资源
```

| 目录 | 用途 |
|---|---|
| `src/config/` | 全局配置（BASE_URL 等） |
| `src/stores/` | Pinia 状态管理（待创建） |
| `src/utils/` | 工具函数、请求封装（待创建） |
| `src/pages/` | 业务页面 |
| `src/static/` | 图片等静态资源 |

## 4. 开发启动命令

```bash
# H5 调试（浏览器运行，开发阶段主力）
npm run dev:h5

# 微信小程序调试
npm run dev:mp-weixin

# H5 构建
npm run build:h5

# 微信小程序构建
npm run build:mp-weixin
```

## 5. 文档优先级

若文档之间有冲突，以优先级高的为准：

1. **API_CONTRACT.md**（最高 — 接口字段、枚举值、返回格式）
2. **PROJECT_PLAN.md**（项目铁律、开发顺序、页面要点）
3. **FRONTEND_HANDOFF.md**（前端交接说明，最低优先级）

## 6. Claude Code 工作流

每次开始任务前，必须先阅读：
- `../../CLAUDE.md`
- `PROJECT_PLAN.md`
- `API_CONTRACT.md`
- `FRONTEND_HANDOFF.md`
- `PROJECT_STATUS.md`

开发流程：
1. **分析** — 理解需求，对照文档确认接口和字段
2. **出计划** — 写出实现方案，列出要改的文件
3. **等确认** — 等待负责人确认计划，确认后才动手
4. **改代码** — 按计划修改，不超出范围
5. **验证** — 启动 H5 检查，给出测试方法
6. **更新 PROJECT_STATUS.md** — 记录完成内容

**严禁**：未确认计划就改代码。

## 7. 开发规范

- **只做前端**，不修改后端代码、数据库、接口
- **不发明接口字段**，所有字段以 `API_CONTRACT.md` 为准，一字不差
- **BASE_URL 统一配置**在 `src/config/index.js`，绝不在请求中写死地址
- **一次只做一个页面**，验证通过再进下一个
- **每个页面完成后**必须给出测试方法（怎么点、看到什么算成功）
- **枚举值用中文原值**：`新用户`/`代理户`、`一人公司`/`多股东`/`个体户`、`VIP`/`优质`/`中低`/`零申报`
- **新建客户不传** `ownerId` 和 `lifecycleStage`
- **修改客户只传改动字段**（PATCH）
- **出现错误立即停止**并贴完整报错，不自行尝试修复
- 不写死真实客户数据，不外传测试账号和后端地址

## 8. 联调说明

- **BASE_URL** 当前为 `http://localhost:3000`（占位值），联调时由后端提供真实地址，只改 `src/config/index.js` 一处
- **CORS**：H5 浏览器请求后端可能遇到跨域，需与后端确认是否已开启 CORS
- **代理/VPN**：本机开代理可能导致 502，联调时临时关闭代理或添加绕过规则
- **测试账号**：`shangwu / 123456`（商务岗，能建客户）
