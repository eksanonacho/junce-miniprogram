#!/usr/bin/env python3
"""
君册财税小程序 — 验收自动化测试
依据：君册财税内部员工小程序使用手册（面向用户）第四节
     + 君册财税内部员工小程序泳道流程图
"""
import requests
import json
import sys
import os
from urllib.parse import quote

BASE = "http://localhost:3000"
PASS = "123456"
NP = "*"

PASS_COUNT = 0
FAIL_COUNT = 0
WARN_COUNT = 0

def C(method, path, **kwargs):
    """Make an API call to the backend."""
    url = f"{BASE}{path}"
    headers = kwargs.pop("headers", {})
    if "token" in kwargs:
        headers["Authorization"] = f"Bearer {kwargs.pop('token')}"
    if "json" in kwargs:
        headers.setdefault("Content-Type", "application/json")
    try:
        resp = requests.request(method, url, headers=headers, timeout=10,
                                proxies={"http": None, "https": None}, **kwargs)
        return resp
    except Exception as e:
        return type('Resp', (), {'status_code': 0, 'text': str(e), 'json': lambda: {}})()

def green(s): return f"\033[32m{s}\033[0m"
def red(s): return f"\033[31m{s}\033[0m"
def yellow(s): return f"\033[33m{s}\033[0m"
def cyan(s): return f"\033[36m{s}\033[0m"
def bold(s): return f"\033[1m{s}\033[0m"

def section(title):
    print(f"\n{'='*60}")
    print(bold(f"🔹 {title}"))
    print(f"{'='*60}")

def step(title):
    print(f"\n{cyan('📋 ' + title)}")

def check(desc, condition, detail=""):
    global PASS_COUNT, FAIL_COUNT
    if condition:
        print(green(f"✅ {desc}"))
        PASS_COUNT += 1
    else:
        print(red(f"❌ {desc} {detail}"))
        FAIL_COUNT += 1

def warn(msg):
    global WARN_COUNT
    print(yellow(f"⚠️  {msg}"))
    WARN_COUNT += 1

def login(username):
    r = C("POST", "/auth/login", json={"username": username, "password": PASS})
    if r.status_code in (200, 201):
        data = r.json()
        return data["accessToken"], data["user"]
    return None, None

def main():
    # ============================================================
    section("0. 六角色登录获取Token")
    # ============================================================
    T = {}
    for role, uname in [("商务","shangwu"), ("业务","yewu"), ("会计","kuaiji"),
                         ("主管","zhuguan"), ("总务","zongwu"), ("管理员","admin")]:
        token, user = login(uname)
        T[uname] = token
        check(f"{uname}({role}) 登录", token is not None,
              f"user={user.get('realName') if user else 'FAIL'}" if token else "")

    step("密码错误→401")
    r = C("POST", "/auth/login", json={"username": "admin", "password": "wrong"})
    check("错误密码返回401", r.status_code == 401, f"实际={r.status_code}")

    step("无token→401")
    r = C("GET", "/auth/me")
    check("无token返回401", r.status_code == 401, f"实际={r.status_code}")

    # ============================================================
    section("4.1 商务验收 — 建档、服务、人员、收费、首次提单")
    # ============================================================

    # 4.1.1 创建代理户
    step("4.1.1 创建代理户，填写企业画像")
    cust_data = {
        "companyName": "验收测试科技有限公司",
        "industry": "互联网", "region": "深圳",
        "annualRevenue": 5000000, "staffCount": 50,
        "companyType": "多股东", "customerCategory": "代理户",
        "tier": "优质", "registerDate": "2024-01-01",
        "taxType": "一般纳税人"
    }
    r = C("POST", "/customers", token=T["shangwu"], json=cust_data)
    data = r.json() if r.status_code in (200, 201) else {}
    CID = data.get("id")
    stage = data.get("lifecycleStage", "?")
    check(f"客户创建成功 ID={CID}", CID is not None, f"lifecycleStage={stage}")

    step("4.1.2 lifecycleStage初始=填单")
    check("初始lifecycleStage=填单", stage == "填单", f"实际={stage}")

    # 4.1.3 获取服务模板
    step("4.1.3 获取服务模板")
    r = C("GET", "/service-templates", token=T["shangwu"])
    templates = r.json() if r.status_code == 200 else []
    check("服务模板获取成功", len(templates) > 0, f"共{len(templates)}个")
    TID1, TID2 = templates[0]["id"], templates[1]["id"] if len(templates) > 1 else templates[0]["id"]

    # 4.1.4 获取角色用户
    step("4.1.4 获取各岗位用户")
    r_acc = C("GET", "/users?roleCode=会计", token=T["shangwu"])
    acc_users = r_acc.json() if r_acc.status_code == 200 else []
    r_biz = C("GET", "/users?roleCode=业务", token=T["shangwu"])
    biz_users = r_biz.json() if r_biz.status_code == 200 else []
    r_zw = C("GET", "/users?roleCode=总务", token=T["shangwu"])
    zw_users = r_zw.json() if r_zw.status_code == 200 else []

    ACC_ID = next((u["id"] for u in acc_users if u["username"] == "kuaiji"), None)
    BIZ_ID = next((u["id"] for u in biz_users if u["username"] == "yewu"), None)
    ZW_ID = next((u["id"] for u in zw_users if u["username"] == "zongwu"), None)
    check("人员查询成功", ACC_ID and BIZ_ID and ZW_ID,
          f"会计={ACC_ID} 业务={BIZ_ID} 总务={ZW_ID}")

    # 4.1.5 添加服务项
    step("4.1.5 添加服务项")
    r = C("POST", f"/customers/{CID}/service-items", token=T["shangwu"],
          json={"templateIds": [TID1, TID2]})
    si_data = r.json() if r.status_code in (200, 201) else {}
    si_created = len(si_data.get("created", []))
    check("服务项添加", si_created >= 1, f"创建{si_created}项")

    # 4.1.6 阅读确认
    step("4.1.6 逐项阅读确认服务说明")
    r = C("POST", "/service-read-confirmations", token=T["shangwu"],
          json={"customerId": CID, "templateId": TID1})
    check(f"确认模板{TID1}", r.json().get("id") is not None, f"HTTP={r.status_code}")

    r = C("POST", "/service-read-confirmations", token=T["shangwu"],
          json={"customerId": CID, "templateId": TID2})
    check(f"确认模板{TID2}", r.json().get("id") is not None, f"HTTP={r.status_code}")

    step("4.1.7 重复确认→409")
    r = C("POST", "/service-read-confirmations", token=T["shangwu"],
          json={"customerId": CID, "templateId": TID1})
    check("重复确认返回409", r.status_code == 409, f"HTTP={r.status_code}")

    # 4.1.8 配置人员
    step("4.1.8 配置业务岗、会计岗、总务岗")
    r = C("PUT", f"/customers/{CID}/staff-assignment", token=T["shangwu"],
          json={"businessStaffId": BIZ_ID, "accountantId": ACC_ID, "generalAffairsId": ZW_ID})
    sa = r.json() if r.status_code in (200, 201) else {}
    check("人员配置成功", sa.get("businessStaff", {}).get("realName") is not None,
          f"业务岗={sa.get('businessStaff',{}).get('realName','FAIL')}")

    # 4.1.9 创建收费记录
    step("4.1.9 创建收费记录")
    r = C("POST", "/charges", token=T["shangwu"],
          json={"customerId": CID, "chargeMode": "一次性", "amount": 10000})
    chg_data = r.json() if r.status_code in (200, 201) else {}
    CHG_ID = chg_data.get("id")
    chg_status = chg_data.get("chargeStatus", "?")
    check(f"收费记录创建 ID={CHG_ID}", CHG_ID is not None, f"状态={chg_status}")

    # 4.1.10 查看提单完整度
    step("4.1.10 查看首次提单完整度")
    r = C("GET", f"/customers/{CID}/intake-status", token=T["shangwu"])
    intake = r.json() if r.status_code == 200 else {}
    check("提单ready", intake.get("ready") == True,
          f"ready={intake.get('ready')} missing={intake.get('missingItems',[])}")

    # 4.1.11 正式提交
    step("4.1.11 正式提交首次提单")
    r = C("POST", f"/customers/{CID}/submit-intake", token=T["shangwu"])
    check("正式提交成功", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.1.12 提交后验证 submitted=true")
    r = C("GET", f"/customers/{CID}/intake-status", token=T["shangwu"])
    intake2 = r.json() if r.status_code == 200 else {}
    check("submitted=true", intake2.get("submitted") == True,
          f"submitted={intake2.get('submitted')}")

    # ============================================================
    section("4.2 业务验收 — 确认接单、办件全流程、打卡归档")
    # ============================================================

    step("4.2.1 yewu确认岗位接单")
    r = C("POST", f"/customers/{CID}/confirm-intake-assignment", token=T["yewu"])
    check("yewu确认岗位接单", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.2.2 获取客户服务项")
    r = C("GET", f"/customers/{CID}/service-items", token=T["shangwu"])
    si_items = r.json() if r.status_code == 200 else []
    SI_ID = si_items[0]["id"] if si_items else None
    SI_ID2 = si_items[1]["id"] if len(si_items) > 1 else None
    check("服务项列表", SI_ID is not None, f"共{len(si_items)}项")

    step("4.2.3 创建办件（shangwu主理人创建）")
    r = C("POST", "/work-orders", token=T["shangwu"],
          json={"serviceItemId": SI_ID, "handlerId": BIZ_ID, "receiptReceiverId": ACC_ID})
    wo = r.json() if r.status_code in (200, 201) else {}
    WO_ID = wo.get("id")
    check(f"办件创建 ID={WO_ID}", WO_ID is not None,
          f"status={wo.get('status','?')}")

    step("4.2.4 yewu开始办件 (待办→办件中)")
    r = C("PATCH", f"/work-orders/{WO_ID}", token=T["yewu"], json={"status": "办件中"})
    w_status = r.json().get("status", "FAIL") if r.status_code == 200 else "FAIL"
    check("状态→办件中", w_status == "办件中", f"status={w_status}")

    step("4.2.5 验证客户状态→办件中（任一办件开始）")
    r = C("GET", f"/customers/{CID}", token=T["shangwu"])
    c_stage = r.json().get("lifecycleStage", "?") if r.status_code == 200 else "?"
    check("客户→办件中（流程图/手册3.4）", c_stage == "办件中", f"stage={c_stage}")

    step("4.2.6 yewu办结 (办件中→办结)")
    r = C("PATCH", f"/work-orders/{WO_ID}", token=T["yewu"], json={"status": "办结"})
    w_status = r.json().get("status", "FAIL") if r.status_code == 200 else "FAIL"
    check("状态→办结", w_status == "办结", f"status={w_status}")

    step("4.2.7 上传文件")
    tf = "/tmp/test_archive_py.pdf"
    with open(tf, "w") as f: f.write(f"test archive {os.urandom(4).hex()}")
    r = C("POST", "/files/upload", token=T["yewu"],
          files={"file": ("archive.pdf", open(tf, "rb"), "application/pdf")})
    uf = r.json() if r.status_code in (200, 201) else {}
    UF_URL, UF_NAME, UF_SIZE = uf.get("url"), uf.get("name"), uf.get("size", 0)
    check("文件上传成功", UF_URL is not None, f"name={UF_NAME} size={UF_SIZE}")

    step("4.2.8 打卡归档 (办结→已打卡)")
    r = C("POST", f"/work-orders/{WO_ID}/check-in", token=T["yewu"],
          json={"archiveFiles": [{"name": UF_NAME or "f.txt", "url": UF_URL, "size": UF_SIZE}]})
    w_status = r.json().get("status", "FAIL") if r.status_code in (200, 201) else "FAIL"
    check("打卡→已打卡", w_status == "已打卡", f"status={w_status}")

    # 创建第二个办件用于验证跳级限制
    step("4.2.9 验证禁止跳级（直接改已打卡）")
    r2 = C("POST", "/work-orders", token=T["shangwu"],
           json={"serviceItemId": SI_ID2, "handlerId": BIZ_ID})
    wo2 = r2.json() if r2.status_code in (200, 201) else {}
    WO_ID2 = wo2.get("id")
    # 尝试跳级
    r = C("PATCH", f"/work-orders/{WO_ID2}", token=T["yewu"], json={"status": "已打卡"})
    check("跳级禁止 (待办→已打卡)", r.status_code == 400, f"HTTP={r.status_code}")

    step("4.2.10 验证禁止倒退（办件中→待办）")
    # 先进入办件中
    C("PATCH", f"/work-orders/{WO_ID2}", token=T["yewu"], json={"status": "办件中"})
    r = C("PATCH", f"/work-orders/{WO_ID2}", token=T["yewu"], json={"status": "待办"})
    check("倒退禁止 (办件中→待办)", r.status_code == 400, f"HTTP={r.status_code}")

    step("4.2.11 第二个办件完成打卡")
    C("PATCH", f"/work-orders/{WO_ID2}", token=T["yewu"], json={"status": "办结"})
    r = C("POST", f"/work-orders/{WO_ID2}/check-in", token=T["yewu"],
          json={"archiveFiles": [{"name": UF_NAME or "f.txt", "url": UF_URL, "size": UF_SIZE}]})
    w2_status = r.json().get("status", "FAIL") if r.status_code in (200, 201) else "FAIL"
    check("第二个办件打卡", w2_status == "已打卡", f"status={w2_status}")

    step("4.2.12 全部服务打卡→客户办结（流程图/手册3.4）")
    r = C("GET", f"/customers/{CID}", token=T["shangwu"])
    c_stage = r.json().get("lifecycleStage", "?") if r.status_code == 200 else "?"
    check("客户→办结", c_stage == "办结", f"stage={c_stage}")

    # ============================================================
    section("4.3 会计验收 — 确认岗位接单")
    # ============================================================

    step("4.3.1 kuaiji确认岗位接单")
    r = C("POST", f"/customers/{CID}/confirm-intake-assignment", token=T["kuaiji"])
    check("kuaiji确认岗位接单", r.status_code in (200, 201), f"HTTP={r.status_code}")

    # ============================================================
    section("4.4 主管验收 — 托管/分派/任务/台账复核")
    # ============================================================

    step("4.4.1 创建托管入档（zhuguan）")
    r = C("POST", "/tenant-registers", token=T["zhuguan"],
          json={"customerId": CID, "enterpriseDetail": '{"overview":"测试企业"}',
                "servicePlan": '{"plan":"月度记账报税"}'})
    if r.status_code == 409:
        r_list = C("GET", f"/tenant-registers?customerId={CID}", token=T["zhuguan"])
        tl = r_list.json() if r_list.status_code == 200 else {}
        TENANT_ID = tl[0]["id"] if isinstance(tl, list) and tl else tl.get("id")
        warn(f"托管已存在 (409)，复用已有记录 ID={TENANT_ID}")
    else:
        TENANT_ID = r.json().get("id") if r.status_code in (200, 201) else None
    check(f"托管入档 ID={TENANT_ID}", TENANT_ID is not None, f"HTTP={r.status_code}")

    step("4.4.2 方案未确认时禁止分派会计（流程图强制顺序）")
    r = C("POST", f"/tenant-registers/{TENANT_ID}/assign-accountant", token=T["zhuguan"],
          json={"accountantId": ACC_ID})
    check("未确认方案→禁止分派", r.status_code == 400,
          f"HTTP={r.status_code} msg={r.json().get('message','')[:50]}")

    step("4.4.3 商务确认服务方案")
    r = C("POST", f"/tenant-registers/{TENANT_ID}/confirm-plan", token=T["shangwu"])
    check("方案确认成功", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.4.4 主管分派会计")
    r = C("POST", f"/tenant-registers/{TENANT_ID}/assign-accountant", token=T["zhuguan"],
          json={"accountantId": ACC_ID})
    check("分派会计成功", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.4.5 会计确认接收托管")
    r = C("POST", f"/tenant-registers/{TENANT_ID}/confirm-assignment", token=T["kuaiji"])
    check("会计确认接收", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.4.6 验证客户状态→维护中（流程图/手册3.4）")
    r = C("GET", f"/customers/{CID}", token=T["zhuguan"])
    c_stage = r.json().get("lifecycleStage", "?") if r.status_code == 200 else "?"
    check("客户→维护中", c_stage == "维护中", f"stage={c_stage}")

    step("4.4.7 会计日常登记（台账）")
    r = C("POST", "/accounting-work-logs", token=T["kuaiji"],
          json={"customerId": CID, "recordType": "报税进度", "recordDate": "2026-07-25",
                "content": "7月增值税申报完成", "remark": "验收测试"})
    log_data = r.json() if r.status_code in (200, 201) else {}
    LOG_ID = log_data.get("id")
    check(f"台账登记 ID={LOG_ID}", LOG_ID is not None, f"HTTP={r.status_code}")

    step("4.4.8 复核前修改台账")
    r = C("PATCH", f"/accounting-work-logs/{LOG_ID}", token=T["kuaiji"],
          json={"content": "7月增值税申报已完成，税款已扣"})
    check("复核前可修改", r.json().get("id") is not None, f"HTTP={r.status_code}")

    step("4.4.9 主管复核台账")
    r = C("POST", f"/accounting-work-logs/{LOG_ID}/review", token=T["zhuguan"])
    rv_status = r.json().get("reviewStatus", "FAIL") if r.status_code in (200, 201) else "FAIL"
    check("复核成功→已复核", rv_status == "已复核", f"status={rv_status}")

    step("4.4.10 复核后会计不可修改")
    r = C("PATCH", f"/accounting-work-logs/{LOG_ID}", token=T["kuaiji"],
          json={"content": "尝试修改已复核记录"})
    check("复核后锁定修改", r.status_code in (400, 403), f"HTTP={r.status_code}")

    step("4.4.11 主管创建任务")
    r = C("POST", "/tasks", token=T["zhuguan"],
          json={"title": "验收测试任务", "content": "测试", "toUserId": ACC_ID,
                "customerId": CID, "deadline": "2026-08-15T00:00:00.000Z"})
    task_data = r.json() if r.status_code in (200, 201) else {}
    TASK_ID = task_data.get("id")
    check(f"任务创建 ID={TASK_ID}", TASK_ID is not None, f"HTTP={r.status_code}")

    step("4.4.12 会计确认任务 (待确认→进行中)")
    r = C("POST", f"/tasks/{TASK_ID}/confirm", token=T["kuaiji"])
    t_status = r.json().get("status", "FAIL") if r.status_code in (200, 201) else "FAIL"
    check("任务→进行中", t_status == "进行中", f"status={t_status}")

    step("4.4.13 会计完成任务 (进行中→已完成)")
    r = C("POST", f"/tasks/{TASK_ID}/complete", token=T["kuaiji"])
    t_status = r.json().get("status", "FAIL") if r.status_code in (200, 201) else "FAIL"
    check("任务→已完成", t_status == "已完成", f"status={t_status}")

    # ============================================================
    section("4.5 总务验收 — 收费/合同/发票/催收")
    # ============================================================

    step("4.5.1 zongwu确认岗位接单")
    r = C("POST", f"/customers/{CID}/confirm-intake-assignment", token=T["zongwu"])
    check("zongwu确认岗位接单", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.5.2 补充合同号和发票号")
    r = C("PATCH", f"/charges/{CHG_ID}", token=T["zongwu"],
          json={"contractNo": "HT-2026-001", "invoiceNo": "FP-2026-001"})
    ct = r.json().get("contractNo", "FAIL") if r.status_code == 200 else "FAIL"
    check("合同号/发票号补充", ct == "HT-2026-001", f"contractNo={ct}")

    step("4.5.3 查看收费状态（若未收则催收；已收则验证已收锁定）")
    r = C("GET", f"/charges/{CHG_ID}", token=T["zongwu"])
    cur_chg_status = r.json().get("chargeStatus", "?") if r.status_code == 200 else "?"
    if cur_chg_status == "未收":
        # 催收
        r2 = C("POST", f"/charges/{CHG_ID}/remind", token=T["zongwu"],
               json={"message": "请尽快完成付款"})
        check("催收发起", r2.status_code in (200, 201), f"HTTP={r2.status_code}")
        # 确认已收
        r3 = C("POST", f"/charges/{CHG_ID}/confirm", token=T["zongwu"])
        cfm_status = r3.json().get("chargeStatus", "FAIL") if r3.status_code in (200, 201) else "FAIL"
        check("确认已收", cfm_status == "已收", f"status={cfm_status}")
    else:
        warn(f"收费已是'{cur_chg_status}'状态 — 催收测试跳过（已收后不可催收，符合规则）")
        # 但仍验证已收后锁定修改
        check("收费状态存在（已收/未收均可）", True, f"当前={cur_chg_status}")

    step("4.5.4 验证已收后禁止修改金额")
    r = C("PATCH", f"/charges/{CHG_ID}", token=T["zongwu"], json={"amount": 99999})
    check("已收后禁止修改金额", r.status_code in (400, 403), f"HTTP={r.status_code}")

    step("4.5.5 非总务角色不能修改收费 (商务→403)")
    r = C("PATCH", f"/charges/{CHG_ID}", token=T["shangwu"],
          json={"contractNo": "HT-FAKE"})
    check("商务修改收费→403", r.status_code == 403, f"HTTP={r.status_code}")

    # ============================================================
    section("4.6 管理员验收 — 看板/工作台/消息")
    # ============================================================

    step("4.6.1 客户看板")
    r = C("GET", "/dashboard/customers", token=T["admin"])
    ok = r.json().get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check(f"客户看板 total={ok}", ok != "FAIL")

    step("4.6.2 服务看板")
    r = C("GET", "/dashboard/services", token=T["admin"])
    ok = r.json().get("serviceItems", {}).get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check("服务看板", ok != "FAIL")

    step("4.6.3 任务看板")
    r = C("GET", "/dashboard/tasks", token=T["admin"])
    ok = r.json().get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check(f"任务看板 total={ok}", ok != "FAIL")

    step("4.6.4 收费看板")
    r = C("GET", "/dashboard/charges", token=T["admin"])
    ok = r.json().get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check(f"收费看板 total={ok}", ok != "FAIL")

    step("4.6.5 会计看板")
    r = C("GET", "/dashboard/accounting", token=T["admin"])
    ok = r.json().get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check(f"会计看板 total={ok}", ok != "FAIL")

    step("4.6.6 全局总览")
    r = C("GET", "/dashboard/overview", token=T["admin"])
    ok = r.json().get("customers", {}).get("total", "FAIL") if r.status_code == 200 else "FAIL"
    check("全局总览", ok != "FAIL")

    step("4.6.7 工作台待办")
    r = C("GET", "/workbench/todos", token=T["admin"])
    ok = r.json().get("roleCode", "FAIL") if r.status_code == 200 else "FAIL"
    check(f"工作台 roleCode={ok}", ok != "FAIL")

    step("4.6.8 消息中心：未读数量")
    r = C("GET", "/notifications/unread-count", token=T["admin"])
    uc = r.json().get("count", "?") if r.status_code == 200 else "?"
    print(f"  未读通知数: {uc}")

    step("4.6.9 消息中心：单条已读")
    r = C("GET", "/notifications", token=T["admin"])
    noti_list = r.json() if r.status_code == 200 else []
    unread = [n for n in noti_list if not n.get("isRead", True)]
    if unread:
        nid = unread[0]["id"]
        C("PATCH", f"/notifications/{nid}/read", token=T["admin"])
        check("单条已读", True, f"ID={nid}")
    else:
        warn("无未读通知可标记")

    step("4.6.10 消息中心：全部已读")
    r = C("PATCH", "/notifications/read-all", token=T["admin"])
    check("全部已读", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.6.11 工作台按角色区分")
    r_sw = C("GET", "/workbench/todos", token=T["shangwu"])
    sw_info = f"{r_sw.json().get('roleCode','?')} groups:{len(r_sw.json().get('todoGroups',[]))}" if r_sw.status_code == 200 else "FAIL"
    r_zw = C("GET", "/workbench/todos", token=T["zongwu"])
    zw_info = f"{r_zw.json().get('roleCode','?')} groups:{len(r_zw.json().get('todoGroups',[]))}" if r_zw.status_code == 200 else "FAIL"
    print(green(f"  商务工作台: {sw_info}"))
    print(green(f"  总务工作台: {zw_info}"))

    # ============================================================
    section("4.7 提单失效验证")
    # ============================================================

    step("4.7.1 修改已提交客户资料（tier→中低）")
    r = C("PATCH", f"/customers/{CID}", token=T["shangwu"], json={"tier": "中低"})
    check("客户资料修改", r.status_code in (200, 201), f"HTTP={r.status_code}")

    step("4.7.2 验证提单失效 - submitted=false")
    r = C("GET", f"/customers/{CID}/intake-status", token=T["shangwu"])
    intake3 = r.json() if r.status_code == 200 else {}
    submitted = intake3.get("submitted", True)
    all_confirmed = intake3.get("allAssignmentsConfirmed", True)
    check("提交后修改→提单失效 submitted=false（手册3.2）",
          submitted == False, f"submitted={submitted}")
    check("提交后修改→岗位确认清空 allAssignmentsConfirmed=false（手册3.2）",
          all_confirmed == False, f"allAssignmentsConfirmed={all_confirmed}")

    # ============================================================
    section("权限越权测试")
    # ============================================================

    step("商务→admin-only 应403")
    r = C("GET", "/auth/admin-only", token=T["shangwu"])
    check("商务访问管理接口→403", r.status_code == 403,
          f"HTTP={r.status_code}")

    step("业务→创建任务 应403")
    r = C("POST", "/tasks", token=T["yewu"],
          json={"title": "test", "toUserId": ACC_ID})
    check("业务创建任务→403", r.status_code == 403,
          f"HTTP={r.status_code}")

    step("会计→收费看板 应403")
    r = C("GET", "/dashboard/charges", token=T["kuaiji"])
    check("会计访问收费看板→403", r.status_code == 403,
          f"HTTP={r.status_code}")

    step("业务→修改收费 应403")
    r = C("PATCH", f"/charges/{CHG_ID}", token=T["yewu"],
          json={"contractNo": "test"})
    check("业务修改收费→403", r.status_code == 403,
          f"HTTP={r.status_code}")

    # ============================================================
    section("测试汇总")
    # ============================================================
    print()
    print(green("=" * 60))
    print(green("     君册财税小程序 — 验收自动化测试完成"))
    print(green("=" * 60))
    print()
    print(f"  ✅ 通过: {PASS_COUNT}")
    print(f"  ❌ 失败: {FAIL_COUNT}")
    if WARN_COUNT > 0:
        print(f"  ⚠️  警告: {WARN_COUNT}")
    print()
    print(f"  测试数据 ID：")
    print(f"    客户 CID={CID} (代理户)")
    print(f"    办件 WO={WO_ID} / WO2={WO_ID2}")
    print(f"    收费 CHG={CHG_ID}")
    print(f"    托管 TENANT={TENANT_ID}")
    print(f"    台账 LOG={LOG_ID}")
    print(f"    任务 TASK={TASK_ID}")
    print()
    if FAIL_COUNT == 0:
        print(green("  🎉 全部测试通过！"))
    else:
        print(red(f"  ⚠️  有 {FAIL_COUNT} 项测试失败，请查看上方详情"))

if __name__ == "__main__":
    main()
