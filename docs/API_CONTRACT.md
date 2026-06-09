# API_CONTRACT.md — 前后端接口契约文档

> **这个文件是给谁看的**:前端开发者(及任何需要调用后端的人/AI)。
> **什么时候用**:开发前端、联调、排查接口问题时。
> **解决什么问题**:只看这一个文件,就知道怎么调用后端所有接口,不用看后端代码。
> 最后更新:2026-06-09。第 2–10 节接口已 curl 验证通过，第 11–12 节（Fission/看板）待后端开发。

---

## 一、通用约定

### Base URL
- 本地后端默认:`http://localhost:3000`
- 联调时由后端提供局域网 IP 或公网地址(如 `http://192.168.x.x:3000`)。
- **前端必须把 Base URL 配成一个变量(BASE_URL),不要写死在每个请求里。**

### 请求格式
- `Content-Type: application/json`(POST/PATCH 带 body 时必须)
- 需登录的接口,Header 必须带:`Authorization: Bearer <token>`(token 从登录接口获取)

### 返回格式
- 所有接口返回 JSON。
- 金额字段(如 annualRevenue)返回为普通数字(后端已处理 Decimal 序列化)。
- 中文在原始 JSON 里可能显示为 `\uXXXX` 编码,这是正常的,解析后即为中文。

### 错误状态码含义
| 状态码 | 含义 | 典型场景 |
|---|---|---|
| 200 | 成功 | 查询、修改成功 |
| 201 | 创建成功 | 新建资源(部分框架新建返回 201) |
| 400 | 请求参数错误 | 必填字段没传、字段格式不对、枚举值非法 |
| 401 | 未认证 | 没带 token、token 过期/无效、登录密码错 |
| 403 | 无权限 | 登录了,但角色不允许访问该接口 |
| 404 | 找不到 | 访问的资源 ID 不存在、URL 写错 |
| 500 | 服务器内部错误 | 后端代码异常(需联系后端排查) |

> 前端处理建议:401 → 清 token 跳登录页;403 → 提示"无权限";400 → 显示后端返回的 message;500 → 提示"服务器异常,请稍后重试"并告知后端。

---

## 二、Auth 接口

### 2.1 POST /auth/login — 登录
- **用途**:账号密码登录,获取 token 和用户信息。
- **方法**:POST
- **URL**:`/auth/login`
- **是否需要 token**:否
- **请求参数(body)**:
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | username | string | 是 | 用户名 |
  | password | string | 是 | 密码 |
- **请求示例**:
```json
{ "username": "admin", "password": "123456" }
```
- **返回示例**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 6,
    "username": "admin",
    "realName": "管理员周八",
    "roleCode": "管理员",
    "roleName": "管理员/老板"
  }
}
```
- **常见错误**:
  - 401 `{"message":"用户名或密码错误","error":"Unauthorized","statusCode":401}` — 账号或密码错。

### 2.2 GET /auth/me — 获取当前登录用户
- **用途**:用 token 查询当前登录的是谁(前端确认登录态、显示用户信息用)。
- **方法**:GET
- **URL**:`/auth/me`
- **是否需要 token**:是
- **请求参数**:无(身份从 token 解析)
- **返回示例**:
```json
{
  "id": 6,
  "username": "admin",
  "realName": "管理员周八",
  "phone": null,
  "roleCode": "管理员",
  "roleName": "管理员/老板"
}
```
- **常见错误**:
  - 401 `{"message":"未提供有效的认证令牌",...}` — 没带 token 或 token 失效。

### 2.3 GET /auth/admin-only — 权限测试接口
- **用途**:验证 RBAC 权限是否生效的示例接口(仅管理员可访问)。**这是测试用接口,前端业务一般不调用。**
- **方法**:GET
- **URL**:`/auth/admin-only`
- **是否需要 token**:是,且角色必须是「管理员」
- **返回示例**(管理员访问):
```json
{
  "message": "欢迎,管理员!你成功访问了受保护的接口。",
  "timestamp": "2026-06-03T08:48:39.495Z"
}
```
- **常见错误**:
  - 401 — 没带 token。
  - 403 `{"message":"权限不足:需要 [管理员] 角色,当前为 商务",...}` — 登录了但不是管理员。

---

## 三、Customers 接口

> 所有 customers 接口都**需要 token**。本批次所有登录角色均可访问(细粒度数据权限待客户提供权限表后再加)。

### 3.1 POST /customers — 新建客户
- **用途**:主理人填单提单,新建一个客户。
- **方法**:POST
- **URL**:`/customers`
- **是否需要 token**:是
- **请求参数(body)**:
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | companyName | string | 是 | 企业名称 |
  | customerCategory | 枚举 | 是 | 见枚举说明 |
  | industry | string | 否 | 行业 |
  | registerDate | string(ISO日期) | 否 | 注册时间,如 "2024-01-01" |
  | taxType | string | 否 | 税务类型 |
  | region | string | 否 | 区域 |
  | annualRevenue | number | 否 | 年流水(元),最多2位小数 |
  | staffCount | number | 否 | 人员数,整数 |
  | companyType | 枚举 | 否 | 见枚举说明 |
  | tier | 枚举 | 否 | 见枚举说明 |
- **不要传**:`ownerId`(后端自动取当前登录用户)、`lifecycleStage`(后端默认"填单")。
- **请求示例**:
```json
{
  "companyName": "测试科技有限公司",
  "industry": "互联网",
  "region": "深圳",
  "annualRevenue": 5000000,
  "staffCount": 50,
  "companyType": "多股东",
  "customerCategory": "新用户",
  "tier": "优质"
}
```
- **返回示例**:
```json
{
  "id": 4,
  "companyName": "测试科技有限公司",
  "industry": "互联网",
  "registerDate": null,
  "taxType": null,
  "region": "深圳",
  "annualRevenue": 5000000,
  "staffCount": 50,
  "companyType": "多股东",
  "customerCategory": "新用户",
  "tier": "优质",
  "lifecycleStage": "填单",
  "ownerId": 1,
  "createdAt": "2026-06-03T09:11:29.034Z",
  "updatedAt": "2026-06-03T09:11:29.034Z",
  "owner": { "id": 1, "realName": "商务张三" }
}
```
- **权限说明**:需登录。ownerId 自动绑定为当前登录用户(防篡改,不接受前端传)。
- **常见错误**:400(companyName 或 customerCategory 没传 / 枚举值非法)、401(没带 token)。

### 3.2 GET /customers — 客户列表
- **用途**:获取客户列表,支持筛选和搜索。
- **方法**:GET
- **URL**:`/customers`
- **是否需要 token**:是
- **查询参数(query,全部可选,可组合)**:
  | 参数 | 类型 | 说明 |
  |---|---|---|
  | tier | 枚举 | 按客户分层筛选 |
  | lifecycleStage | 枚举 | 按生命周期筛选 |
  | keyword | string | 模糊搜索公司名 |
- **组合示例**:`GET /customers?tier=VIP&lifecycleStage=填单&keyword=建筑`
- **返回示例**(按创建时间倒序的数组):
```json
[
  {
    "id": 4,
    "companyName": "测试科技有限公司",
    "industry": "互联网",
    "region": "深圳",
    "annualRevenue": 5000000,
    "staffCount": 50,
    "companyType": "多股东",
    "customerCategory": "新用户",
    "tier": "优质",
    "lifecycleStage": "填单",
    "ownerId": 1,
    "createdAt": "2026-06-03T09:11:29.034Z",
    "updatedAt": "2026-06-03T09:11:29.034Z",
    "owner": { "id": 1, "realName": "商务张三" }
  }
]
```
- **权限说明**:需登录。本批次所有登录角色可见全部(数据级权限待权限表)。

### 3.3 GET /customers/:id — 客户详情
- **用途**:获取单个客户的完整信息。
- **方法**:GET
- **URL**:`/customers/:id`(如 `/customers/1`)
- **是否需要 token**:是
- **路径参数**:id — 客户编号
- **返回示例**:返回单个客户对象(结构同上,含 owner 嵌套对象)。
- **常见错误**:404(id 不存在)、401(没带 token)。

### 3.4 PATCH /customers/:id — 修改客户
- **用途**:修改客户信息。
- **方法**:PATCH
- **URL**:`/customers/:id`
- **是否需要 token**:是
- **路径参数**:id — 客户编号
- **请求参数(body)**:只传**要改的字段**,没传的保持不变。
- **请求示例**:
```json
{ "tier": "VIP" }
```
- **返回示例**:返回更新后的完整客户对象(updatedAt 会变化)。
- **权限说明**:需登录。
- **常见错误**:404(id 不存在)、400(枚举值非法)、401(没带 token)。

---

## 四、ServiceTemplates + ReadConfirmation 接口

### 4.1 GET /service-templates — 服务模板列表
- **用途**:查询所有可用的服务模板，前端填单页选择服务类型后弹窗展示。
- **方法**:GET
- **URL**:`/service-templates`
- **是否需要 token**:是
- **查询参数(query,可选)**:

| 参数 | 类型 | 说明 |
|------|------|------|
| serviceType | string | 按服务类型筛选，如 `?serviceType=食品证` |

- **返回示例**:
```json
[
  {
    "id": 1,
    "serviceType": "注册",
    "requiredMaterials": ["待客户补充"],
    "processSteps": ["待客户补充"],
    "estimatedDuration": "待客户补充",
    "isActive": true,
    "createdAt": "2026-06-06T...",
    "updatedAt": "2026-06-06T..."
  }
]
```
- **权限说明**:需登录，所有角色可查。

### 4.2 GET /service-templates/:id — 模板详情
- **用途**:查询单个模板完整信息。
- **方法**:GET
- **URL**:`/service-templates/:id`
- **是否需要 token**:是
- **返回**:单个模板对象（结构同上）。
- **常见错误**:404(id 不存在)。

### 4.3 POST /service-read-confirmations — 提交已读确认
- **用途**:相关人员阅读模板内容后点击"已阅读/确认"。
- **方法**:POST
- **URL**:`/service-read-confirmations`
- **是否需要 token**:是
- **请求参数(body)**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | number | 是 | 客户 ID |
| templateId | number | 是 | 服务模板 ID |
| serviceItemId | number | 否 | 二期关联具体服务项，一期不传 |

- **不要传**:`userId`(后端自动取当前登录用户)。
- **请求示例**:
```json
{ "customerId": 1, "templateId": 1 }
```
- **返回示例**:
```json
{
  "id": 1,
  "customerId": 1,
  "serviceItemId": null,
  "templateId": 1,
  "userId": 6,
  "confirmedAt": "2026-06-06T...",
  "createdAt": "2026-06-06T...",
  "template": { "id": 1, "serviceType": "注册" },
  "user": { "id": 6, "realName": "管理员周八" }
}
```
- **权限说明**:需登录，所有角色可提交。同一人+同一客户+同一模板只能确认一次（重复返回 409）。
- **常见错误**:409(已确认)、404(模板或客户不存在)、401(没带 token)。

### 4.4 GET /service-read-confirmations — 查询确认记录
- **用途**:前端判断某客户某模板是否已被确认。
- **方法**:GET
- **URL**:`/service-read-confirmations`
- **是否需要 token**:是
- **查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | number | 是 | 客户 ID |
| templateId | number | 否 | 服务模板 ID（不传则返回该客户所有确认记录） |

- **请求示例**:`GET /service-read-confirmations?customerId=1&templateId=1`
- **返回示例**:确认记录数组，每条含 `template` 和 `user` 嵌套对象。
- **权限说明**:需登录。

---

## 五、ServiceItem + StaffAssignment 接口

### 5.1 POST /customers/:customerId/service-items — 批量添加服务项
- **用途**:主理人填单时给客户选择多个服务类型，一次请求批量创建。
- **方法**:POST
- **URL**:`/customers/:customerId/service-items`
- **是否需要 token**:是
- **请求参数(body)**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| templateIds | number[] | 是 | 服务模板 ID 数组 |

- **请求示例**:
```json
{ "templateIds": [1, 3, 10] }
```
- **返回**:
```json
{
  "created": [{ "id": 1, "serviceTemplate": { "serviceType": "注册" }, "status": "待办" }],
  "errors": [] 
}
```
- **errors 格式**:`string[]` 字符串数组，**不是对象数组**。示例：
  ```json
  "errors": [
    "客户已添加过 \"注册\"（模板 id=1），不能重复添加",
    "服务模板 id=999 不存在"
  ]
  ```
  前端直接 `v-for` 渲染文本，不要取 `error.templateId` 或 `error.message`。
- **重复添加**:同一客户+同一模板已存在时出现在 `errors` 数组，不抛异常。
- **权限**:需登录。TODO: 后续限商务岗/管理员。

### 5.2 GET /customers/:customerId/service-items — 客户服务项列表
- **方法**:GET
- **URL**:`/customers/:customerId/service-items`
- **是否需要 token**:是
- **返回**:数组，每条含 `serviceTemplate` 嵌套对象（含 materials/steps/duration）。

### 5.3 PATCH /service-items/:id — 修改服务项状态
- **用途**:本期只允许改 `status`。
- **方法**:PATCH
- **URL**:`/service-items/:id`
- **是否需要 token**:是
- **请求**:`{ "status": "办件中" }`
- **status 枚举**:`待办` / `办件中` / `办结`
- **不做**:不改 lifecycleStage、不触发交接、不上传材料（属于后续 WorkOrder 模块）。

### 5.4 PUT /customers/:customerId/staff-assignment — 配置人员(upsert)
- **方法**:PUT
- **URL**:`/customers/:customerId/staff-assignment`
- **是否需要 token**:是
- **请求参数**(全部可选,只传要配的):

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| businessStaffId | number | 否 | 业务岗(需业务/商务角色) |
| accountantId | number | 否 | 会计岗(需会计角色) |
| consultantId | number | 否 | 顾问岗(本期可空,TODO) |
| generalAffairsId | number | 否 | 总务岗(需总务角色) |

- **部分更新语义**:
  - **只传要改的字段**，未传字段保持原值不变
  - ❌ **不支持传 `null` 清空岗位**（DTO 校验为 `@IsInt()`，null 会 400）
  - ❌ **传 `0` 会因用户不存在而失败**（0 是合法整数但无对应用户）
  - 前端暂时不要做"清空岗位/不指定"选项，后续需要后端补能力
- **角色校验**:用户角色不匹配返回 400 + 说明。
- **返回**:各岗位人员详情(id+realName)。

### 5.5 GET /customers/:customerId/staff-assignment — 查人员配置
- **方法**:GET
- **URL**:`/customers/:customerId/staff-assignment`
- **是否需要 token**:是
- **未配置时**:返回 404。

---

---

## 六、Users 查询接口

### 6.1 GET /users — 用户列表
- **用途**:前端人员配置下拉选择框的数据源。
- **方法**:GET
- **URL**:`/users`
- **是否需要 token**:是
- **查询参数**(可选):

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roleCode | 枚举 RoleCode | 否 | 按角色筛选，如 `?roleCode=会计` |

- **返回示例**(不含 passwordHash):
```json
[
  {
    "id": 2,
    "username": "yewu",
    "realName": "业务李四",
    "phone": null,
    "role": { "code": "业务", "name": "业务岗" }
  }
]
```
- **排序**:按 roleId、id 升序，稳定不变。
- **非法 roleCode**:返回 400，提示合法值列表。
- **权限**:需登录。TODO: 后续限特定角色。

---

## 七、WorkOrder 办件流转 + 办结打卡接口

### 7.1 POST /work-orders — 创建办件
- **用途**:为某客户的服务项创建办件工单，指派对接人、回执接收人。
- **方法**:POST
- **URL**:`/work-orders`
- **是否需要 token**:是

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| serviceItemId | number | 是 | 服务项 ID |
| handlerId | number | 否 | 对接人用户 ID |
| receiptReceiverId | number | 否 | 回执接收人用户 ID |

- **规则**:customerId 自动取。同一 serviceItem 只能一个办件。
- **重复创建返回 409**:
```json
{
  "statusCode": 409,
  "message": "该服务项已存在办件工单，请勿重复创建",
  "error": "Conflict",
  "existingWorkOrder": {
    "id": 1,
    "customerId": 1,
    "serviceItemId": 1,
    "status": "已打卡",
    "handlerId": 2,
    "receiptReceiverId": 5,
    "createdAt": "2026-06-05T19:12:32.271Z",
    "serviceName": "注册"
  }
}
```

### 7.2 GET /work-orders — 办件列表
- **方法**:GET
- **URL**:`/work-orders`
- **Query**:`customerId` / `handlerId` / `status`，可选组合。

### 7.3 GET /work-orders/:id — 办件详情
- **方法**:GET
- **返回**:含 customer / serviceItem(含template) / handler / receiptReceiver 嵌套。

### 7.4 PATCH /work-orders/:id — 更新办件
- **方法**:PATCH
- **Body**(全部可选):

| 字段 | 类型 | 说明 |
|------|------|------|
| status | 枚举 | `待办`/`办件中`/`办结`。**禁止直接改"已打卡"** |
| handlerId | number | 对接人 |
| receiptReceiverId | number | 回执接收人 |
| archiveFiles | array | 归档材料 |

- **规则**:改 `办结` 自动写 completedAt；**PATCH 不允许改 `已打卡`** → 400。

### 7.5 POST /work-orders/:id/check-in — 办结打卡
- **方法**:POST
- **URL**:`/work-orders/:id/check-in`
- **Body**:`{ "archiveFiles": [...] }` — **必填，至少1项**，空数组返回 400。
- **前置**:status 必须 `办结`，否则 400。
- **效果**:status → `已打卡`，checkedInAt → 当前时间。

---

## 八、Charge 费用管控接口

> **权限硬约束**：PATCH / confirm / remind 限 **总务 + 管理员**（首次启用 @Roles()），商务/业务/会计/主管访问返回 403。

### 8.1 POST /charges — 创建收费记录
- **方法**:POST
- **URL**:`/charges`
- **是否需要 token**:是（一期所有登录角色，TODO: 后续可能限商务/总务/管理员）
- **Body**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | number | 是 | 客户 ID |
| chargeMode | 枚举 | 是 | `一次性` / `定金加尾款` |
| amount | number | 是 | 金额，Decimal(12,2)，≥0 |
| contractNo | string | 否 | 合同号 |
| invoiceNo | string | 否 | 发票号 |

- **规则**:同一客户只能一条 charge（重复返回 409 + existingCharge）。

### 8.2 GET /charges — 查询收费
- **方法**:GET
- **Query**:`customerId` / `chargeStatus`（`已收`/`未收`），可选组合。

### 8.3 GET /charges/:id — 收费详情
- **方法**:GET

### 8.4 PATCH /charges/:id — 修改收费信息 ⚠️
- **权限**:**总务 + 管理员**（@Roles）
- **Body**(全部可选):`chargeMode` / `amount` / `contractNo` / `invoiceNo`
- **禁止修改**:`chargeStatus`、`confirmedBy`、`confirmedAt`。状态变更只能通过 confirm。

### 8.5 POST /charges/:id/confirm — 确认已收费 ⚠️
- **权限**:**总务 + 管理员**（@Roles）
- **效果**:chargeStatus → `已收`，confirmedBy → 当前用户，confirmedAt → 当前时间
- **前置**:必须是 `未收`，否则 400

### 8.6 POST /charges/:id/remind — 发起催收 ⚠️
- **权限**:**总务 + 管理员**（@Roles）
- **Body**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| toUserId | number | 否 | 催收对象，不传默认客户主理人 |
| message | string | 否 | 催收备注 |

- **前置**:必须是 `未收`，已收后催收返回 400

### 8.7 GET /charges/:id/reminders — 查催收记录
- **方法**:GET

---

## 九、TenantRegister 托管入档接口（仅代理户）

> **硬约束**：只有 `customerCategory=代理户` 的客户才能创建，非代理户返回 400。

### 9.1 POST /tenant-registers — 创建托管入档 ⚠️
- **权限**：`@Roles('会计','主管','管理员')`
- **Body**：`{ customerId, enterpriseDetail?, servicePlan? }` — 两个 JSON 字段内容等客户补充
- **校验**：customerCategory ≠ 代理户 → 400；重复 customerId → 409

### 9.2 GET /tenant-registers/:id — 详情
### 9.3 GET /tenant-registers?customerId=X — 查询

### 9.4 PATCH /tenant-registers/:id ⚠️
- **权限**：`@Roles('会计','主管','管理员')`
- **只允许改**：`enterpriseDetail`、`servicePlan`
- **不允许改**：assignedAccountantId（走 assign-accountant 接口）

### 9.5 POST /tenant-registers/:id/confirm-plan
- **权限**：所有登录角色
- **效果**：planConfirmedByOwner → true
- **TODO**：后续应限客户主理人 ownerId 或管理员

### 9.6 POST /tenant-registers/:id/assign-accountant ⚠️
- **权限**：`@Roles('主管','管理员')`
- **Body**：`{ "accountantId": 3 }`
- **校验**：accountantId 用户必须存在且角色为"会计"，否则 400

### 9.7 POST /tenant-registers/:id/confirm-assignment ⚠️
- **权限**：`@Roles('会计','管理员')`
- **规则**：会计角色必须为 assignedAccountantId 本人，否则 403；管理员可代确认
- **前置**：assignedAccountantId 不为空，assignConfirmed 为 false

---

## 十、Task 任务框架接口

> **权限**：POST/PATCH 限主管+管理员。confirm/complete 限 toUserId 本人或管理员。

### 10.1 POST /tasks ⚠️ — 创建任务
- **权限**：`@Roles('主管','管理员')`
- **Body**：`{ title, content?, toUserId, customerId?, deadline }`

### 10.2 GET /tasks — 列表
- **Query**(可选)：`status` / `fromUserId` / `toUserId`

### 10.3 GET /tasks/:id — 详情

### 10.4 PATCH /tasks/:id ⚠️
- **权限**：`@Roles('主管','管理员')`
- **只允许改**：`title`/`content`/`toUserId`/`deadline`/`customerId`
- **禁止改**：status/confirmedAt/confirmedById/completedAt/completedById

### 10.5 POST /tasks/:id/confirm
- **前置**：status=`待确认`
- **校验**：toUserId 本人或管理员，否则 403
- **效果**：status→`进行中`，confirmedAt/confirmedById 写入

### 10.6 POST /tasks/:id/complete
- **前置**：status=`进行中`
- **校验**：toUserId 本人或管理员，否则 403
- **效果**：status→`已完成`，completedAt/completedById 写入

---

## 十一、Fission 业务裂变接口（待开发）

> ⚠️ **后端接口尚未开发。** 以下为需求文档定义的内容，一期只做裂变填单 + 确认 + 归档记录，不做群协同。

### 预计接口

| 接口 | 用途 | 权限 |
|------|------|------|
| `POST /fissions` | 裂变填单（简化模板，含价格+业务指派人） | 会计/主管 |
| `GET /fissions?customerId=X` | 裂变列表 | 所有登录角色 |
| `GET /fissions/:id` | 裂变详情 | 所有登录角色 |
| `POST /fissions/:id/confirm` | 相关人员确认 | 所有登录角色 |
| `POST /fissions/:id/archive` | 上传办结凭证归档 | 业务 |

**业务约束**：仅代理户、不做群协同、不做复杂审批流。

---

## 十二、Dashboard 看板接口（待开发）

> ⚠️ **后端接口尚未开发。** 看板分两类：自动统计和手动录入。

### 自动统计看板（真做）

| 看板 | 用途 |
|------|------|
| 服务看板 | 服务项数量、状态分布、办件进度 |
| 老板看板 | 全局经营概览（客户数/收入/办件数） |
| 客户看板 | 客户数据统计（分层分布/生命周期分布） |

### 半自动看板（手动录入 + 自动汇总）

| 看板 | 用途 |
|------|------|
| 经营看板 | 手动录入收入+各项成本 → 系统汇总→利润可视化 |
| 工资看板 | 手动录入各员工薪资项 → 系统汇总→可视化 |

**一期不做**：自动反推佣金/成本、复杂周期汇总、自动生成确认函。

---

## 十三、枚举值说明

> ⚠️ **前端必须使用后端实际接受的枚举值,一字不差,不允许自己编。** 传错值会返回 400。

| 枚举 | 字段 | 可选值 |
|---|---|---|
| CustomerCategory | customerCategory | `新用户`、`代理户` |
| CompanyType | companyType | `一人公司`、`多股东`、`个体户` |
| CustomerTier | tier | `VIP`、`优质`、`中低`、`零申报` |
| LifecycleStage | lifecycleStage | `填单`、`办件中`、`办结`、`维护中`、`出库`(由后端控制流转,前端创建时不传) |
| RoleCode | (用户角色) | `商务`、`业务`、`会计`、`主管`、`总务`、`管理员` |
| ItemStatus | status(服务项) | `待办`、`办件中`、`办结` |
| WorkOrderStatus | status(办件) | `待办`、`办件中`、`办结`、`已打卡` |
| ChargeMode | chargeMode | `一次性`、`定金加尾款` |
| ChargeStatus | chargeStatus | `已收`、`未收` |
| TaskStatus | status(任务) | `待确认`、`进行中`、`已完成` |

> 注:roleCode 的实际显示值以后端 seed 数据为准(角色名如"管理员/老板")。前端如需展示角色,用登录返回的 roleCode / roleName。

---

## 十四、curl 测试示例(已验证)

> 本机若开代理/VPN,localhost 请求会返回 502,所有命令已加 `--noproxy "*"`。

**登录拿 token(并存进变量 TOKEN):**
```bash
TOKEN=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shangwu","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo $TOKEN
```

**错误密码(预期 401):**
```bash
curl -i --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
```

**不带 token 访问(预期 401):**
```bash
curl -i --noproxy "*" http://localhost:3000/auth/me
```

**查当前用户(预期 200):**
```bash
curl -s --noproxy "*" http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**新建客户(预期返回带 id 的客户对象):**
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"companyName":"测试科技有限公司","industry":"互联网","region":"深圳","annualRevenue":5000000,"staffCount":50,"companyType":"多股东","customerCategory":"新用户","tier":"优质"}'
```

**客户列表(预期返回数组):**
```bash
curl -s --noproxy "*" http://localhost:3000/customers \
  -H "Authorization: Bearer $TOKEN"
```

**按分层筛选:**
```bash
curl -s --noproxy "*" --get http://localhost:3000/customers \
  --data-urlencode "tier=VIP" \
  -H "Authorization: Bearer $TOKEN"
```

**按关键词搜索:**
```bash
curl -s --noproxy "*" --get http://localhost:3000/customers \
  --data-urlencode "keyword=建筑" \
  -H "Authorization: Bearer $TOKEN"
```

**客户详情:**
```bash
curl -s --noproxy "*" http://localhost:3000/customers/1 \
  -H "Authorization: Bearer $TOKEN"
```

**修改客户(把 tier 改成 VIP):**
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/customers/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"VIP"}'
```

> 提示:`python3 -m json.tool` 可美化输出,但若报 `Expecting value`,去掉它直接看原始 JSON 即可。多行 curl 命令需整条一起执行。
