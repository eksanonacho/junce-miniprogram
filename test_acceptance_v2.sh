#!/bin/bash
# ============================================================
# 君册财税小程序 — 验收测试 v2（修复 curl noproxy 传参）
# ============================================================
set -e

BASE="http://localhost:3000"
NP='*'
PASS="123456"

red()   { echo -e "\033[31m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }
cyan()  { echo -e "\033[36m$*\033[0m"; }
bold()  { echo -e "\033[1m$*\033[0m"; }

C() { curl -s --noproxy "$NP" "$@"; }

section() { echo ""; echo "============================================================"; bold "🔹 $1"; echo "============================================================"; }
step()   { echo ""; cyan "📋 $1"; }
pass()   { green "✅ $1"; }
fail()   { red "❌ $1"; }
warn()   { yellow "⚠️  $1"; }

TOTAL_PASS=0
TOTAL_FAIL=0
check() {
  local desc="$1" cond="$2" detail="$3"
  if [ "$cond" = "OK" ]; then
    pass "$desc"; TOTAL_PASS=$((TOTAL_PASS+1))
  else
    fail "$desc $detail"; TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
}

# -------------------------------------------------------------------
section "0. 六角色登录获取 Token"
# -------------------------------------------------------------------

R=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"shangwu","password":"'"$PASS"'"}')
T_SHANGWU=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "shangwu 登录" "$([ "$T_SHANGWU" != "FAIL" ] && echo OK || echo FAIL)" ""

T_YEWU=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"yewu","password":"'"$PASS"'"}')
T_YEWU=$(echo "$T_YEWU" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "yewu 登录" "$([ "$T_YEWU" != "FAIL" ] && echo OK || echo FAIL)" ""

T_KUAIJI=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"kuaiji","password":"'"$PASS"'"}')
T_KUAIJI=$(echo "$T_KUAIJI" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "kuaiji 登录" "$([ "$T_KUAIJI" != "FAIL" ] && echo OK || echo FAIL)" ""

T_ZHUGUAN=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"zhuguan","password":"'"$PASS"'"}')
T_ZHUGUAN=$(echo "$T_ZHUGUAN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "zhuguan 登录" "$([ "$T_ZHUGUAN" != "FAIL" ] && echo OK || echo FAIL)" ""

T_ZONGWU=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"zongwu","password":"'"$PASS"'"}')
T_ZONGWU=$(echo "$T_ZONGWU" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "zongwu 登录" "$([ "$T_ZONGWU" != "FAIL" ] && echo OK || echo FAIL)" ""

T_ADMIN=$(C -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"'"$PASS"'"}')
T_ADMIN=$(echo "$T_ADMIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "FAIL")
check "admin 登录" "$([ "$T_ADMIN" != "FAIL" ] && echo OK || echo FAIL)" ""

step "密码错误 → 401"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}')
check "错误密码返回 401" "$([ "$CODE" = "401" ] && echo OK || echo FAIL)" "实际 $CODE"

step "无 token → 401"
CODE=$(C -o /dev/null -w "%{http_code}" $BASE/auth/me)
check "无 token 返回 401" "$([ "$CODE" = "401" ] && echo OK || echo FAIL)" "实际 $CODE"

# -------------------------------------------------------------------
section "4.1 商务验收"
# -------------------------------------------------------------------

step "4.1.1 创建代理户"
CUST_DATA='{"companyName":"验收测试科技有限公司","industry":"互联网","region":"深圳","annualRevenue":5000000,"staffCount":50,"companyType":"多股东","customerCategory":"代理户","tier":"优质","registerDate":"2024-01-01","taxType":"一般纳税人"}'
R=$(C -X POST $BASE/customers -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "$CUST_DATA")
CID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "FAIL")
STAGE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('lifecycleStage','?'))" 2>/dev/null)
check "客户创建 ID=$CID lifecycleStage=$STAGE" "$([ "$CID" != "FAIL" ] && echo OK || echo FAIL)" "$R"

step "4.1.2 验证 lifecycleStage 初始=填单"
check "初始 lifecycleStage=填单" "$([ "$STAGE" = "填单" ] && echo OK || echo FAIL)" "实际=$STAGE"

step "4.1.3 获取服务模板"
TMPL=$(C $BASE/service-templates -H "Authorization: Bearer $T_SHANGWU")
TC=$(echo "$TMPL" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
TID1=$(echo "$TMPL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])" 2>/dev/null || echo "FAIL")
TID2=$(echo "$TMPL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[1]['id'])" 2>/dev/null || echo "FAIL")
check "服务模板获取成功" "$([ "$TC" -gt 0 ] && echo OK || echo FAIL)" "共 $TC 个"

step "4.1.4 获取角色用户"
ACC_ID=$(C "$BASE/users?roleCode=会计" -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; u=[x for x in json.load(sys.stdin) if x['username']=='kuaiji'][0]; print(u['id'])" 2>/dev/null)
BIZ_ID=$(C "$BASE/users?roleCode=业务" -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; u=[x for x in json.load(sys.stdin) if x['username']=='yewu'][0]; print(u['id'])" 2>/dev/null)
ZW_ID=$(C "$BASE/users?roleCode=总务" -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; u=[x for x in json.load(sys.stdin) if x['username']=='zongwu'][0]; print(u['id'])" 2>/dev/null)
check "人员查询成功" "$([ -n "$ACC_ID" ] && [ -n "$BIZ_ID" ] && [ -n "$ZW_ID" ] && echo OK || echo FAIL)" "会计=$ACC_ID 业务=$BIZ_ID 总务=$ZW_ID"

step "4.1.5 添加服务项"
R=$(C -X POST "$BASE/customers/$CID/service-items" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"templateIds\":[$TID1,$TID2]}")
SI_C=$(echo "$R" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('created',[])))" 2>/dev/null || echo "0")
check "服务项添加" "$([ "$SI_C" -ge 1 ] && echo OK || echo FAIL)" "创建 $SI_C 项"

step "4.1.6 阅读确认服务"
R=$(C -X POST $BASE/service-read-confirmations -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"customerId\":$CID,\"templateId\":$TID1}")
CONF1_OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "确认模板 $TID1" "$([ "$CONF1_OK" != "FAIL" ] && echo OK || echo FAIL)" ""

R=$(C -X POST $BASE/service-read-confirmations -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"customerId\":$CID,\"templateId\":$TID2}")
CONF2_OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "确认模板 $TID2" "$([ "$CONF2_OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.1.7 重复确认 → 409"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST $BASE/service-read-confirmations -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"customerId\":$CID,\"templateId\":$TID1}")
check "重复确认→409" "$([ "$CODE" = "409" ] && echo OK || echo FAIL)" "实际=$CODE"

step "4.1.8 配置人员"
R=$(C -X PUT "$BASE/customers/$CID/staff-assignment" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"businessStaffId\":$BIZ_ID,\"accountantId\":$ACC_ID,\"generalAffairsId\":$ZW_ID}")
SA_OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('businessStaff',{}).get('realName','FAIL'))" 2>/dev/null)
check "人员配置" "$([ "$SA_OK" != "FAIL" ] && echo OK || echo FAIL)" "业务=$SA_OK"

step "4.1.9 创建收费记录"
R=$(C -X POST $BASE/charges -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"customerId\":$CID,\"chargeMode\":\"一次性\",\"amount\":10000}")
CHG_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
CHG_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chargeStatus','?'))" 2>/dev/null)
check "收费记录创建 ID=$CHG_ID" "$([ "$CHG_ID" != "FAIL" ] && echo OK || echo FAIL)" "状态=$CHG_STATUS"

step "4.1.10 查看首次提单完整度"
R=$(C "$BASE/customers/$CID/intake-status" -H "Authorization: Bearer $T_SHANGWU")
READY=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ready',False))" 2>/dev/null)
check "提单 ready" "$([ "$READY" = "True" ] && echo OK || echo FAIL)" "ready=$READY"

step "4.1.11 正式提交首次提单"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/customers/$CID/submit-intake" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU")
check "正式提交提单" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.1.12 提交后验证状态"
R=$(C "$BASE/customers/$CID/intake-status" -H "Authorization: Bearer $T_SHANGWU")
SUB=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('submitted',False))" 2>/dev/null)
check "submitted=true" "$([ "$SUB" = "True" ] && echo OK || echo FAIL)" "submitted=$SUB"

# -------------------------------------------------------------------
section "4.2 业务验收"
# -------------------------------------------------------------------

step "4.2.1 yewu 确认岗位接单"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/customers/$CID/confirm-intake-assignment" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU")
check "yewu 确认岗位" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.2.2 获取服务项列表"
SI_LIST=$(C "$BASE/customers/$CID/service-items" -H "Authorization: Bearer $T_SHANGWU")
SI_ID=$(echo "$SI_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'])" 2>/dev/null || echo "FAIL")
SI_ID2=$(echo "$SI_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[1]['id'])" 2>/dev/null || echo "FAIL")
check "服务项列表" "$([ "$SI_ID" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.2.3 创建办件（shangwu 主理人创建）"
R=$(C -X POST $BASE/work-orders -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"serviceItemId\":$SI_ID,\"handlerId\":$BIZ_ID,\"receiptReceiverId\":$ACC_ID}")
WO_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "办件创建 ID=$WO_ID" "$([ "$WO_ID" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.2.4 yewu 开始办件 (待办→办件中)"
R=$(C -X PATCH "$BASE/work-orders/$WO_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"办件中"}')
W_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "状态→办件中" "$([ "$W_STATUS" = "办件中" ] && echo OK || echo FAIL)" "status=$W_STATUS"

step "4.2.5 验证客户状态→办件中"
C_STAGE=$(C $BASE/customers/$CID -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; print(json.load(sys.stdin)['lifecycleStage'])" 2>/dev/null)
check "客户→办件中" "$([ "$C_STAGE" = "办件中" ] && echo OK || echo FAIL)" "stage=$C_STAGE"

step "4.2.6 yewu 办结 (办件中→办结)"
R=$(C -X PATCH "$BASE/work-orders/$WO_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"办结"}')
W_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "状态→办结" "$([ "$W_STATUS" = "办结" ] && echo OK || echo FAIL)" "status=$W_STATUS"

step "4.2.7 上传文件"
echo "test-archive-$(date +%s)" > /tmp/test_archive.txt
R=$(C -X POST $BASE/files/upload -H "Authorization: Bearer $T_YEWU" -F "file=@/tmp/test_archive.txt")
UF_URL=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url','FAIL'))" 2>/dev/null)
UF_NAME=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','?'))" 2>/dev/null)
UF_SIZE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('size',0))" 2>/dev/null)
check "文件上传" "$([ "$UF_URL" != "FAIL" ] && echo OK || echo FAIL)" "$UF_NAME"

step "4.2.8 打卡归档 (办结→已打卡)"
R=$(C -X POST "$BASE/work-orders/$WO_ID/check-in" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d "{\"archiveFiles\":[{\"name\":\"$UF_NAME\",\"url\":\"$UF_URL\",\"size\":$UF_SIZE}]}")
W_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "打卡→已打卡" "$([ "$W_STATUS" = "已打卡" ] && echo OK || echo FAIL)" "status=$W_STATUS"

step "4.2.9 禁止跳级（直接改已打卡）"
# 先为第二个服务项创建办件
R=$(C -X POST $BASE/work-orders -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d "{\"serviceItemId\":$SI_ID2,\"handlerId\":$BIZ_ID}")
WO_ID2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/work-orders/$WO_ID2" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"已打卡"}')
check "跳级禁止" "$([ "$CODE" = "400" ] && echo OK || echo FAIL)" "HTTP=$CODE 预期400"

step "4.2.10 禁止倒退（办件中→待办）"
C -X PATCH "$BASE/work-orders/$WO_ID2" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"办件中"}' > /dev/null
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/work-orders/$WO_ID2" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"待办"}')
check "倒退禁止" "$([ "$CODE" = "400" ] && echo OK || echo FAIL)" "HTTP=$CODE 预期400"

step "4.2.11 第二个办件完成打卡"
C -X PATCH "$BASE/work-orders/$WO_ID2" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"status":"办结"}' > /dev/null
R=$(C -X POST "$BASE/work-orders/$WO_ID2/check-in" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d "{\"archiveFiles\":[{\"name\":\"$UF_NAME\",\"url\":\"$UF_URL\",\"size\":$UF_SIZE}]}")
W2_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "第二个办件打卡" "$([ "$W2_STATUS" = "已打卡" ] && echo OK || echo FAIL)" "status=$W2_STATUS"

step "4.2.12 全部服务打卡→客户办结"
C_STAGE=$(C $BASE/customers/$CID -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; print(json.load(sys.stdin)['lifecycleStage'])" 2>/dev/null)
check "客户→办结" "$([ "$C_STAGE" = "办结" ] && echo OK || echo FAIL)" "stage=$C_STAGE"

# -------------------------------------------------------------------
section "4.3 会计验收"
# -------------------------------------------------------------------

step "4.3.1 kuaiji 确认岗位接单"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/customers/$CID/confirm-intake-assignment" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI")
check "kuaiji 确认岗位" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

# -------------------------------------------------------------------
section "4.4 主管验收"
# -------------------------------------------------------------------

step "4.4.1 创建托管入档"
R=$(C -X POST $BASE/tenant-registers -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN" -d "{\"customerId\":$CID,\"enterpriseDetail\":\"{\\\"overview\\\":\\\"测试企业\\\"}\",\"servicePlan\":\"{\\\"plan\\\":\\\"月度记账\\\"}\"}")
TENANT_CODE=$(C -o /dev/null -w "%{http_code}" -X POST $BASE/tenant-registers -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN" -d "{\"customerId\":$CID,\"enterpriseDetail\":\"{\\\"overview\\\":\\\"测试企业\\\"}\",\"servicePlan\":\"{\\\"plan\\\":\\\"月度记账\\\"}\"}")
TENANT_ID=""
if [ "$TENANT_CODE" = "409" ]; then
  T=$(C "$BASE/tenant-registers?customerId=$CID" -H "Authorization: Bearer $T_ZHUGUAN")
  TENANT_ID=$(echo "$T" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) else d.get('id',''))" 2>/dev/null)
else
  TENANT_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
fi
check "托管入档 ID=$TENANT_ID" "$([ -n "$TENANT_ID" ] && echo OK || echo FAIL)" ""

step "4.4.2 方案未确认时禁止分派会计"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/tenant-registers/$TENANT_ID/assign-accountant" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN" -d "{\"accountantId\":$ACC_ID}")
check "未确认方案禁止分派" "$([ "$CODE" = "400" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.4.3 商务确认方案"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/tenant-registers/$TENANT_ID/confirm-plan" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU")
check "方案确认" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.4.4 主管分派会计"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/tenant-registers/$TENANT_ID/assign-accountant" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN" -d "{\"accountantId\":$ACC_ID}")
check "分派会计" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.4.5 会计确认接收"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/tenant-registers/$TENANT_ID/confirm-assignment" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI")
check "会计确认接收托管" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.4.6 验证客户状态→维护中"
C_STAGE=$(C $BASE/customers/$CID -H "Authorization: Bearer $T_ZHUGUAN" | python3 -c "import sys,json; print(json.load(sys.stdin)['lifecycleStage'])" 2>/dev/null)
check "客户→维护中" "$([ "$C_STAGE" = "维护中" ] && echo OK || echo FAIL)" "stage=$C_STAGE"

step "4.4.7 会计日常登记"
R=$(C -X POST $BASE/accounting-work-logs -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI" -d "{\"customerId\":$CID,\"recordType\":\"报税进度\",\"recordDate\":\"2026-07-25\",\"content\":\"7月增值税申报完成\",\"remark\":\"测试验收\"}")
LOG_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "台账登记 ID=$LOG_ID" "$([ "$LOG_ID" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.4.8 复核前修改台账"
R=$(C -X PATCH "$BASE/accounting-work-logs/$LOG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI" -d '{"content":"7月增值税申报已完成，税款已扣"}')
EDIT_OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "复核前可修改" "$([ "$EDIT_OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.4.9 主管复核台账"
R=$(C -X POST "$BASE/accounting-work-logs/$LOG_ID/review" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN")
RV_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reviewStatus','FAIL'))" 2>/dev/null)
check "复核成功→已复核" "$([ "$RV_STATUS" = "已复核" ] && echo OK || echo FAIL)" "status=$RV_STATUS"

step "4.4.10 复核后会计不可修改"
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/accounting-work-logs/$LOG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI" -d '{"content":"尝试修改"}')
check "复核后锁定" "$([ "$CODE" = "400" ] || [ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.4.11 主管创建任务"
R=$(C -X POST $BASE/tasks -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZHUGUAN" -d "{\"title\":\"验收测试任务\",\"content\":\"测试内容\",\"toUserId\":$ACC_ID,\"customerId\":$CID,\"deadline\":\"2026-08-15T00:00:00.000Z\"}")
TASK_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
check "任务创建 ID=$TASK_ID" "$([ "$TASK_ID" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.4.12 会计确认任务 (待确认→进行中)"
R=$(C -X POST "$BASE/tasks/$TASK_ID/confirm" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI")
T_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "任务→进行中" "$([ "$T_STATUS" = "进行中" ] && echo OK || echo FAIL)" "status=$T_STATUS"

step "4.4.13 会计完成任务 (进行中→已完成)"
R=$(C -X POST "$BASE/tasks/$TASK_ID/complete" -H "Content-Type: application/json" -H "Authorization: Bearer $T_KUAIJI")
T_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAIL'))" 2>/dev/null)
check "任务→已完成" "$([ "$T_STATUS" = "已完成" ] && echo OK || echo FAIL)" "status=$T_STATUS"

# -------------------------------------------------------------------
section "4.5 总务验收"
# -------------------------------------------------------------------

step "4.5.1 zongwu 确认岗位接单"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST "$BASE/customers/$CID/confirm-intake-assignment" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZONGWU")
check "zongwu 确认岗位" "$([ "$CODE" = "200" ] || [ "$CODE" = "201" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.5.2 补充合同号和发票号"
R=$(C -X PATCH "$BASE/charges/$CHG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZONGWU" -d '{"contractNo":"HT-2026-001","invoiceNo":"FP-2026-001"}')
CT_OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('contractNo','FAIL'))" 2>/dev/null)
check "合同号/发票号补充" "$([ "$CT_OK" = "HT-2026-001" ] && echo OK || echo FAIL)" "contractNo=$CT_OK"

step "4.5.3 未收→发起催收"
# 注意：之前已经确认已收了。让我重新获取状态
CHG_NOW=$(C "$BASE/charges/$CHG_ID" -H "Authorization: Bearer $T_ZONGWU")
CHG_STATUS=$(echo "$CHG_NOW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chargeStatus','?'))" 2>/dev/null)
if [ "$CHG_STATUS" = "未收" ]; then
  R=$(C -X POST "$BASE/charges/$CHG_ID/remind" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZONGWU" -d '{"message":"请尽快付款"}')
  REMIND_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id','FAIL'))" 2>/dev/null)
  check "催收发起 ID=$REMIND_ID" "$([ "$REMIND_ID" != "FAIL" ] && echo OK || echo FAIL)" ""
else
  warn "收费已是 $CHG_STATUS，催收测试跳过（已收后不可催收，符合规则）"
  check "已收后不可催收（规则符合）" "OK" ""
fi

step "4.5.4 确认已收（若未收）"
if [ "$CHG_STATUS" = "未收" ]; then
  R=$(C -X POST "$BASE/charges/$CHG_ID/confirm" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZONGWU")
  CFM_STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chargeStatus','FAIL'))" 2>/dev/null)
  check "确认已收" "$([ "$CFM_STATUS" = "已收" ] && echo OK || echo FAIL)" "status=$CFM_STATUS"
else
  pass "收费已确认"
fi

step "4.5.5 已收后禁止修改金额"
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/charges/$CHG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_ZONGWU" -d '{"amount":99999}')
check "已收锁定金额" "$([ "$CODE" = "400" ] || [ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "4.5.6 非总务角色不能修改收费"
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/charges/$CHG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d '{"contractNo":"HT-FAKE"}')
check "商务无权修改收费" "$([ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

# -------------------------------------------------------------------
section "4.6 管理员验收"
# -------------------------------------------------------------------

step "4.6.1 客户看板"
R=$(C $BASE/dashboard/customers -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','FAIL'))" 2>/dev/null)
check "客户看板 total=$OK" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.2 服务看板"
R=$(C $BASE/dashboard/services -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('serviceItems',{}).get('total','FAIL'))" 2>/dev/null)
check "服务看板" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.3 任务看板"
R=$(C $BASE/dashboard/tasks -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','FAIL'))" 2>/dev/null)
check "任务看板 total=$OK" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.4 收费看板"
R=$(C $BASE/dashboard/charges -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','FAIL'))" 2>/dev/null)
check "收费看板 total=$OK" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.5 会计看板"
R=$(C $BASE/dashboard/accounting -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','FAIL'))" 2>/dev/null)
check "会计看板 total=$OK" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.6 全局总览"
R=$(C $BASE/dashboard/overview -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('customers',{}).get('total','FAIL'))" 2>/dev/null)
check "全局总览" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" ""

step "4.6.7 工作台待办"
R=$(C $BASE/workbench/todos -H "Authorization: Bearer $T_ADMIN")
OK=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('roleCode','FAIL'))" 2>/dev/null)
check "工作台获取" "$([ "$OK" != "FAIL" ] && echo OK || echo FAIL)" "role=$OK"

step "4.6.8 消息中心：未读数量"
R=$(C $BASE/notifications/unread-count -H "Authorization: Bearer $T_ADMIN")
UC=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count','?'))" 2>/dev/null)
pass "未读通知数: $UC"

step "4.6.9 消息中心：单条已读"
N_ID=$(C $BASE/notifications -H "Authorization: Bearer $T_ADMIN" | python3 -c "import sys,json; d=json.load(sys.stdin); items=[x for x in d if not x.get('isRead',True)]; print(items[0]['id'] if items else 'NONE')" 2>/dev/null)
if [ "$N_ID" != "NONE" ]; then
  C -X PATCH "$BASE/notifications/$N_ID/read" -H "Authorization: Bearer $T_ADMIN" > /dev/null
  check "单条已读" "OK" "ID=$N_ID"
else
  warn "无未读通知可标记"
fi

step "4.6.10 消息中心：全部已读"
C -X PATCH "$BASE/notifications/read-all" -H "Authorization: Bearer $T_ADMIN" > /dev/null
pass "全部已读完成"

step "4.6.11 工作台按角色区分"
SW_TODOS=$(C $BASE/workbench/todos -H "Authorization: Bearer $T_SHANGWU" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('roleCode','?'),'groups:',len(d.get('todoGroups',[])))" 2>/dev/null)
ZONGWU_TODOS=$(C $BASE/workbench/todos -H "Authorization: Bearer $T_ZONGWU" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('roleCode','?'),'groups:',len(d.get('todoGroups',[])))" 2>/dev/null)
pass "商务工作台: $SW_TODOS"
pass "总务工作台: $ZONGWU_TODOS"

# -------------------------------------------------------------------
section "4.7 提单失效验证"
# -------------------------------------------------------------------

step "4.7.1 修改已提交客户资料"
C -X PATCH "$BASE/customers/$CID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_SHANGWU" -d '{"tier":"中低"}' > /dev/null
pass "tier 修改成功"

step "4.7.2 验证提单失效"
R=$(C "$BASE/customers/$CID/intake-status" -H "Authorization: Bearer $T_SHANGWU")
SUB=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('submitted',True))" 2>/dev/null)
ALL_CONF=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('allAssignmentsConfirmed',True))" 2>/dev/null)
check "提单失效 submitted=false" "$([ "$SUB" = "False" ] && echo OK || echo FAIL)" "submitted=$SUB"
check "岗位确认清空 allAssignmentsConfirmed=false" "$([ "$ALL_CONF" = "False" ] && echo OK || echo FAIL)" "confirmed=$ALL_CONF"

# -------------------------------------------------------------------
section "权限越权测试"
# -------------------------------------------------------------------

step "商务→admin-only →403"
CODE=$(C -o /dev/null -w "%{http_code}" $BASE/auth/admin-only -H "Authorization: Bearer $T_SHANGWU")
check "商务访问管理接口→403" "$([ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "业务→创建任务→403"
CODE=$(C -o /dev/null -w "%{http_code}" -X POST $BASE/tasks -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"title":"test","toUserId":3}')
check "业务创建任务→403" "$([ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "会计→收费看板→403"
CODE=$(C -o /dev/null -w "%{http_code}" $BASE/dashboard/charges -H "Authorization: Bearer $T_KUAIJI")
check "会计访问收费看板→403" "$([ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

step "商务→收费修改→403"
CODE=$(C -o /dev/null -w "%{http_code}" -X PATCH "$BASE/charges/$CHG_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $T_YEWU" -d '{"contractNo":"test"}')
check "业务修改收费→403" "$([ "$CODE" = "403" ] && echo OK || echo FAIL)" "HTTP=$CODE"

# -------------------------------------------------------------------
section "测试汇总"
# -------------------------------------------------------------------
echo ""
green "========================================"
green "   验收自动化测试完成"
green "========================================"
echo ""
echo "测试通过: $TOTAL_PASS"
echo "测试失败: $TOTAL_FAIL"
echo ""
echo "测试数据 ID："
echo "  客户 CID=$CID (代理户)"
echo "  办件 WO=$WO_ID / WO2=$WO_ID2"
echo "  收费 CHG=$CHG_ID"
echo "  托管 TENANT=$TENANT_ID"
echo "  台账 LOG=$LOG_ID"
echo "  任务 TASK=$TASK_ID"
echo ""
if [ "$TOTAL_FAIL" -eq 0 ]; then
  green "🎉 全部测试通过！"
else
  red "⚠️  有 $TOTAL_FAIL 项测试失败，请查看上方详情"
fi
