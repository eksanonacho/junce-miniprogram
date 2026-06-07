# TESTING_GUIDE.md — 测试手册

> **这个文件是给谁看的**:任何改完代码、要确认没改坏系统的人(或 AI)。
> **什么时候用**:每次改代码后做回归测试;新模块开发完做验证;排查"是不是哪里坏了"。
> **解决什么问题**:照着跑一遍,快速确认核心功能(登录/权限/客户)还正常。
> 最后更新:2026-06-06(凌晨)。所有 curl 命令均已实测通过。

---

## 一、测试前准备

1. **启动后端**:
```bash
cd /Users/a1234/cpp/junce-miniprogram/server
export PATH=~/.npm-global/bin:$PATH
pnpm start:dev
```
看到 `Nest application successfully started` 即成功。**这个终端保持开着**,另开新终端跑 curl。

2. **确认 PostgreSQL 在跑**:
```bash
psql -d junce_dev -c "\dt"   # 能列出 roles/users/customers 即正常
```

3. **代理问题**:本机若开 VPN/代理,curl localhost 会返回 502。**所有 curl 命令都加 `--noproxy "*"`**,或临时关代理。

4. **登录拿 token(后续测试都要用)**:
```bash
TOKEN=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shangwu","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo $TOKEN
```
> 测试账号:shangwu/123456(商务)、admin/123456(管理员),密码均 123456。

---

## 二、Auth 测试(6 条核心)

### A. 正确登录
```bash
curl -i --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```
**预期**:200,返回 accessToken + user(含 roleCode "管理员")。

### B. 错误密码 → 401
```bash
curl -i --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
```
**预期**:401,`{"message":"用户名或密码错误",...}`。

### C. 不带 token 访问 → 401
```bash
curl -i --noproxy "*" http://localhost:3000/auth/me
```
**预期**:401,`{"message":"未提供有效的认证令牌",...}`。

### D. 商务访问管理员接口 → 403
```bash
TOKEN_S=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shangwu","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
curl -i --noproxy "*" http://localhost:3000/auth/admin-only \
  -H "Authorization: Bearer $TOKEN_S"
```
**预期**:403,`{"message":"权限不足:需要 [管理员] 角色,当前为 商务",...}`。

### E. 管理员访问管理员接口 → 200
```bash
TOKEN_A=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
curl -i --noproxy "*" http://localhost:3000/auth/admin-only \
  -H "Authorization: Bearer $TOKEN_A"
```
**预期**:200,`{"message":"欢迎,管理员!...","timestamp":"..."}`。

### F. /auth/me 返回当前用户
```bash
curl -s --noproxy "*" http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN_A"
```
**预期**:200,返回 admin 信息(id、username、realName、roleCode、roleName)。

---

## 三、Customers 测试

> 以下用准备阶段拿到的 `$TOKEN`(商务账号)。

### 1. 新建客户
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"companyName":"测试科技有限公司","industry":"互联网","region":"深圳","annualRevenue":5000000,"staffCount":50,"companyType":"多股东","customerCategory":"新用户","tier":"优质"}'
```
**预期**:返回带 id 的客户对象;ownerId 自动是商务张三;lifecycleStage 自动"填单";owner 嵌套对象有 realName。

### 2. 查询客户列表
```bash
curl -s --noproxy "*" http://localhost:3000/customers \
  -H "Authorization: Bearer $TOKEN"
```
**预期**:返回客户数组,按创建时间倒序,含刚建的客户。

### 3. 查询详情
```bash
curl -s --noproxy "*" http://localhost:3000/customers/1 \
  -H "Authorization: Bearer $TOKEN"
```
**预期**:返回 id=1 的单个客户对象(不存在则 404)。

### 4. 修改客户
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/customers/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"VIP"}'
```
**预期**:返回更新后的对象,tier 变 VIP,updatedAt 时间更新。

### 5. 筛选客户(按分层)
```bash
curl -s --noproxy "*" --get http://localhost:3000/customers \
  --data-urlencode "tier=VIP" \
  -H "Authorization: Bearer $TOKEN"
```
**预期**:只返回 tier=VIP 的客户。

### 6. keyword 搜索
```bash
curl -s --noproxy "*" --get http://localhost:3000/customers \
  --data-urlencode "keyword=建筑" \
  -H "Authorization: Bearer $TOKEN"
```
**预期**:只返回公司名包含"建筑"的客户。

---

## 四、Users 测试(人员配置下拉数据源)

> 以下用准备阶段拿到的 `$TOKEN`（任意角色均可）。

### 1. 查全部用户
```bash
curl -s --noproxy "*" http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
**预期**:200，返回 6 个用户数组，按 roleId、id 升序排列。每条含 `id`、`username`、`realName`、`phone`、`role.code`、`role.name`。**不出现 passwordHash**。

### 2. 按角色筛选
```bash
curl -s --noproxy "*" --get http://localhost:3000/users \
  --data-urlencode "roleCode=会计" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
**预期**:200，只返回会计角色的用户。`roleCode` 支持：商务/业务/会计/主管/总务/管理员。

### 3. 不带 token → 401
```bash
curl -s --noproxy "*" http://localhost:3000/users | python3 -m json.tool
```
**预期**:401，`{"message":"未提供有效的认证令牌"}`。

### 4. 非法 roleCode → 400
```bash
curl -s --noproxy "*" --get http://localhost:3000/users \
  --data-urlencode "roleCode=老板" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
**预期**:400，`{"message":["roleCode 必须是合法的角色编码：商务/业务/会计/主管/总务/管理员"]}`。**不会返回空数组**。

---

## 五、WorkOrder 办件测试

### 1. 创建办件
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"serviceItemId":1,"handlerId":2,"receiptReceiverId":5}' | python3 -m json.tool
```
**预期**:返回含 customer/serviceItem/handler/receiptReceiver 嵌套，status=待办。

### 2. 重复创建同一 serviceItem → 409
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"serviceItemId":1}' | python3 -m json.tool
```
**预期**:409，返回 `statusCode`、`message`("该服务项已存在办件工单，请勿重复创建")、`error`("Conflict")、`existingWorkOrder`(含 id/status/serviceName 等)。

### 3. 列表 + 筛选
```bash
curl -s --noproxy "*" "http://localhost:3000/work-orders?customerId=1&status=办件中" \
  -H "Authorization: Bearer $TOKEN"| python3 -m json.tool
```

### 4. 更新状态 + 办结归档
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/work-orders/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"办结","archiveFiles":[{"name":"a.pdf","url":"/x","size":1,"uploadedAt":"2026-01-01"}]}' | python3 -m json.tool
```
**预期**:status=办结，completedAt 已填。

### 5. PATCH 直接改"已打卡" → 400
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/work-orders/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"已打卡"}' | python3 -m json.tool
```
**预期**:400。

### 6. 办结打卡（带 archiveFiles）
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/work-orders/1/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"archiveFiles":[{"name":"a.pdf","url":"/x","size":1}]}' | python3 -m json.tool
```
**预期**:status=已打卡，checkedInAt 已填。

### 7. 空 archiveFiles 打卡 → 400
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/work-orders/2/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"archiveFiles":[]}' | python3 -m json.tool
```
**预期**:400。

---

## 六、前端联调测试(前端做完后逐项验)

| 测试项 | 怎么验 | 预期 |
|---|---|---|
| 登录后是否保存 token | 登录成功后查本地存储 | token 已存(uni.getStorageSync 能取到) |
| 填单是否提交成功 | 填单页提交一个客户 | 有成功提示,后端 curl 查列表能看到这条 |
| 列表是否展示 | 打开列表页 | 显示客户列表,筛选/搜索可用 |
| 详情是否能打开 | 列表点某客户 | 跳详情页,显示完整信息 |
| 编辑是否能保存 | 详情→编辑→改字段→保存 | 提示保存成功,返回看到更新后的值 |
| token 失效处理 | 手动清掉本地 token 再访问 | 跳回登录页 |

---

## 七、回归测试顺序(每次改代码后照做)

1. **`pnpm build`** — 先确认能编译通过(0 errors)。
2. **启动后端** — `pnpm start:dev`,看到 successfully started。
3. **Auth 测试** — 跑第二节 6 条,确认 401/403/200 都对。
4. **Customers 测试** — 跑第三节 6 条,确认增删改查筛选都对。
5. **Users 测试** — 跑第四节 4 条,确认列表/筛选/401/400 都对。
6. **WorkOrder 测试** — 跑第五节,确认创建/状态流转/打卡/归档校验/401 都对。
7. **前端页面测试** — 跑第六节(如果改动涉及前端)。

> 原则:改了后端,至少跑 Auth + Customers;改了某个模块,重点测那个模块 + 它依赖的(如改客户必连带测登录)。

---

## 八、常见测试问题

| 问题 | 现象 | 解决 |
|---|---|---|
| 端口 3000 被占用 | 启动报 `EADDRINUSE :::3000` | `lsof -ti:3000 \| xargs kill -9` 杀旧进程再启 |
| 代理导致 502 | curl localhost 返回 `502 Bad Gateway` | curl 加 `--noproxy "*"`,或关 VPN/代理 |
| token 过期 | 之前能用的接口突然 401 | 重新登录拿新 token(token 有有效期,默认 7 天) |
| 枚举值传错 | 新建/修改返回 400 | 检查 customerCategory/companyType/tier 是否用了正确的中文枚举值(见 API_CONTRACT.md) |
| Decimal 字段格式不对 | 金额返回成奇怪字符串、或精度异常 | 确认字段是 Decimal(12,2);后端 Service 应做 Decimal→数字序列化 |
| python json.tool 报错 | `Expecting value: line 1 column 1` | 多行命令要整条一起执行;或去掉 `\| python3 -m json.tool` 看原始返回 |
| 中文显示成 \uXXXX | 原始 JSON 里中文是编码 | 正常现象,解析后即中文;想直接看中文可去掉 json.tool |
