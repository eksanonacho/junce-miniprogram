# API_CONTRACT 使用规范

> 说明前端如何正确使用 `API_CONTRACT.md`。

## 1. API_CONTRACT.md 的地位

- `API_CONTRACT.md` 是前端调用后端接口的**唯一依据**。
- 不允许前端自己发明接口字段、猜测字段名、推测返回结构。
- 不确定字段必须记录到 `PROJECT_STATUS.md` 待确认事项，再问后端搭档。

## 2. 使用规则

1. 每做一个页面前，先查 `API_CONTRACT.md` 中对应接口。
2. 请求方法、URL、body、query、返回字段、枚举值都以 `API_CONTRACT.md` 为准。
3. 需 token 的接口通过 `request` 封装自动带 `Authorization: Bearer <token>`。
4. 登录接口传 `{ skipAuth: true }` 跳过 token。
5. 接口返回 401：业务接口清登录态并跳登录页；登录接口显示后端 message。
6. 接口返回 403：提示"无权限"，不跳登录。
7. PATCH 接口只传要改的字段，不传空字段。
8. 状态流转类接口不能 PATCH 偷改状态，必须用对应动作接口。

## 3. 特别强调的接口规则

| 接口 | 规则 |
|---|---|
| `POST /customers` | 不传 `ownerId`，不传 `lifecycleStage` |
| `PATCH /customers/:id` | 只传改动字段，不做全量提交 |
| `POST /work-orders/:id/check-in` | 办结打卡必须走 check-in，不能 PATCH status |
| `POST /charges/:id/confirm` | 确认收费必须走 confirm，不能 PATCH chargeStatus |
| `POST /charges/:id/remind` | 催收必须走 remind |
| `POST /tasks/:id/confirm` | 确认任务走 confirm，不能 PATCH status |
| `POST /tasks/:id/complete` | 完成任务走 complete，不能 PATCH status |
| `POST /tenant-registers/:id/assign-accountant` | 分派会计必须走 assign-accountant |
| `POST /tenant-registers/:id/confirm-assignment` | 会计确认分派走 confirm-assignment |

## 4. 当前接口覆盖模块

| 模块 | 接口数 | 后端状态 | 前端使用 |
|---|---|---|---|
| Auth 登录 | 3 | ✅ | ✅ 已联调（login 已用，me 可选） |
| Customers 客户 | 4 | ✅ | ✅ 全部联调通过 |
| Users 用户查询 | 1 | ✅ | ⬜ 待用于人员配置页 |
| ServiceTemplates 服务模板 | 2 | ✅ | ⬜ |
| ReadConfirmations 已读确认 | 2 | ✅ | ⬜ |
| ServiceItems 服务项 | 3 | ✅ | ⬜ |
| StaffAssignments 人员配置 | 2 | ✅ | ⬜ |
| WorkOrders 办件流转 | 5 | ✅ | ⬜ |
| Charges 收费管控 | 7 | ✅ | ⬜ |
| TenantRegisters 托管入档 | 7 | ✅ | ⬜ |
| Tasks 任务 | 6 | ✅ | ⬜ |

> 注：Fission 业务裂变、Dashboard 看板接口待后端开发。
