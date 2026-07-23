# ROADMAP.md — 项目开发路线图

> 君册财税内部管理小程序(第一期)完整施工路线图。
> 按推荐开发顺序排列。配合 PROJECT_CONTEXT.md 使用。
> 最后更新:2026-07-24。

---

## 总原则

1. **先后端核心链路,再前端页面。** 后端接口稳定了,前端才有得对接。
2. **先让数据流跑通(填单→办件→托管→任务),再做统计展示(看板)。**
3. **一次只做 1-2 个模块**,做完 curl 验证通过,再下一个。
4. 涉及客户未提供资料的模块,先搭框架、留 TODO,不自己编规则。

---

## ✅ 已完成

### 模块 0:后端地基
- 目标:登录 + 权限 + 数据库基础
- 数据库表:roles、users、customers
- 接口:/auth/login、/auth/me、/auth/admin-only
- 状态:curl 验证通过

### 模块 1:客户管理(后端接口)
- 目标:客户填单提单的增删改查
- 涉及表:customers
- 接口:POST/GET/PATCH /customers
- 状态:curl 验证通过
- 依赖:无(业务链路入口)

### 模块 2:服务模板 + 已读确认
- 目标:服务类型模板查询 + 已读确认记录
- 涉及表:service_templates、service_read_confirmations
- 接口:GET /service-templates、POST /service-read-confirmations 等
- 状态:curl 验证通过
- 依赖:模块 1 客户

### 模块 3:ServiceItem + StaffAssignment
- 目标:客户服务项批量添加 + 人员配置 upsert
- 涉及表:service_items、staff_assignments
- 接口:POST/GET /customers/:id/service-items、PUT/GET /customers/:id/staff-assignment
- 状态:curl 验证通过
- 依赖:模块 1 客户、模块 2 服务模板

### 模块 4:Users 查询接口
- 目标:前端人员配置下拉数据源
- 接口:GET /users?roleCode=X
- 状态:curl 验证通过

### 模块 6:Charge 费用管控(含@Roles实战)
- 目标:收费记录 + 总务审核 + 催收
- 涉及表:charges、collection_reminders
- 接口:POST/GET/PATCH /charges、POST confirm/remind
- 状态:curl 验证通过(首次启用 @Roles()——PATCH/confirm/remind 限总务+管理员)
- 依赖:模块 1 客户

### 模块 7:TenantRegister 托管入档(仅代理户)
- 目标:代理户托管入档→方案确认→会计分派与确认
- 涉及表:tenant_registers
- 接口:POST/GET/PATCH + confirm-plan + assign-accountant + confirm-assignment
- 状态:curl 验证通过(代理户校验、会计本人校验、@Roles多重角色)
- 依赖:模块 1 客户 + 模块 5 办件

### 模块 8:Task 任务框架
- 目标:主管发布任务→员工确认→完成，通用任务流转
- 涉及表:tasks
- 接口:POST/GET/PATCH + confirm + complete
- 状态:curl 验证通过(本人校验、管理员代确认、PATCH禁改状态)
- 依赖:角色系统(已完成)

### 模块 10:Dashboard 看板接口
- 目标:5 个统计接口，老板/管理员/主管查看业务数据
- 涉及表:无新表，基于已有 8 张表只读聚合
- 接口:GET /dashboard/overview/customers/services/tasks/charges
- 状态:curl 验证通过(@Roles 主管+管理员，金额返回 number)
- 依赖:前面所有业务模块

### 模块 11:Files 文件上传
- 目标:multer 本地存储 + 静态访问，供办件归档和裂变凭证使用
- 涉及表:无新表，文件存 server/uploads/
- 接口:POST /files/upload（单文件，10MB，扩展名白名单）
- 状态:curl 验证通过（PDF/PNG 上传、.exe→400、>10MB→413、静态访问 200、archiveFiles 兼容）

### 模块 5:WorkOrder 办件流转 / 办结打卡
- 目标:业务链路第二步。服务项 → 创建办件 → 办件中 → 办结 → 打卡归档
- 涉及表:work_orders
- 接口:POST/GET/PATCH /work-orders、POST /work-orders/:id/check-in
- 状态:curl 验证通过(含 409 优化)
- 依赖:模块 1 客户、模块 3 ServiceItem

---

## 🔄 正在进行

### 前端:全模块页面(同学负责)
- 目标:第一期全部前端页面,基于 docs/API_CONTRACT.md + docs/FRONTEND_HANDOFF.md 开发
- Phase 1-3 已完成联调 (21 接口, 11 页面)
- Phase 4 收费管控准备开始
- Phase 5-9 待启动
- 依赖:后端 60 个业务接口已全部就绪,后端封板

---

## ✅ 已完成（模块 9-12）

### 模块 9:Fission 业务裂变
- 目标:代理户裂变填单 + 确认 + 归档,简化版,不做群协同
- 涉及表:fission_leads
- 接口:7 个 (POST/GET/PATCH/confirm/archive/mark-invalid)
- 状态:✅ curl 验证通过
- 依赖:模块 1 客户

### 模块 10:Dashboard 看板
- 目标:5 个统计接口,0 新表,纯聚合查询
- 接口:GET /dashboard/overview/customers/services/tasks/charges
- 状态:✅ curl 验证通过 (@Roles 主管+管理员)
- 依赖:前面所有业务模块

### 模块 11:Files 文件上传
- 目标:multer 本地存储 + 静态访问
- 接口:POST /files/upload (单文件,10MB,扩展名白名单)
- 状态:✅ curl 验证通过

### 模块 12:ManualDashboard 手动看板
- 目标:经营/工资录入+汇总,@Roles 总务+管理员
- 涉及表:manual_business_reports, manual_salary_reports
- 接口:8 个 (POST/GET/PATCH/summary)
- 状态:✅ curl 验证通过

---

## 🔮 第二期功能(本次不做,另行签约)

- 佣金/工资自动反推计算
- 第三方成本自动归集
- 次月初各类确认函(绩效单/工资单/收费统计)
- 完整考核机制 + 制度阅读签字
- 跨部门权限自动同步
- 业务裂变群协同
- AI 财税合规初诊系统(等客户九维度规则到货后,作为独立大模块开发)

---

## 施工依赖关系总结

```
模块0 地基(✅) → 模块1 客户(✅)
    ├─→ 模块2 服务模板(✅) → 模块3 ServiceItem+Staff(✅)
    │                                    ├─→ 模块5 办件打卡(✅)
    │                                    └─→ 模块7 托管入档(✅)
    ├─→ 模块4 Users查询(✅)
    ├─→ 模块6 费用管控(✅)
    ├─→ 模块8 任务(✅) → 模块9 裂变(✅)
    ├─→ 模块10 看板(✅) → 模块11 文件(✅) → 模块12 手动看板(✅)
    └─→ Docker 部署基础设施(✅)
```

### 关键判断
- **后端封板**:18 模块全部完成，60 个业务接口 + 1 个基础设施接口，E2E 16/16 通过 + 空数据库迁移验证通过
- **Docker 本地演练通过**:node:22-alpine, build ✅ / up ✅ / seed ✅ / migrate ✅
- **最新 commit**:89d1162 (docker-compose 安全版)
- **下一步**:staging 云部署、前端全模块联调、客户资料补充
- **必须等客户资料**:任务具体内容(等会计任务)、分层判断标准(等分层标准)、细粒度权限表(等权限表)

### 前后端协作
- 后端已封板，不再新增业务模块。前端同学全权负责全部页面开发。
- 前端开发依据：docs/API_CONTRACT.md（接口契约）+ docs/FRONTEND_HANDOFF.md（交接手册）
- 后端主理人负责：staging 云部署、联调支持、客户资料催收
