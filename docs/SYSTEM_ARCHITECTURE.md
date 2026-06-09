# SYSTEM_ARCHITECTURE.md — 系统架构说明

> **这个文件是给谁看的**:任何接手项目的开发者或 AI。
> **什么时候用**:想搞清楚整个系统怎么分层、怎么运行、一个请求怎么从前端流到数据库再回来时。
> **解决什么问题**:建立对系统整体结构的认知,知道代码各部分各司其职。
> 最后更新:2026-06-09。

---

## 一、总体架构图

```
┌─────────────────────────────┐
│       uni-app 前端           │  Vue3,微信小程序 + H5
│  (页面 / Pinia / 请求封装)    │
└──────────────┬──────────────┘
               │  HTTP API (JSON, 带 JWT token)
               ▼
┌─────────────────────────────┐
│      NestJS Controller       │  接请求、出响应(前台接待)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Service             │  业务逻辑(真正干活的)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Prisma              │  数据访问层(ORM,替你写 SQL)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        PostgreSQL            │  数据库(数据最终存这里)
└─────────────────────────────┘
```

一句话:**前端发 HTTP 请求 → 后端 Controller 接住 → Service 处理业务 → Prisma 操作数据库 → PostgreSQL 存取 → 原路返回 JSON。**

---

## 二、前端架构

- **框架**:uni-app(Vue3 写法)。
- **目标平台**:微信小程序为最终目标,调试阶段先用 H5(浏览器跑,快)。
- **H5 和微信小程序的关系**:同一套 uni-app 代码,编译时选不同目标即可分别产出 H5 和小程序。开发先用 H5 调通逻辑,再用微信开发者工具预览小程序、处理跨端差异(用条件编译 `#ifdef MP-WEIXIN` 处理平台特有代码)。
- **页面目录**(建议):`src/pages/` 下按模块分文件夹,如 `pages/auth/`(登录)、`pages/customer/`(填单/列表/详情/编辑)。
- **登录状态**:登录成功后,token 和用户信息存进 Pinia + 本地存储(uni.setStorageSync)。后续请求自动带 token。token 失效(401)清除并跳回登录页。
- **API 调用封装建议**:封装一个统一的 request 方法——自动拼 BASE_URL、自动加 `Authorization: Bearer <token>` 头、统一处理错误码(401 跳登录、其他弹提示)。BASE_URL 配成一个变量,便于切换联调地址。

---

## 三、后端架构

- **框架**:NestJS(TypeScript)。强制模块化,代码组织整齐。
- **核心概念**:
  - **Module(模块)**:一个功能块,把相关的东西打包(如 AuthModule)。
  - **Controller(控制器)**:接请求、返响应,像前台接待,不写复杂逻辑。
  - **Service(服务)**:真正的业务逻辑写这里。
  - **DTO(数据传输对象)**:定义接口入参格式 + 自动校验。
  - **Guard(守卫)**:在请求进 Controller 前做拦截检查(如登录校验、权限校验)。
- **当前已有模块**:
  - **PrismaModule**:全局模块,提供数据库访问服务(PrismaService),其他模块注入即可用。
  - **AuthModule**:登录、签发 JWT、提供守卫和 @Roles() 装饰器。含 /auth/login、/auth/me、/auth/admin-only。
  - **CustomersModule**:客户增删改查。含 POST/GET/GET:id/PATCH /customers。

---

## 四、认证与权限

### JWT 是什么
JWT(JSON Web Token)= 一张"加密的房卡"。登录时验证账号密码 → 发一张 token(房卡),里面加密记录了你是谁、什么角色、何时过期。之后每个请求带上它,后端刷卡验证,不用每次重新登录。token 里存了 roleCode,权限检查直接看 token 即可,不必每次查库。

### 双守卫机制
| 守卫 | 检查什么 | 不通过 |
|---|---|---|
| **JwtAuthGuard** | token 存在吗?有效吗?过期/篡改了吗? | 返回 **401** |
| **RolesGuard** | 你的角色在接口允许的名单里吗? | 返回 **403** |

### @Roles() 怎么用
在接口方法上加装饰器,声明"哪些角色能访问":
```
@Roles(RoleCode.ADMIN, RoleCode.GENERAL_AFFAIRS)  // 只有管理员和总务能访问
```
配合 JwtAuthGuard(先确认登录)+ RolesGuard(再确认角色)使用。
- 只挂 JwtAuthGuard 的接口:登录了就能访问(如 /auth/me)。
- 同时挂 JwtAuthGuard + RolesGuard + @Roles(...) 的接口:登录 + 角色匹配才能访问(如 /auth/admin-only)。

### 401 和 403 的区别(重要)
- **401 Unauthorized**:你**没登录 / 登录态无效**(没带 token、token 过期、密码错)。
- **403 Forbidden**:你**登录了,但没权限**(角色不在允许名单)。
- 前端处理:401 → 跳登录页;403 → 提示"无权限操作"。

### 权限硬约束
涉及资金、合同、发票的接口,必须 `@Roles(总务, 管理员)`,只允许这两个角色操作。

---

## 五、数据访问层(Prisma)

- **Prisma 的作用**:ORM(对象关系映射)。你用 TypeScript 写"查客户、建客户"这样的代码,Prisma 自动翻译成 SQL 去操作 PostgreSQL,并把结果转成对象返回。
- **为什么不手写 SQL**:
  - 类型安全——字段写错、类型不对,编译期就报错,不用等运行时炸。
  - 防 SQL 注入——Prisma 自动处理参数,比手拼 SQL 安全。
  - 迁移可控——表结构改动通过 migration 版本化管理,有记录可追溯。
  - 可读可维护——代码比裸 SQL 清晰。
- **注意**:本项目 Prisma 已固定 `moduleFormat = "cjs"`(解决 NestJS 的 ESM/CJS 冲突),不要删这行。

---

## 六、模块开发规范

每新增一个业务模块,按这套标准流程做(以保证结构统一):

1. **Prisma model**:先在 schema.prisma 定义数据表,跑 migration 建表。
2. **module**:创建该功能的 NestJS module。
3. **dto**:定义接口入参 + 校验规则。
4. **service**:写业务逻辑(操作 Prisma)。
5. **controller**:定义接口路由,挂上需要的 Guard 和 @Roles()。
6. **curl 测试**:用 curl 验证每个接口(带 `--noproxy "*"`),确认增删改查都对。
7. **写入 .docs**:把这个模块做了什么、踩了什么坑、怎么测,记进开发日志。
8. **出接口说明**:更新 API_CONTRACT.md,交给前端对接。

> 原则:先后端核心、再前端;一次 1-2 个模块;每个模块验证通过再下一个;不一次写全部。

---

## 七、当前请求链路示例(以 POST /customers 为例)

```
1. 前端
   用户在填单页填好企业信息,点提交
   request 方法自动加 Authorization: Bearer <token>,POST 到 /customers

2. JwtAuthGuard(守卫)
   检查 token 是否有效
   - 无效 → 直接返回 401,流程结束
   - 有效 → 解析出当前用户身份(含 userId、roleCode),放行

3. Controller(customers.controller)
   接住请求,拿到 body 和当前用户身份
   调用 Service

4. Service(customers.service)
   业务逻辑:
   - 校验字段(companyName、customerCategory 必填)
   - ownerId 取当前登录用户的 id(从 token,不信任前端)
   - lifecycleStage 默认"填单"
   - 调用 Prisma 写入

5. Prisma
   把"建客户"翻译成 SQL,执行 INSERT

6. PostgreSQL
   把客户数据写入 customers 表,返回新记录

7. 原路返回
   Prisma 返回对象 → Service 处理(金额 Decimal 转数字)→ Controller →
   前端收到 JSON(含 id、ownerId、createdAt、owner 嵌套对象)
```

> 这条链路是所有接口的通用模式。理解了这一条,其他接口(列表、详情、修改)都是同样的流动,只是 Service 里的业务逻辑不同。
