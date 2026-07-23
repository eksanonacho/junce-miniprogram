# 前端测试指南

> 最后更新：2026-06-09

## 1. 启动项目

```bash
cd juncai-app
npm install
npm run dev:h5
```

浏览器打开终端显示的 Local 地址（如 `http://localhost:5173/`）。

### 修改后端地址

编辑 `src/config/index.js`：

```js
export const BASE_URL = 'http://172.20.10.5:3000'
```

### 确认后端连通

```bash
curl --noproxy "*" -X POST http://172.20.10.5:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shangwu","password":"123456"}'
```

看到返回 200 + token 即连通。

---

## 2. 登录页测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | 打开应用 | 显示登录页 |
| 2 | 空表单点登录 | toast "请输入用户名" |
| 3 | `shangwu` + 错误密码 | toast 显示后端 message（如"用户名或密码错误"） |
| 4 | `shangwu / 123456` | 登录成功 → reLaunch 到 customer-list |
| 5 | 刷新浏览器 | 仍在 customer-list，登录态恢复 |

---

## 3. 客户填单页测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | customer-list → 点"新增客户" | 进入填单页 |
| 2 | 空表单点提交 | toast "请输入企业名称" |
| 3 | 填完必填项 + 选填，提交 | 成功，toast "提交成功"，表单清空 |
| 4 | Network 检查 payload | 不含 ownerId、lifecycleStage |

---

## 4. 客户列表页测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | 登录后进入列表 | 展示客户列表（companyName/tier/industry/region/lifecycleStage） |
| 2 | 空列表 | 显示"暂无客户数据" |
| 3 | 点某客户 | navigateTo 详情页 |
| 4 | 从填单页返回 | onShow 自动刷新列表 |

---

## 5. 客户详情页测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | 列表点客户 | 进入详情页，14 字段正确展示 |
| 2 | 空字段 | 显示"—" |
| 3 | annualRevenue | 千分位显示（如 5,000,000 元） |
| 4 | 点"编辑客户" | navigateTo 编辑页 |
| 5 | 返回列表 | 正常返回 |

---

## 6. 客户编辑页测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | 详情点"编辑" | 10 字段预填已有数据 |
| 2 | 修改 tier 后保存 | toast "保存成功" → 返回详情 → 自动刷新看到新值 |
| 3 | 不修改直接保存 | toast "未修改任何字段" |
| 4 | 清空 companyName | toast "请输入企业名称" |
| 5 | PATCH payload | 只含修改字段，不含 ownerId/lifecycleStage |

---

## 7. 第二阶段测试计划 / 验收清单

> ✅ 联调通过（2026-06-10），15/15 接口 PASS。

### 7.1 服务模板选择页

| # | 操作 | 预期 |
|---|---|---|
| 1 | 客户详情页 → 点击"服务配置" | 跳转到选择页，携带 customerId |
| 2 | 页面加载 | 模板列表正常展示（15 条），serviceType 动态渲染 |
| 3 | 下拉刷新 / 重试 | loading → 列表展示 |
| 4 | 后端不可达 | 显示"加载失败" + 重试按钮 |
| 5 | 列表为空 | 显示"暂无可用服务模板" |
| 6 | 点击模板卡片 | 切换到详情子视图 |
| 7 | 详情子视图 | requiredMaterials（v-for 数组）正确展示 |
| 8 | 详情子视图 | processSteps（v-for 数组）正确展示 |
| 9 | 详情子视图 | estimatedDuration（文本）正确展示 |
| 10 | 详情子视图 | 所有字段值为"待客户补充"时正常展示 |
| 11 | 点击"已阅读并确认" | POST /service-read-confirmations 发送成功，标记变"已确认" |
| 12 | 再次点击"已阅读并确认" | 409 → request.js toast |
| 13 | 返回列表 | 已确认模板显示"已确认"标签 |
| 14 | 勾选多个模板 | checkbox 选中/取消正常，底部按钮更新计数 |
| 15 | 未勾选点"确定" | toast "请至少选择一项服务" |
| 16 | 勾选后点"确定" | POST /customers/:id/service-items → 成功返回详情页 |
| 17 | 全部重复创建 | errors 数组（string[]）逐条 toast |
| 18 | 部分重复创建 | toast "已添加 X 项，Y 项失败" |

### 7.2 客户详情页增强回归

| # | 操作 | 预期 |
|---|---|---|
| R1 | 进入详情页 | 原有 5 张卡片正常展示 |
| R2 | 点击"编辑客户" | 正确跳转，id 正确 |
| R3 | 编辑保存后返回 | 所有数据自动刷新 |
| R4 | 首次加载 | 显示"加载中..." |
| R5 | 不存在客户 id | "客户不存在" + 返回按钮 |
| R6 | "服务配置"按钮 | 所有角色可见 |
| R7 | "配置人员"按钮 | 商务/主管/管理员可见，其他隐藏 |
| R8 | 服务项卡片 | 有数据时展示类型 + 状态标签（三色） |
| R9 | 服务项卡片 | 无数据时展示"暂无服务项" |
| R10 | 创建服务项后返回 | 服务项卡片自动刷新 |
| R11 | 人员配置摘要 | 已配置显示姓名，未配置显示"未配置" |
| R12 | 配置人员后返回 | 人员配置摘要自动刷新 |
| R13 | 服务项接口失败 | 卡片显示错误，基本信息不受影响 |
| R14 | 人员配置 404 | 全部显示"未配置"，其他区域正常 |

### 7.3 人员配置页

| # | 操作 | 预期 |
|---|---|---|
| 1 | 详情页 → 点击"配置人员" | 跳转配置页，携带 customerId |
| 2 | 页面加载 | 三个 picker 加载对应角色用户列表 |
| 3 | 已配置时 | 表单回填当前值 |
| 4 | 未配置时（404） | 表单为空，正常展示 |
| 5 | 顾问岗 | 不展示 |
| 6 | 选择人员 | picker 正常弹出，选择后回填 |
| 7 | 保存 | PUT 只传有值字段，成功后返回详情页 |
| 8 | 未选择点保存 | toast "未选择任何人员" |
| 9 | 保存失败 | request.js toast |
| 10 | 返回详情页 | 人员配置摘要卡片刷新 |

### 7.4 边界场景（复用 401/403 测试）

| # | 操作 | 预期 |
|---|---|---|
| 1 | 改坏 token | 业务接口 → toast "登录已过期" → reLaunch 登录页 |
| 2 | 非授权角色调 PUT | 403 → toast "无权限" |

---

## 8. 第三阶段测试计划 / 验收清单

> ✅ 联调通过（2026-06-10），上传全链路 + 多角色权限均验证通过。

### 8.1 办件列表页

| # | 操作 | 预期 |
|---|---|---|
| 1 | 进入列表页 | loading → 列表展示（按 createdAt 倒序） |
| 2 | 空列表 | "暂无办件" |
| 3 | 每条卡片 | serviceType + companyName + status 四色标签 + handler?.realName |
| 4 | handler=null | 显示"未指派" |
| 5 | 点击卡片 | navigateTo 详情页 + ?id= |
| 6 | 加载失败 | "加载失败" + 重试按钮 |

### 8.2 创建办件页

| # | 操作 | 预期 |
|---|---|---|
| 1 | 从服务项卡片"创建办件"进入 | URL 含 serviceItemId + customerId |
| 2 | 服务信息展示 | serviceType + "当前状态：XX" |
| 3 | 对接人/回执接收人 picker | 从 staff-assignment 加载候选人 |
| 4 | 不选人提交 | body 不含 handlerId/receiptReceiverId |
| 5 | 选人提交 | body 含对应 ID |
| 6 | 创建成功 | toast → navigateBack → 详情 onShow 刷新 |
| 7 | 409 重复 | request.js toast（后端 message） |

### 8.3 办件详情页

| # | 操作 | 预期 |
|---|---|---|
| 1 | 从列表进入 | 加载详情，所有字段展示 |
| 2 | null 兜底 | handler/receiver→"未指派"，archive→"暂无"，时间→"—" |
| 3 | status=待办 → [开始办件] | PATCH status=办件中 → 刷新 |
| 4 | status=办件中 → [办结] | PATCH status=办结 → 刷新 |
| 5 | status=办结 → [办结打卡] | 展开打卡子视图 |
| 6 | 添加文件(H5) | chooseFile → uploadFile → 列表展示 |
| 7 | 上传失败/非成功状态码 | toast → 不加入列表 |
| 8 | 未选文件点确认 | toast "请至少上传一个文件" |
| 9 | 打卡成功 | status→已打卡，打卡区关闭 |
| 10 | status=已打卡 | "已打卡（终态）"，无按钮 |

### 8.4 客户详情页第三阶段回归

| # | 操作 | 预期 |
|---|---|---|
| R17 | 服务项卡片"创建办件"入口 | 每条服务项显示 |
| R18 | 点击"创建办件" | 正确跳转，serviceItemId + customerId 正确 |

## 9. Phase 4 收费管控测试计划

> ✅ 联调通过（2026-06-11），7/7 接口 PASS。

### 9.1 charge-detail（view 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 从未收款列表点击进入 | loading → 收费信息卡片 + 确认信息卡片 + 催收记录 |
| 2 | chargeStatus=未收 | 橙色标签 |
| 3 | chargeStatus=已收 | 绿色标签 |
| 4 | confirmer=null | "未确认" |
| 5 | contractNo/invoiceNo=null | "—" |
| 6 | amount 展示 | 千分位 ¥5,000,000 |
| 7 | 操作按钮（总务+未收） | 修改 / 确认已收 / 发起催收 |
| 8 | 操作按钮（总务+已收） | 仅修改 |
| 9 | 操作按钮（业务） | 全部隐藏 |
| 10 | 催收记录列表 | fromUser → toUser + message + 时间 |

### 9.2 charge-detail（edit 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 点击"修改" | 表单预填当前值 |
| 2 | 修改 amount → 保存 | PATCH → toast "保存成功" → view 刷新 |
| 3 | 保存中按钮 disabled | saving=true 时变灰 + "保存中..." |
| 4 | 未修改 → 保存 | toast "未修改任何字段" |
| 5 | 取消 | 回到 view |

### 9.3 charge-detail（create 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 从客户详情"创建收费"进入 | 客户信息卡片 + 收费表单 |
| 2 | chargeMode/amount 不填 | toast 校验提示 |
| 3 | 提交成功 | 201 → redirectTo view |
| 4 | 重复创建（409） | request.js toast |
| 5 | 客户不存在 | error "客户不存在" |

### 9.4 charge-unpaid-list

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入页面 | 仅显示 chargeStatus=未收 记录 |
| 2 | 每条卡片 | customerName + amount(橙色) + chargeMode + 状态标签 |
| 3 | 点击卡片 | navigateTo 详情 + ?id= |
| 4 | 空列表 | "暂无未收款记录" |

### 9.5 customer-detail 收费卡片

| # | 操作 | 预期 |
|---|------|------|
| 1 | 有收费记录 | chargeStatus + chargeMode + amount + "查看详情" |
| 2 | 无收费 + 商务 | "暂无收费信息" + "创建收费" |
| 3 | 无收费 + 业务 | 仅"暂无收费信息"，无按钮 |
| 4 | 点击"查看详情" | navigateTo charge-detail + ?id= |
| 5 | 点击"创建收费" | navigateTo charge-detail + ?customerId=&mode=create |
| 6 | 卡片加载失败 | "加载失败"，不阻断页面 |

## 10. Phase 5 托管入档测试计划

> ✅ 联调通过（2026-06-12），7/7 接口 PASS。

### 10.1 tenant-detail（view 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入详情 | 托管信息卡片 + 企业概况 + 服务方案 |
| 2 | planConfirmedByOwner=true/false | 绿色"已确认"/橙色"待确认" |
| 3 | assignedAccountant=null | "未分派" |
| 4 | assignedAccountant 有值 | 显示 realName |
| 5 | assignConfirmed=true/false | 绿色"已确认"/橙色"待确认" |
| 6 | 操作按钮（会计+未确认） | 修改概况/方案 + 确认方案 |
| 7 | 操作按钮（主管+未分派） | 分派会计 |
| 8 | 操作按钮（会计本人+已分派未确认） | 确认分派 |

### 10.2 tenant-detail（create 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 从代理户详情进入 | 客户信息卡片 + textarea 表单 |
| 2 | 非代理户进入 | 红字"该客户非代理户"，表单隐藏 |
| 3 | 提交成功 | 201 → redirectTo view |

### 10.3 tenant-detail（edit 模式）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 点击"修改概况/方案" | textarea 预填当前值 |
| 2 | 保存 | PATCH → toast → view 刷新 |
| 3 | 取消 | 回到 view |

### 10.4 customer-detail 托管卡片

| # | 操作 | 预期 |
|---|------|------|
| 1 | 代理户有托管记录 | 方案确认 + 分派会计 + "查看详情" |
| 2 | 代理户无托管记录+会计 | "暂无托管记录" + "创建托管" |
| 3 | 代理户无托管记录+业务 | 仅"暂无托管记录" |
| 4 | 非代理户 | 不显示托管卡片 |
| 5 | 点击"查看详情" | navigateTo tenant-detail?id= |
| 6 | 点击"创建托管" | navigateTo tenant-detail?customerId=&mode=create |

## 11. Phase 6 任务流转测试计划

> ✅ 联调通过（2026-06-13），6/6 接口 PASS。

### 11.1 task-list

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入页面 | loading → 任务列表（全部） |
| 2 | status 筛选 | 待确认/进行中/已完成 tab 切换 |
| 3 | 创建按钮（主管/管理员） | 可见并跳转 task-create |
| 4 | 创建按钮（非主管） | 隐藏 |
| 5 | 点击卡片 | navigateTo task-detail + ?id= |
| 6 | 空列表 | "暂无任务" |

### 11.2 task-detail（view）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入详情 | 任务信息 + 内容 + 时间信息 |
| 2 | 状态标签 | 待确认橙/进行中蓝/已完成绿 |
| 3 | confirmer/completer null | "—" |
| 4 | toUser/fromUser 嵌套 | 显示 realName |

### 11.3 task-detail（edit）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管点击"编辑" | 表单预填 + toUserId 下拉 |
| 2 | 保存 | PATCH → toast → view 刷新 |
| 3 | 取消 | 回到 view |

### 11.4 task-detail（confirm/complete）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 待确认 + 本人 | "确认任务"按钮可见 |
| 2 | 确认后 | status→进行中，confirmer 写入 |
| 3 | 进行中 + 本人 | "完成任务"按钮可见 |
| 4 | 完成后 | status→已完成，completer 写入 |
| 5 | 非本人 | 按钮隐藏，后端 403 兜底 |

### 11.5 task-create

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管进入 | 表单：title/content/toUserId/customerId/deadline |
| 2 | 非主管进入 | "无权限创建任务" |
| 3 | 提交成功 | 201 → redirectTo task-detail |
| 4 | 必填校验 | title/toUserId/deadline toast 提示 |

## 12. Phase 7 业务裂变测试计划

> ✅ 联调通过（2026-06-13），7/7 接口 PASS。

### 12.1 fission-list

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入页面 | 裂变线索列表 + 5态筛选 |
| 2 | 每条卡片 | leadName + contactName + phone + price + status |
| 3 | 新建入口 | 所有人可见 |

### 12.2 fission-detail（view）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 进入详情 | 线索信息 + 时间信息 + 归档材料 |
| 2 | 状态标签 | 待确认橙/已确认蓝/已归档绿/无效灰 |
| 3 | 字段兼容 | initiatedBy/confirmer/archiver 双路径兜底 |

### 12.3 fission-detail（edit）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管点击"编辑" | 表单预填 + assignee下拉 |
| 2 | 保存 | PATCH → view 刷新 |
| 3 | PATCH body | 无 null/NaN/禁止字段 |

### 12.4 fission-detail（操作）

| # | 操作 | 预期 |
|---|------|------|
| 1 | 待确认→确认 | confirm → status=已确认 |
| 2 | 已确认→归档 | 上传文件 → archive → status=已归档 |
| 3 | 待确认/已确认→无效 | mark-invalid → status=无效 |
| 4 | 非主管 | PATCH/confirm/archive/mark-invalid→403 |

### 12.5 fission-create

| # | 操作 | 预期 |
|---|------|------|
| 1 | 所有人进入 | 7字段表单（全部选填） |
| 2 | 提交成功 | 201 → redirectTo detail |

---

## 13. Phase 8 手动经营/工资看板测试计划

> ✅ 联调通过（2026-06-13），8/8 接口 PASS。

### 13.1 manual-business

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管进入 | month选择 + 汇总 + 列表，无新增/编辑按钮 |
| 2 | 总务进入 | 同上 + 新增/编辑按钮 |
| 3 | 商务进入 | "无权限" |
| 4 | 新增经营记录 | POST → profitAmount自动计算 → 刷新 |
| 5 | 编辑 | PATCH → 仅传变化字段 → profitAmount重算 |
| 6 | summary | 金额仅展示，不在前端计算 |

### 13.2 manual-salary

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管进入 | month+userId下拉+汇总+列表，无新增/编辑 |
| 2 | 总务进入 | 同上 + 新增/编辑按钮 |
| 3 | 新增工资记录 | POST → totalAmount自动计算 → 409重复拦截 |
| 4 | 员工名 | user.realName优先，employee兜底 |

---

## 14. Phase 9 Dashboard 自动看板测试计划

> ✅ 联调通过（2026-06-13），5/5 接口 PASS。

| # | 操作 | 预期 |
|---|------|------|
| 1 | 主管进入 | 5 区块并行加载，每区块独立 loading |
| 2 | 总务进入 | "无权限访问看板"，不发请求 |
| 3 | overview 区块 | 客户/服务/办件/任务/收费 数字卡片 |
| 4 | customers 区块 | 按分类/分层/生命周期统计 |
| 5 | 任一接口失败 | 仅该区块显示错误+重试，其他正常 |
| 6 | 金额为 null | ¥0.00，不白屏 |
| 7 | 对象统计为空 | "暂无数据" |

---

## 9. 401 / 403 测试

| # | 操作 | 预期 |
|---|---|---|
| 1 | 登录后手动改坏 localStorage 中 `accessToken` | 访问业务接口 → toast "登录已过期" → reLaunch 登录页 |
| 2 | 并发多个业务请求 | 不会重复跳登录（isRedirecting 锁） |
| 3 | 403（如用非总务角色调 confirm） | toast "无权限" |

---

## 10. H5 / 微信小程序差异

- 当前主要测 H5（浏览器）
- 微信小程序（mp-weixin）尚未完整验证
- 后续上微信开发者工具时重点测试：request、路由跳转、storage 持久化、样式兼容
