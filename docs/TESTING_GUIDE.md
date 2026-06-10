# TESTING_GUIDE.md — 测试手册

> **这个文件是给谁看的**:任何改完代码、要确认没改坏系统的人(或 AI)。
> **什么时候用**:每次改代码后做回归测试;新模块开发完做验证;排查"是不是哪里坏了"。
> **解决什么问题**:照着跑一遍,快速确认核心功能(登录/权限/客户)还正常。
> 最后更新:2026-06-09。所有 curl 命令均已实测通过。

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

## 六、Charge 费用管控测试

> ⚠️ PATCH/confirm/remind 限总务+管理员，商务访问返回 403。

```bash
# 登录不同角色
TOKEN_SW=$(curl ... username:shangwu)   # 商务
TOKEN_ZW=$(curl ... username:zongwu)     # 总务

# 1. 商务创建 charge
curl -s --noproxy "*" -X POST http://localhost:3000/charges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" \
  -d '{"customerId":1,"chargeMode":"一次性","amount":50000,"contractNo":"HT-001"}'

# 2. 商务 PATCH → 403
curl -s --noproxy "*" -X PATCH http://localhost:3000/charges/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" -d '{"contractNo":"XX"}'

# 3. 总务发起催收（toUserId不传，默认业主理人）
curl -s --noproxy "*" -X POST http://localhost:3000/charges/1/remind \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZW" -d '{"message":"请确认收款"}'

# 4. 总务确认已收
curl -s --noproxy "*" -X POST http://localhost:3000/charges/1/confirm \
  -H "Authorization: Bearer $TOKEN_ZW"

# 5. 已收后催收 → 400
curl -s --noproxy "*" -X POST http://localhost:3000/charges/1/remind \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZW" -d '{}'

# 6. 筛选
curl -s --noproxy "*" "http://localhost:3000/charges?chargeStatus=%E6%9C%AA%E6%94%B6" \
  -H "Authorization: Bearer $TOKEN_SW"
```
**预期**:1→201;2→403;3→201催收成功;4→201已收+confirmer已填;5→400;6→筛选正确。

---

## 七、TenantRegister 托管入档测试(仅代理户)

> ⚠️ POST/PATCH 限会计+主管+管理员; assign-accountant 限主管+管理员; confirm-assignment 限会计(须本人)+管理员。
> ⚠️ 只有 `customerCategory=代理户` 的客户能创建，非代理户返回 400。
> ⚠️ 测试前先 `psql -d junce_dev -c "SELECT id,company_name,customer_category FROM customers"` 确认哪个是代理户、哪个是新用户。

### 登录准备
```bash
TOKEN_SW=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username":"shangwu","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
TOKEN_KJ=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username":"kuaiji","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
TOKEN_ZG=$(curl -s --noproxy "*" -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username":"zhuguan","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
```

### 1. 会计创建代理户托管入档
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_KJ" \
  -d '{"customerId":<代理户真实ID>,"enterpriseDetail":{"scale":"中型"},"servicePlan":{"accounting":"月度"}}' | python3 -m json.tool
```
**预期**:201，返回 id，customerCategory=代理户。

### 2. 商务创建 → 403
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" \
  -d '{"customerId":<代理户真实ID>}' | python3 -m json.tool
```
**预期**:403，`权限不足：需要 [会计、主管、管理员] 角色，当前为 商务`。

### 3. 非代理户创建 → 400
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_KJ" \
  -d '{"customerId":<新用户真实ID>}' | python3 -m json.tool
```
**预期**:400，`只有代理户才能创建托管入档`。

### 4. 主管分派会计
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers/<id>/assign-accountant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZG" \
  -d '{"accountantId":3}' | python3 -m json.tool
```
**预期**:201，assignedAccountant.realName=会计王五。

### 5. 主理人 confirm-plan
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers/<id>/confirm-plan \
  -H "Authorization: Bearer $TOKEN_SW" | python3 -m json.tool
```
**预期**:201，planConfirmedByOwner=true，planConfirmedAt 已填。

### 6. 被分派会计本人 confirm-assignment
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tenant-registers/<id>/confirm-assignment \
  -H "Authorization: Bearer $TOKEN_KJ" | python3 -m json.tool
```
**预期**:201，assignConfirmed=true，assignConfirmedAt 已填。kuaiji(id=3) 是 assignedAccountantId=3 本人。

### 7. 无 token 查询 → 401
```bash
curl -s --noproxy "*" http://localhost:3000/tenant-registers/1 | python3 -m json.tool
```
**预期**:401。

---

## 八、Task 任务框架测试

> ⚠️ POST/PATCH 限主管+管理员。confirm/complete 限 toUserId 本人或管理员（非本人 403）。

### 登录
```bash
TOKEN_ZG=$(curl ... username:zhuguan)   # 主管
TOKEN_KJ=$(curl ... username:kuaiji)     # 会计(被指派人)
TOKEN_SW=$(curl ... username:shangwu)    # 商务(非主管)
TOKEN_YW=$(curl ... username:yewu)       # 业务(非被指派人)
```

### 1. 主管创建任务
```bash
TASK_ID=$(curl -s --noproxy "*" -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZG" \
  -d '{"title":"月度报税","toUserId":3,"deadline":"2026-06-20T00:00:00Z"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
```
**预期**:status=待确认，toUser=会计王五。

### 2. 商务创建 → 403
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" \
  -d '{"title":"test","toUserId":3,"deadline":"..."}' | python3 -m json.tool
```
**预期**:403。

### 3. 非被指派人确认 → 403
```bash
curl -s --noproxy "*" -X POST "http://localhost:3000/tasks/$TASK_ID/confirm" \
  -H "Authorization: Bearer $TOKEN_YW" | python3 -m json.tool
```
**预期**:403，只有被指派人本人或管理员才能确认。

### 4. 被指派人确认 → 成功
```bash
curl -s --noproxy "*" -X POST "http://localhost:3000/tasks/$TASK_ID/confirm" \
  -H "Authorization: Bearer $TOKEN_KJ" | python3 -m json.tool
```
**预期**:status=进行中，confirmer=会计王五。

### 5. 被指派人完成 → 成功
```bash
curl -s --noproxy "*" -X POST "http://localhost:3000/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN_KJ" | python3 -m json.tool
```
**预期**:status=已完成，completer=会计王五。

### 6. 重复完成 → 400
```bash
curl -s --noproxy "*" -X POST "http://localhost:3000/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN_KJ" | python3 -m json.tool
```
**预期**:400。

### 7. PATCH 改 title 不改 status
```bash
curl -s --noproxy "*" -X PATCH "http://localhost:3000/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZG" \
  -d '{"title":"月度报税(已更新)"}' | python3 -m json.tool
```
**预期**:title已更新，status仍为已完成。

### 8. 无 token → 401
```bash
curl -s --noproxy "*" http://localhost:3000/tasks | python3 -m json.tool
```
**预期**:401。

---

## 九、Dashboard 看板测试

> ⚠️ 所有接口限 `@Roles('主管','管理员')`，商务访问返回 403。
> ⚠️ 金额字段 collectedAmount/unpaidAmount 返回 number，仅用于前端展示。

### 登录
```bash
TOKEN_AD=$(curl ... username:admin)    # 管理员
TOKEN_ZG=$(curl ... username:zhuguan)  # 主管
TOKEN_SW=$(curl ... username:shangwu)  # 商务
```

### 1. 管理员 overview
```bash
curl -s --noproxy "*" http://localhost:3000/dashboard/overview \
  -H "Authorization: Bearer $TOKEN_AD" | python3 -m json.tool
```
**预期**:200，返回 customers(含 activeCount)/serviceItems/workOrders/tasks/charges 五组统计。

### 2. 主管 customers
```bash
curl -s --noproxy "*" http://localhost:3000/dashboard/customers \
  -H "Authorization: Bearer $TOKEN_ZG" | python3 -m json.tool
```
**预期**:200，total + byCategory + byTier + byLifecycleStage。

### 3-5. services / tasks / charges
```bash
curl -s --noproxy "*" http://localhost:3000/dashboard/services -H "Authorization: Bearer $TOKEN_AD" | python3 -m json.tool
curl -s --noproxy "*" http://localhost:3000/dashboard/tasks -H "Authorization: Bearer $TOKEN_AD" | python3 -m json.tool
curl -s --noproxy "*" http://localhost:3000/dashboard/charges -H "Authorization: Bearer $TOKEN_AD" | python3 -m json.tool
```
**预期**:200，charges 的 collectedAmount/unpaidAmount 为 **number**(不是 string)。

### 6. 商务 → 403
```bash
curl -s --noproxy "*" http://localhost:3000/dashboard/overview \
  -H "Authorization: Bearer $TOKEN_SW" | python3 -m json.tool
```
**预期**:403。

### 7. 无 token → 401
```bash
curl -s --noproxy "*" http://localhost:3000/dashboard/overview | python3 -m json.tool
```
**预期**:401。

---

## 十、Files 文件上传测试

> ⚠️ POST /files/upload 需要 JwtAuthGuard。文件大小限制 10MB，扩展名白名单 pdf/png/jpg/jpeg/doc/docx/xls/xlsx。

### 准备
```bash
TOKEN=$(curl ... username:admin)
echo "test pdf content" > /tmp/test.pdf
echo "test png content" > /tmp/test.png
echo "virus" > /tmp/test.exe
dd if=/dev/zero of=/tmp/big.pdf bs=1m count=11 2>/dev/null
```

### 1. 上传 PDF
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/test.pdf" | python3 -m json.tool
```
**预期**:200，返回 `{ name, url, size, mimeType, uploadedAt }`。

### 2. 上传 PNG
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/test.png" | python3 -m json.tool
```
**预期**:200。

### 3. 无 token → 401
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/files/upload -F "file=@/tmp/test.pdf" | python3 -m json.tool
```
**预期**:401。

### 4. .exe → 400
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/test.exe" | python3 -m json.tool
```
**预期**:400，`不支持的文件类型 ".exe"`。

### 5. >10MB → 413
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/big.pdf" | python3 -m json.tool
```
**预期**:413 或 400（File too large）。

### 6. 返回 url 可访问
```bash
# 用步骤1返回的 url，如 /uploads/xxx.pdf
curl -s --noproxy "*" -o /dev/null -w "%{http_code}" http://localhost:3000/uploads/xxx.pdf
```
**预期**:200。

### 7. upload 返回可放入 archiveFiles
上传返回的对象直接作为 check-in 的 `archiveFiles` 数组元素，格式兼容（Json 字段，无字段限制）。

---

## 十一、Fission 业务裂变测试

> ⚠️ PATCH/confirm/archive/mark-invalid 限 `@Roles('主管','管理员')`。商务/业务/会计访问返回 403。
> ⚠️ price 仅记录报价，不参与佣金/奖励/收费计算。

### 登录
```bash
TOKEN_SW=$(curl ... username:shangwu)    # 商务
TOKEN_ZG=$(curl ... username:zhuguan)    # 主管
TOKEN_AD=$(curl ... username:admin)      # 管理员
```

### 1. 创建（不传 sourceCustomerId）
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/fission-leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" \
  -d '{"leadName":"某新建材公司","price":3000}' | python3 -m json.tool
```
**预期**:201，sourceCustomerId=null，initiatedBy=商务张三。

### 2. 商务 PATCH → 403
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/fission-leads/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SW" -d '{"leadName":"x"}' | python3 -m json.tool
```
**预期**:403。

### 3. 主管 PATCH 成功
```bash
curl -s --noproxy "*" -X PATCH http://localhost:3000/fission-leads/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZG" -d '{"leadName":"已更新"}' | python3 -m json.tool
```
**预期**:leadName 已更新，status 不变。

### 4. 商务 confirm → 403
### 5. 主管 confirm → 成功（confirmedById/confirmedAt 已填）
### 6. archive → 成功（archiveFiles/archivedById/archivedAt 已填）
### 7. mark-invalid → 成功
### 8. 已归档后 mark-invalid → 400
### 9. 列表/详情 → 成功
### 10. 无 token → 401

---

## 十二、ManualDashboard 手动看板测试

> ⚠️ 创建/修改限 `@Roles('总务','管理员')`，查看限 `@Roles('主管','总务','管理员')`，商务/业务/会计→403。
> ⚠️ profitAmount 和 totalAmount **前端不传**，后端自动计算。
> ⚠️ month 必须 YYYY-MM 格式。salary 金额未传默认 0。

### 登录
```bash
TOKEN_ZW=$(curl ... username:zongwu)    # 总务
TOKEN_ZG=$(curl ... username:zhuguan)   # 主管
TOKEN_SW=$(curl ... username:shangwu)   # 商务
```

### 1. 总务创建经营记录
```bash
curl -s --noproxy "*" -X POST http://localhost:3000/manual-dashboard/business-reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZW" \
  -d '{"month":"2026-06","revenueAmount":500000,"costAmount":300000}' | python3 -m json.tool
```
**预期**:profitAmount=200000(自动计算)。

### 2. 商务创建 → 403
### 3. 主管查看 summary（金额 number）
### 4. 非法 month "2026-6" → 400
### 5. PATCH 后 profitAmount 自动重算
### 6. 总务创建工资记录（totalAmount 自动算）
### 7. salary 只传 baseSalary，其他默认 0 → totalAmount 正确
### 8. 同一员工同一月重复 → 409
### 9. 商务查看工资 → 403
### 10. 无 token → 401

---

## 十三、前端联调测试(前端做完后逐项验)

| 测试项 | 怎么验 | 预期 |
|---|---|---|
| 登录后是否保存 token | 登录成功后查本地存储 | token 已存(uni.getStorageSync 能取到) |
| 填单是否提交成功 | 填单页提交一个客户 | 有成功提示,后端 curl 查列表能看到这条 |
| 列表是否展示 | 打开列表页 | 显示客户列表,筛选/搜索可用 |
| 详情是否能打开 | 列表点某客户 | 跳详情页,显示完整信息 |
| 编辑是否能保存 | 详情→编辑→改字段→保存 | 提示保存成功,返回看到更新后的值 |
| token 失效处理 | 手动清掉本地 token 再访问 | 跳回登录页 |

---

## 十四、回归测试顺序(每次改代码后照做)

1. **`pnpm build`** — 先确认能编译通过(0 errors)。
2. **启动后端** — `pnpm start:dev`,看到 successfully started。
3. **Auth 测试** — 跑第二节 6 条,确认 401/403/200 都对。
4. **Customers 测试** — 跑第三节 6 条,确认增删改查筛选都对。
5. **Users 测试** — 跑第四节 4 条,确认列表/筛选/401/400 都对。
6. **WorkOrder 测试** — 跑第五节,确认创建/状态流转/打卡/归档校验/401 都对。
7. **Charge 测试** — 跑第六节,确认 403/催收/确认/400 都对。
8. **TenantRegister 测试** — 跑第七节,确认代理户/403/400/分派/本人确认/401 都对。
9. **Task 测试** — 跑第八节,确认主管创建/403/非本人403/确认/完成/400/PATCH/401 都对。
10. **Dashboard 测试** — 跑第九节,确认 overview/customers/services/tasks/charges/403/401/金额number 都对。
11. **Files 测试** — 跑第十节,确认 PDF上传/PNG/401/400/413/静态访问 都对。
12. **Fission 测试** — 跑第十一节,确认创建/403/PATCH/confirm/archive/mark-invalid/401 都对。
13. **ManualDashboard 测试** — 跑第十二节,确认经营/工资/403/401/自动计算/409 都对。
14. **前端页面测试** — 跑第十三节(如果改动涉及前端)。

> 原则:改了后端,至少跑 Auth + Customers;改了某个模块,重点测那个模块 + 它依赖的(如改客户必连带测登录)。

---

## 十五、常见测试问题

| 问题 | 现象 | 解决 |
|---|---|---|
| 端口 3000 被占用 | 启动报 `EADDRINUSE :::3000` | `lsof -ti:3000 \| xargs kill -9` 杀旧进程再启 |
| 代理导致 502 | curl localhost 返回 `502 Bad Gateway` | curl 加 `--noproxy "*"`,或关 VPN/代理 |
| token 过期 | 之前能用的接口突然 401 | 重新登录拿新 token(token 有有效期,默认 7 天) |
| 枚举值传错 | 新建/修改返回 400 | 检查 customerCategory/companyType/tier 是否用了正确的中文枚举值(见 API_CONTRACT.md) |
| Decimal 字段格式不对 | 金额返回成奇怪字符串、或精度异常 | 确认字段是 Decimal(12,2);后端 Service 应做 Decimal→数字序列化 |
| python json.tool 报错 | `Expecting value: line 1 column 1` | 多行命令要整条一起执行;或去掉 `\| python3 -m json.tool` 看原始返回 |
| 中文显示成 \uXXXX | 原始 JSON 里中文是编码 | 正常现象,解析后即中文;想直接看中文可去掉 json.tool |
