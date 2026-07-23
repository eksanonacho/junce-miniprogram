# 前端架构说明

> 最后更新：2026-06-13

## 1. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | uni-app (Vue3) | 3.0 |
| 构建 | Vite | 5.2.8 |
| 状态管理 | Pinia | 2.0.33 |
| Vue | Vue 3 | 3.4.21 |
| 调试 | H5（浏览器） | — |
| 目标平台 | 微信小程序 | 待完整测试 |

## 2. 目录结构

```
juncai-app/
├── package.json
├── vite.config.js
├── index.html                  # H5 入口
├── src/
│   ├── main.js                 # 入口：挂载 Vue + Pinia
│   ├── App.vue                 # 根组件
│   ├── pages.json              # 页面路由（uni-app 花名册）
│   ├── manifest.json           # 端配置
│   ├── uni.scss                # 全局 SCSS 变量
│   ├── config/
│   │   └── index.js            # BASE_URL 集中配置
│   ├── utils/
│   │   └── request.js          # 统一请求封装（get/post/patch/put）
│   ├── stores/
│   │   └── user.js             # Pinia store（token + user）
│   ├── pages/
│   │   ├── login/login.vue              # 登录页
│   │   ├── customer-list/customer-list.vue  # 客户列表
│   │   ├── customer-form/customer-form.vue  # 客户填单
│   │   ├── customer-detail/customer-detail.vue # 客户详情
│   │   ├── customer-edit/customer-edit.vue   # 客户编辑
│   │   ├── service-template-select/service-template-select.vue  # 服务模板选择
│   │   ├── staff-config/staff-config.vue     # 人员配置
│   │   ├── workorder-list/workorder-list.vue   # 办件列表
│   │   ├── workorder-create/workorder-create.vue # 创建办件
│   │   ├── workorder-detail/workorder-detail.vue # 办件详情
│   │   ├── charge-detail/charge-detail.vue     # 收费详情（多模式）
│   │   ├── charge-unpaid-list/charge-unpaid-list.vue # 未收款列表
│   │   ├── tenant-detail/tenant-detail.vue     # 托管入档（多模式）
│   │   ├── task-list/task-list.vue         # 任务列表
│   │   ├── task-detail/task-detail.vue     # 任务详情
│   │   ├── task-create/task-create.vue     # 创建任务
│   │   ├── fission-list/fission-list.vue     # 裂变列表
│   │   ├── fission-detail/fission-detail.vue # 裂变详情
│   │   ├── fission-create/fission-create.vue # 裂变创建
│   │   ├── manual-business/manual-business.vue # 经营看板
│   │   ├── manual-salary/manual-salary.vue   # 工资看板
│   │   ├── dashboard/dashboard.vue       # 数据看板
│   │   └── index/index.vue              # 默认页（非首页）
│   └── static/
│       └── logo.png
└── docs/                       # 项目文档
    ├── API_CONTRACT.md         # 接口契约
    ├── FRONTEND_HANDOFF.md     # 交接手册
    └── ...                     # 其他文档
```

> `src/components/` 暂未建立——客户模块 5 个页面均独立实现，未抽取公共组件。

## 3. 路由和页面

`pages.json` 管理所有页面路由，数组第一项为首页（当前：`pages/login/login`）。

**当前已注册页面**（23 个）：

| 路由 path | 页面 | 说明 |
|---|---|---|
| `pages/login/login` | 登录页 | 首页 |
| `pages/customer-list/customer-list` | 客户列表 | 登录后落地页 |
| `pages/customer-form/customer-form` | 客户填单 | navigateTo 进入 |
| `pages/customer-detail/customer-detail` | 客户详情 | navigateTo + ?id= |
| `pages/customer-edit/customer-edit` | 客户编辑 | navigateTo + ?id= |
| `pages/service-template-select/service-template-select` | 服务模板选择 | navigateTo + ?customerId= |
| `pages/staff-config/staff-config` | 人员配置 | navigateTo + ?customerId= |
| `pages/workorder-list/workorder-list` | 办件列表 | 直接访问或代码入口 |
| `pages/workorder-create/workorder-create` | 创建办件 | navigateTo + ?serviceItemId=&customerId= |
| `pages/workorder-detail/workorder-detail` | 办件详情 | navigateTo + ?id= |
| `pages/charge-detail/charge-detail` | 收费详情 | ?id= 或 ?customerId=&mode=create |
| `pages/charge-unpaid-list/charge-unpaid-list` | 未收款列表 | 直接访问 |
| `pages/tenant-detail/tenant-detail` | 托管入档 | ?id= 或 ?customerId=&mode=create |
| `pages/task-list/task-list` | 任务列表 | 直接访问 |
| `pages/task-detail/task-detail` | 任务详情 | navigateTo + ?id= |
| `pages/task-create/task-create` | 创建任务 | navigateTo（主管/管理员） |
| `pages/fission-list/fission-list` | 裂变列表 | 直接访问 |
| `pages/fission-detail/fission-detail` | 裂变详情 | navigateTo + ?id= |
| `pages/fission-create/fission-create` | 裂变创建 | navigateTo（所有人） |
| `pages/manual-business/manual-business` | 经营看板 | 直接访问（主管/总务/管理员） |
| `pages/manual-salary/manual-salary` | 工资看板 | 直接访问（主管/总务/管理员） |
| `pages/dashboard/dashboard` | 数据看板 | 直接访问（主管/管理员） |
| `pages/index/index` | 默认页 | 非业务页 |

## 4. 请求封装

**文件**：`src/utils/request.js`

**导出**：`get(url, params)` / `post(url, data, opts)` / `patch(url, data)` / `put(url, data)`

- 自动拼接 `BASE_URL`（从 `src/config/index.js` 读取）
- 自动带 `Authorization: Bearer <token>`（从 Pinia store 读取）
- 登录请求传 `{ skipAuth: true }` 跳过 token
- 超时：15000ms
- 状态码统一处理：200/201 正常返回 / 400 弹后端 message / 401 按 skipAuth 分流 / 403 弹"无权限" / 409 弹后端 message / 500 弹"服务器异常" / 其他弹"请求失败"
- toast 由 request.js 统一负责，页面层只做 loading 和表单校验 toast

## 5. 登录状态管理

**文件**：`src/stores/user.js`

- Pinia `defineStore('user', () => {...})` 组合式写法
- `token`：ref，初始从 `uni.getStorageSync('accessToken')` 恢复
- `user`：ref，初始从 `uni.getStorageSync('user')` JSON.parse 恢复
- `isLoggedIn`：computed，基于 token 是否有值
- `setLoginInfo(accessToken, user)`：内存 + 缓存双写
- `clearLoginInfo()`：内存 + 缓存双清

## 6. 401 处理

**两种 401 语义分流（skipAuth）**：

| 类型 | 条件 | 行为 |
|---|---|---|
| 认证类 401 | `skipAuth === true` | 弹后端 message（如"用户名或密码错误"），不清登录态，不跳转 |
| 业务类 401 | `skipAuth === false` | clearLoginInfo + toast "登录已过期" + reLaunch 登录页 |

**防重复跳转锁**：模块级 `isRedirecting`，在 reLaunch 的 complete 回调中自解锁，防止并发 401 重复触发。

## 7. 页面开发规范

1. 页面开工前先查 `API_CONTRACT.md` 对应接口
2. 先写 Plan 再写代码，Plan 经确认后编码
3. 一个页面一个页面做，验证通过才进下一个
4. 做完必须更新 `PROJECT_STATUS.md`
5. 不确定字段不得猜，记录到待确认事项
6. 使用 `<script setup>` + 组合式 API（ref 等）
7. toast 由 request.js 负责，页面层只做 loading 和表单校验 toast
