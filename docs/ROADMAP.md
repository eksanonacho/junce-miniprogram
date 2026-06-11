# ROADMAP.md — 项目开发路线图

> 君册财税内部管理小程序(第一期)完整施工路线图。
> 按推荐开发顺序排列。配合 PROJECT_CONTEXT.md 使用。
> 最后更新:2026-06-09。

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

### 前端:客户模块页面(同学负责)
- 目标:客户填单页 + 列表页 + 详情页
- 涉及页面:pages/customer/(form / list / detail)
- 涉及接口:已就绪的 customers / service-templates / users 等接口
- 依赖:后端地基已完成
- 状态:进行中,前后端联调

---

## ⏭ 后续阶段(依赖前序模块)

### 模块 9:业务裂变(简化版)
- 目标:代理户裂变,分派会计/主管向主理人填单(含价格、指派人)→ 确认 → 归档。**不做群协同。**
- 涉及页面:pages/fission/
- 涉及接口:裂变填单、确认、归档
- 涉及表:**新建** Fission
- 依赖:模块 1 客户 + 模块 8 任务体系

---

## ⏭ 最后阶段:看板(需前序模块的数据)

### 模块 10:看板系统
- 目标:5 个看板
  - 服务看板、老板看板、客户看板:**自动统计**前面模块产生的业务数据
  - 经营看板、工资看板:**手动录入 + 自动汇总**(加减乘除、汇总、可视化),不做自动反推
- 涉及页面:pages/dashboard/(5 个看板 + 2 个录入页)
- 涉及接口:统计查询接口、经营/工资数据录入接口
- 涉及表:经营/工资录入数据表
- 依赖:**前面所有业务模块**(有了数据才统计得出来)。这是为什么看板放最后。

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
    │                                    └─→ 模块7 托管入档(需办件)
    ├─→ 模块4 Users查询(✅)
    ├─→ 模块6 费用管控(⬜,可独立)
    ├─→ 模块8 任务(⏳等资料) → 模块9 裂变(需任务)
    └─→ 模块10 看板(需前面所有)
```

### 关键判断
- **已完成**:模块 0-12(地基→客户→模板→服务项/人员→Users→办件→费用→托管→任务→看板→文件→裂变→手动看板)，55 接口，回归 63/63 全部通过
- **后端封板**:回归测试通过（详见 docs/REGRESSION_TEST_REPORT_2026-06-11.md）
- **下一步**:前端 Phase 4-8 联调、部署准备(Docker Compose)、客户资料补充
- **必须等客户资料**:模块 8 任务内容(等会计任务)、分层判断(等分层标准)、细粒度权限(等权限表)
- **必须等前序模块**:模块 7 等模块 5;模块 9 等模块 8;模块 10 等几乎所有模块。

### 前后端协作建议
- 后端(主理人)按上述顺序逐模块做接口 → 每个模块出"接口说明" → 交给前端同学做对应页面。
- 同学负责相对独立、不碰核心的前端页面(客户页、裂变页、看板展示页、经营/工资录入页)。
- 核心(权限、客户主流程、费用审核)由主理人掌握。
