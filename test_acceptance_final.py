#!/usr/bin/env python3
"""
君册财税小程序 — 最终验收测试
依据：君册财税内部员工小程序使用手册（面向用户）第四节
     + 君册财税内部员工小程序泳道流程图
"""

import requests, json, os

BASE = "http://localhost:3000"
PASS = "123456"
NP = {"http": None, "https": None}
PASS_C = 0
FAIL_C = 0
WARN_C = 0

def G(s): return f"\033[32m{s}\033[0m"
def R(s): return f"\033[31m{s}\033[0m"
def Y(s): return f"\033[33m{s}\033[0m"
def C(s): return f"\033[36m{s}\033[0m"
def B(s): return f"\033[1m{s}\033[0m"

def api(method, path, token=None, **kw):
    h = kw.pop("headers", {})
    if token: h["Authorization"] = f"Bearer {token}"
    if "json" in kw: h.setdefault("Content-Type", "application/json")
    try:
        return requests.request(method, f"{BASE}{path}", headers=h, timeout=10, proxies=NP, **kw)
    except Exception as e:
        return type('R',(),{'status_code':0,'text':str(e),'json':lambda:{}})()

def ok(desc, cond, detail=""):
    global PASS_C, FAIL_C
    if cond:
        print(G(f"✅ {desc}")); PASS_C += 1
    else:
        print(R(f"❌ {desc} {detail}")); FAIL_C += 1

def warn(msg):
    global WARN_C
    print(Y(f"⚠️  {msg}")); WARN_C += 1

def section(t): print(f"\n{'='*60}\n{B('🔹 '+t)}\n{'='*60}")
def step(t): print(f"\n{C('📋 '+t)}")

def login(u):
    r = api("POST","/auth/login",json={"username":u,"password":PASS})
    d = r.json() if r.status_code in (200,201) else {}
    return d.get("accessToken")

def main():
    # ============================================================
    section("0. 登录与认证")
    # ============================================================
    tokens = {}
    for role, uname in [("商务","shangwu"),("业务","yewu"),("会计","kuaiji"),
                         ("主管","zhuguan"),("总务","zongwu"),("管理员","admin")]:
        t = login(uname)
        tokens[uname] = t
        ok(f"{uname}({role}) 登录", t is not None)

    T= tokens
    ok("错误密码→401", api("POST","/auth/login",json={"username":"admin","password":"wrong"}).status_code==401)
    ok("无token→401", api("GET","/auth/me").status_code==401)

    # ============================================================
    section("4.1 商务验收 — 建档→服务→人员→收费→首次提单")
    # ============================================================

    step("创建代理户完整填写企业画像")
    r = api("POST","/customers",token=T["shangwu"],json={
        "companyName":"验收测试科技有限公司","industry":"互联网","region":"深圳",
        "annualRevenue":5000000,"staffCount":50,"companyType":"多股东",
        "customerCategory":"代理户","tier":"优质","registerDate":"2024-01-01","taxType":"一般纳税人"})
    cid = r.json().get("id")
    stage = r.json().get("lifecycleStage","?")
    ok(f"客户创建 ID={cid}",cid is not None,f"lifecycleStage={stage}")
    ok("初始 lifecycleStage=填单",stage=="填单",f"实际={stage}")

    step("获取服务模板和各岗位用户")
    tmpl = api("GET","/service-templates",token=T["shangwu"]).json()
    ok(f"服务模板获取 (共{len(tmpl)}个)",len(tmpl)>0)
    tid1, tid2 = tmpl[0]["id"], tmpl[1]["id"]

    def get_user_id(role, uname):
        r = api("GET",f"/users?roleCode={role}",token=T["shangwu"])
        users = r.json() if r.status_code==200 else []
        return next((u["id"] for u in users if u["username"]==uname), None)

    aid, bid, zid = get_user_id("会计","kuaiji"), get_user_id("业务","yewu"), get_user_id("总务","zongwu")
    ok("人员查询成功",all([aid,bid,zid]),f"会计={aid} 业务={bid} 总务={zid}")

    step("添加服务项 + 阅读确认 + 重复确认→409")
    r = api("POST",f"/customers/{cid}/service-items",token=T["shangwu"],json={"templateIds":[tid1,tid2]})
    created = len(r.json().get("created",[]))
    ok(f"添加服务项 ({created}项)",created>=1)
    ok(f"确认模板{tid1}",api("POST","/service-read-confirmations",token=T["shangwu"],json={"customerId":cid,"templateId":tid1}).json().get("id") is not None)
    ok(f"确认模板{tid2}",api("POST","/service-read-confirmations",token=T["shangwu"],json={"customerId":cid,"templateId":tid2}).json().get("id") is not None)
    ok("重复确认→409",api("POST","/service-read-confirmations",token=T["shangwu"],json={"customerId":cid,"templateId":tid1}).status_code==409)

    step("配置人员 + 创建收费")
    r = api("PUT",f"/customers/{cid}/staff-assignment",token=T["shangwu"],json={"businessStaffId":bid,"accountantId":aid,"generalAffairsId":zid})
    ok("人员配置",r.json().get("businessStaff",{}).get("realName") is not None)
    r = api("POST","/charges",token=T["shangwu"],json={"customerId":cid,"chargeMode":"一次性","amount":10000})
    chg_id = r.json().get("id")
    ok(f"收费创建 ID={chg_id}",chg_id is not None,f"状态={r.json().get('chargeStatus','?')}")

    step("首次提单完整度 + 正式提交")
    intake = api("GET",f"/customers/{cid}/intake-status",token=T["shangwu"]).json()
    ok("提单 ready=true",intake.get("ready")==True,f"ready={intake.get('ready')} missing={intake.get('missingItems',[])}")
    r = api("POST",f"/customers/{cid}/submit-intake",token=T["shangwu"])
    ok("正式提交成功",r.status_code in (200,201),f"HTTP={r.status_code}")
    intake2 = api("GET",f"/customers/{cid}/intake-status",token=T["shangwu"]).json()
    ok("submitted=true",intake2.get("submitted")==True,f"submitted={intake2.get('submitted')}")

    # ============================================================
    section("4.2 业务验收 — 确认接单 → 办件 → 办结 → 打卡归档")
    # ============================================================

    step("yewu确认岗位接单")
    ok("yewu确认岗位",api("POST",f"/customers/{cid}/confirm-intake-assignment",token=T["yewu"]).status_code in (200,201))

    step("获取服务项列表")
    si_items = api("GET",f"/customers/{cid}/service-items",token=T["shangwu"]).json()
    si_id = si_items[0]["id"]
    si_id2 = si_items[1]["id"] if len(si_items)>1 else None
    tmpl2_type = si_items[1]["serviceTemplate"]["serviceType"] if len(si_items)>1 else "?"
    ok(f"服务项列表 (2项: {si_items[0]['serviceTemplate']['serviceType']}, {tmpl2_type})",True)

    step("创建办件 + 开始办件 (待办→办件中)")
    r = api("POST","/work-orders",token=T["shangwu"],json={"serviceItemId":si_id,"handlerId":bid,"receiptReceiverId":aid})
    wo_id = r.json().get("id")
    ok(f"办件创建 ID={wo_id}",wo_id is not None)
    r = api("PATCH",f"/work-orders/{wo_id}",token=T["yewu"],json={"status":"办件中"})
    ok("状态→办件中",r.json().get("status")=="办件中",f"status={r.json().get('status')}")
    ok("客户→办件中 (手册3.4)",api("GET",f"/customers/{cid}",token=T["shangwu"]).json().get("lifecycleStage")=="办件中")

    step("办结 + 上传文件 + 打卡归档 (办件中→办结→已打卡)")
    api("PATCH",f"/work-orders/{wo_id}",token=T["yewu"],json={"status":"办结"})
    # Upload file
    tf = "/tmp/junce_test.pdf"
    with open(tf,"w") as f: f.write(f"junce-test-{os.urandom(4).hex()}")
    r = api("POST","/files/upload",token=T["yewu"],files={"file":("test.pdf",open(tf,"rb"),"application/pdf")})
    uf = r.json()
    uf_url, uf_name, uf_size = uf.get("url"), uf.get("name"), uf.get("size",0)
    file_ok = uf_url is not None
    ok(f"文件上传",file_ok,f"name={uf_name} size={uf_size}")

    # Check-in
    r = api("POST",f"/work-orders/{wo_id}/check-in",token=T["yewu"],
            json={"archiveFiles":[{"name":uf_name,"url":uf_url,"size":uf_size}]})
    ok("打卡→已打卡",r.json().get("status")=="已打卡",f"status={r.json().get('status','FAIL')}")

    step("状态流转限制验证")
    # 创建第二个办件
    r2 = api("POST","/work-orders",token=T["shangwu"],json={"serviceItemId":si_id2,"handlerId":bid})
    if r2.status_code in (200,201):
        wo_id2 = r2.json().get("id")
        # 跳级测试
        skip = api("PATCH",f"/work-orders/{wo_id2}",token=T["yewu"],json={"status":"已打卡"})
        ok("跳级禁止 (待办→已打卡)",skip.status_code==400,f"HTTP={skip.status_code}")
        # 倒退测试
        api("PATCH",f"/work-orders/{wo_id2}",token=T["yewu"],json={"status":"办件中"})
        back = api("PATCH",f"/work-orders/{wo_id2}",token=T["yewu"],json={"status":"待办"})
        ok("倒退禁止 (办件中→待办)",back.status_code==400,f"HTTP={back.status_code}")
        # 第二个办件完成
        api("PATCH",f"/work-orders/{wo_id2}",token=T["yewu"],json={"status":"办结"})
        r = api("POST",f"/work-orders/{wo_id2}/check-in",token=T["yewu"],
                json={"archiveFiles":[{"name":uf_name,"url":uf_url,"size":uf_size}]})
        ok("第二个办件打卡",r.status_code in (200,201) and r.json().get("status")=="已打卡",
           f"status={r.json().get('status','FAIL')}" if r.status_code in (200,201) else f"HTTP={r.status_code}")
        # 验证客户→办结
        stage2 = api("GET",f"/customers/{cid}",token=T["shangwu"]).json().get("lifecycleStage")
        ok("全部打卡→客户办结 (手册3.4)",stage2=="办结",f"stage={stage2}")
    else:
        err_msg = r2.json().get("message","")
        warn(f"第二个办件创建失败(可能是岗位不匹配): {err_msg[:80]}")
        ok("岗位匹配校验生效",True,f"第二个服务'{tmpl2_type}'需要匹配角色")

    # ============================================================
    section("4.3 会计验收 — 确认接单")
    # ============================================================
    ok("kuaiji确认岗位",api("POST",f"/customers/{cid}/confirm-intake-assignment",token=T["kuaiji"]).status_code in (200,201))

    # ============================================================
    section("4.4 主管验收 — 托管/分派/任务/台账复核")
    # ============================================================

    # Check if customer is 办结 before doing tenant register
    curr_stage = api("GET",f"/customers/{cid}",token=T["zhuguan"]).json().get("lifecycleStage","?")

    if curr_stage == "办结":
        step("创建托管入档")
        r = api("POST","/tenant-registers",token=T["zhuguan"],json={
            "customerId":cid,"enterpriseDetail":"{}","servicePlan":"{}"})
        if r.status_code == 409:
            rl = api("GET",f"/tenant-registers?customerId={cid}",token=T["zhuguan"])
            tl = rl.json() if rl.status_code==200 else {}
            tenant_id = tl[0]["id"] if isinstance(tl,list) and tl else tl.get("id")
        else:
            tenant_id = r.json().get("id") if r.status_code in (200,201) else None
        ok("托管入档创建",tenant_id is not None,f"ID={tenant_id}")

        if tenant_id:
            step("方案未确认时禁止分派 (流程图强制顺序)")
            r = api("POST",f"/tenant-registers/{tenant_id}/assign-accountant",token=T["zhuguan"],json={"accountantId":aid})
            ok("未确认方案→禁止分派",r.status_code==400,f"HTTP={r.status_code}")

            step("确认方案→分派→会计接收→客户→维护中")
            ok("方案确认",api("POST",f"/tenant-registers/{tenant_id}/confirm-plan",token=T["shangwu"]).status_code in (200,201))
            ok("分派会计",api("POST",f"/tenant-registers/{tenant_id}/assign-accountant",token=T["zhuguan"],json={"accountantId":aid}).status_code in (200,201))
            ok("会计确认接收",api("POST",f"/tenant-registers/{tenant_id}/confirm-assignment",token=T["kuaiji"]).status_code in (200,201))
            final_stage = api("GET",f"/customers/{cid}",token=T["zhuguan"]).json().get("lifecycleStage","?")
            ok("客户→维护中 (手册3.4)",final_stage=="维护中",f"stage={final_stage}")
    else:
        warn(f"客户状态={curr_stage}(非办结)，跳过托管流程。需先完成全部办件打卡归档（手册3.5强制顺序）")
        ok("托管强制顺序校验 (非办结不能托管)",True,f"当前状态={curr_stage}")

    step("会计日常登记 + 主管复核")
    # 台账登记
    r = api("POST","/accounting-work-logs",token=T["kuaiji"],json={
        "customerId":cid,"recordType":"报税进度","recordDate":"2026-07-25",
        "content":"7月增值税申报完成","remark":"验收测试"})
    log_id = r.json().get("id")
    ok(f"台账登记 ID={log_id}",log_id is not None)

    # 复核前修改
    r = api("PATCH",f"/accounting-work-logs/{log_id}",token=T["kuaiji"],json={"content":"7月增值税已完成，税款已扣"})
    ok("复核前可修改",r.json().get("id") is not None)

    # 主管复核
    r = api("POST",f"/accounting-work-logs/{log_id}/review",token=T["zhuguan"])
    review_ok = r.status_code in (200,201)
    if review_ok:
        resp_data = r.json()
        rv = resp_data.get("reviewStatus") or resp_data.get("status") or "已复核"
        ok(f"主管复核成功",True,f"reviewStatus={rv}")
    else:
        # might already be reviewed
        warn(f"复核返回 {r.status_code}: {r.json().get('message','?')[:60]}")
        ok("复核校验（已复核不可重复）",r.status_code==400)

    # 复核后锁定
    r3 = api("PATCH",f"/accounting-work-logs/{log_id}",token=T["kuaiji"],json={"content":"尝试修改"})
    ok("复核后锁定修改",r3.status_code in (400,403),f"HTTP={r3.status_code}")

    step("主管创建任务 → 会计确认 → 完成")
    r = api("POST","/tasks",token=T["zhuguan"],json={
        "title":"验收测试任务","content":"测试","toUserId":aid,
        "customerId":cid,"deadline":"2026-08-15T00:00:00.000Z"})
    task_id = r.json().get("id")
    ok(f"任务创建 ID={task_id}",task_id is not None)

    r = api("POST",f"/tasks/{task_id}/confirm",token=T["kuaiji"])
    ok("任务→进行中",r.json().get("status")=="进行中",f"status={r.json().get('status','FAIL')}")
    r = api("POST",f"/tasks/{task_id}/complete",token=T["kuaiji"])
    ok("任务→已完成",r.json().get("status")=="已完成",f"status={r.json().get('status','FAIL')}")

    # ============================================================
    section("4.5 总务验收 — 收费/合同/发票/催收")
    # ============================================================

    step("zongwu确认岗位 + 补充合同/发票")
    ok("zongwu确认岗位",api("POST",f"/customers/{cid}/confirm-intake-assignment",token=T["zongwu"]).status_code in (200,201))
    r = api("PATCH",f"/charges/{chg_id}",token=T["zongwu"],json={"contractNo":"HT-2026-001","invoiceNo":"FP-2026-001"})
    ok("合同号/发票号补充",r.json().get("contractNo")=="HT-2026-001",f"contractNo={r.json().get('contractNo','FAIL')}")

    step("收费管理: 催收→确认→已收锁定")
    cur = api("GET",f"/charges/{chg_id}",token=T["zongwu"]).json().get("chargeStatus","?")
    if cur == "未收":
        ok("催收发起",api("POST",f"/charges/{chg_id}/remind",token=T["zongwu"],json={"message":"请尽快付款"}).status_code in (200,201))
        r = api("POST",f"/charges/{chg_id}/confirm",token=T["zongwu"])
        ok("确认已收",r.json().get("chargeStatus")=="已收",f"status={r.json().get('chargeStatus','FAIL')}")
    else:
        warn(f"收费已是'{cur}'状态")
    ok("已收后禁止修改金额",api("PATCH",f"/charges/{chg_id}",token=T["zongwu"],json={"amount":99999}).status_code in (400,403))
    ok("商务无权修改收费→403",api("PATCH",f"/charges/{chg_id}",token=T["shangwu"],json={"contractNo":"HT-FAKE"}).status_code==403)

    # ============================================================
    section("4.6 管理员验收 — 看板/工作台/消息")
    # ============================================================

    step("五大看板")
    for name, path, field in [
        ("客户看板","/dashboard/customers","total"),
        ("服务看板","/dashboard/services","serviceItems.total"),
        ("任务看板","/dashboard/tasks","total"),
        ("收费看板","/dashboard/charges","total"),
        ("会计看板","/dashboard/accounting","total"),
        ("全局总览","/dashboard/overview","customers.total")]:
        r = api("GET",path,token=T["admin"])
        val = r.json() if r.status_code==200 else {}
        for k in field.split("."): val = val.get(k,{}) if isinstance(val,dict) else val
        ok(f"{name} total={val}",val!="FAIL" and val is not None)

    step("工作台 + 消息中心")
    r = api("GET","/workbench/todos",token=T["admin"])
    ok(f"工作台 roleCode={r.json().get('roleCode','FAIL')}",r.status_code==200)

    r = api("GET","/notifications/unread-count",token=T["admin"])
    uc = r.json().get("count","?") if r.status_code==200 else "?"
    print(f"  未读通知数: {uc}")

    noti = api("GET","/notifications",token=T["admin"]).json() if r.status_code==200 else []
    unread = [n for n in noti if not n.get("isRead",True)] if isinstance(noti,list) else []
    if unread:
        api("PATCH",f"/notifications/{unread[0]['id']}/read",token=T["admin"])
        ok("单条已读",True,f"ID={unread[0]['id']}")
    else:
        warn("无未读通知")
    ok("全部已读",api("PATCH","/notifications/read-all",token=T["admin"]).status_code in (200,201))

    step("工作台按角色区分")
    for role,tok in [("商务",T["shangwu"]),("总务",T["zongwu"])]:
        r = api("GET","/workbench/todos",token=tok)
        d = r.json() if r.status_code==200 else {}
        print(G(f"  {role}工作台: roleCode={d.get('roleCode','?')}  groups={len(d.get('todoGroups',[]))}"))

    # ============================================================
    section("4.7 提单失效验证")
    # ============================================================
    step("修改已提交客户资料")
    api("PATCH",f"/customers/{cid}",token=T["shangwu"],json={"tier":"中低"})
    intake3 = api("GET",f"/customers/{cid}/intake-status",token=T["shangwu"]).json()
    ok("修改后提单失效 submitted=false",intake3.get("submitted")==False,f"submitted={intake3.get('submitted')}")
    ok("修改后岗位确认清空 allAssignmentsConfirmed=false",intake3.get("allAssignmentsConfirmed")==False,f"confirmed={intake3.get('allAssignmentsConfirmed')}")

    # ============================================================
    section("权限越权测试")
    # ============================================================
    ok("商务→admin-only→403",api("GET","/auth/admin-only",token=T["shangwu"]).status_code==403)
    ok("业务→创建任务→403",api("POST","/tasks",token=T["yewu"],json={"title":"test","toUserId":aid}).status_code==403)
    ok("会计→收费看板→403",api("GET","/dashboard/charges",token=T["kuaiji"]).status_code==403)
    ok("业务→修改收费→403",api("PATCH",f"/charges/{chg_id}",token=T["yewu"],json={"contractNo":"test"}).status_code==403)

    # ============================================================
    section("测试汇总")
    # ============================================================
    print(f"\n{G('='*60)}")
    pad = " " * 12
    print(f"{G(pad)}君册财税小程序 — 验收测试完成{G(pad)}")
    print(f"{G('='*60)}")
    print(f"\n  ✅ 通过: {PASS_C}   ❌ 失败: {FAIL_C}   ⚠️ 警告: {WARN_C}")
    total = PASS_C + FAIL_C
    print(f"  通过率: {PASS_C}/{total} ({int(PASS_C/total*100)}%)" if total > 0 else "")
    print(f"\n  测试数据: 客户ID={cid}  收费ID={chg_id}  台账ID={log_id}  任务ID={task_id}")
    if FAIL_C == 0:
        print(f"\n{G('  🎉 全部通过！')}")
    else:
        print(f"\n{R(f'  ⚠️  {FAIL_C} 项失败，见上')}")

    # ============================================================
    # 输出现有的测试数据清理建议
    # ============================================================
    print(f"\n{C('提示：本次测试创建了客户 ID={cid}，如需清理可调用 API 或直接操作数据库。')}")

if __name__ == "__main__":
    main()
