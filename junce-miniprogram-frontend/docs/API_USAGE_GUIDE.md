# 前端接口调用实战指南

> 基于 `docs/API_CONTRACT.md` 和当前前端实际代码编写。

## 1. 登录流程

```js
import { post } from '@/utils/request.js'
import { useUserStore } from '@/stores/user.js'

const res = await post('/auth/login', {
  username: 'shangwu',
  password: '123456'
}, { skipAuth: true })

const userStore = useUserStore()
userStore.setLoginInfo(res.accessToken, res.user)
uni.reLaunch({ url: '/pages/customer-list/customer-list' })
```

- 登录接口 **不需要 token**（`skipAuth: true`）
- 成功后用 `setLoginInfo` 双写内存 + 本地缓存
- 后续所有需要登录的请求自动从 store 读取 token

## 2. token 使用规则

- 所有需登录的接口自动带 `Authorization: Bearer <token>`（由 `request.js` 统一处理）
- 不要在页面手动拼接 token
- token 从 `useUserStore().token` 获取

## 3. 401 / 403 处理

| 场景 | HTTP | 前端行为 |
|---|---|---|
| 登录密码错 | 401（skipAuth=true） | 弹后端 message（如"用户名或密码错误"） |
| token 过期 | 401（skipAuth=false） | clearLoginInfo + toast + reLaunch 登录页 |
| 角色无权限 | 403 | toast "无权限"，不跳登录 |

## 4. Customers 接口

### POST /customers（新建客户）

```js
await post('/customers', {
  companyName: '测试公司',
  customerCategory: '新用户',
  tier: '优质'
})
```

- **不传** `ownerId`（后端自动取当前登录用户）
- **不传** `lifecycleStage`（后端默认"填单"）
- 枚举值用中文原值

### GET /customers（客户列表）

```js
const list = await get('/customers')
// list 是数组 [{ id: 1, companyName: '...', ... }]
// 不是 { code, data } 包装结构
```

### GET /customers/:id（客户详情）

```js
const customer = await get(`/customers/${id}`)
// customer 是单个对象
```

### PATCH /customers/:id（修改客户）

```js
// 只传修改的字段
await patch(`/customers/${id}`, { tier: 'VIP' })
```

## 5. Users 接口

```js
// 获取所有用户
const users = await get('/users')

// 按角色筛选（用于人员配置下拉）
const accountants = await get('/users', { roleCode: '会计' })
```

## 6. ServiceTemplates / ServiceItems

先获取模板列表 → 用户选择 → 批量创建服务项：

```js
const templates = await get('/service-templates')
// 用户勾选后
await post(`/customers/${customerId}/service-items`, {
  templateIds: [1, 3]
})
```

已读确认：
```js
await post('/service-read-confirmations', {
  customerId: 1,
  templateId: 1
})
```

## 7. StaffAssignments 人员配置

```js
// 查询
const assignment = await get(`/customers/${customerId}/staff-assignment`)

// 配置（upsert，只传要配的）
await uni.request({
  method: 'PUT',
  url: `${BASE_URL}/customers/${customerId}/staff-assignment`,
  data: { businessStaffId: 2, accountantId: 3 }
})
```

## 8. WorkOrders 办件

```js
// 创建办件
await post('/work-orders', { serviceItemId: 1, handlerId: 2 })

// 更新办件（只传要改的）
await patch(`/work-orders/${id}`, { status: '办件中' })

// 办结打卡（不能 PATCH status 到"已打卡"）
await post(`/work-orders/${id}/check-in`, {
  archiveFiles: [{ name: 'xxx.pdf', url: '...' }]
})
```

## 9. Charges 收费

```js
// 创建收费记录
await post('/charges', {
  customerId: 1,
  chargeMode: '一次性',
  amount: 5000
})

// 确认已收（限总务+管理员）
await post(`/charges/${id}/confirm`)

// 发起催收（限总务+管理员）
await post(`/charges/${id}/remind`, {
  toUserId: 2,
  message: '请尽快缴费'
})
```

## 10. TenantRegisters 托管入档

```js
// 仅代理户可创建
await post('/tenant-registers', { customerId: 1 })

// 分派会计（限主管+管理员）
await post(`/tenant-registers/${id}/assign-accountant`, {
  accountantId: 3
})

// 会计确认（须本人或管理员）
await post(`/tenant-registers/${id}/confirm-assignment`)
```

## 11. Tasks 任务

```js
// 主管创建任务（限主管+管理员）
await post('/tasks', {
  title: '完成客户资料审核',
  toUserId: 2,
  deadline: '2026-06-15'
})

// 确认任务（toUserId 本人或管理员）
await post(`/tasks/${id}/confirm`)

// 完成任务（toUserId 本人或管理员）
await post(`/tasks/${id}/complete`)
```

**禁止 PATCH status**：任务状态只能通过 confirm / complete 动作接口流转。
