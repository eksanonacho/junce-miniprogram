# DATABASE_GUIDE.md — 数据库设计说明文档

> **这个文件是给谁看的**:任何要碰数据库的开发者(或 AI)。
> **什么时候用**:理解现有表结构、新建表、改字段、排查数据问题前。
> **解决什么问题**:看懂数据库目前怎么设计、哪些表已完成、哪些后续要加、改库的规矩是什么。
> 最后更新:2026-06-09。技术栈:PostgreSQL 16 + Prisma。库名:junce_dev。

---

## 一、当前已实现表

目前数据库共 17 张表:15 张业务表(roles / users / customers / service_templates / service_read_confirmations / service_items / staff_assignments / work_orders / charges / collection_reminders)+ 1 张 Prisma 系统表(_prisma_migrations) + 1 张枚举表(PgEnum 自动维护)。

### 1.1 roles — 角色主数据表
- **用途**:存系统的 6 种岗位角色,是权限体系的基础。
- **主键**:id
- **关键字段**:
  - `code`:角色编码,**枚举类型 RoleCode**,加了 UNIQUE 唯一索引(同一角色不重复)
  - `name`:角色显示名(如"管理员/老板")
- **外键**:无(它是被引用方)
- **金额字段**:无
- **时间字段**:createdAt / updatedAt
- **说明**:角色用数据库原生枚举写死,从根上杜绝脏数据(不可能存进枚举外的值)。

### 1.2 users — 用户表
- **用途**:系统登录用户,每个员工一个账号。
- **主键**:id
- **关键字段**:
  - `username`:用户名,UNIQUE(不可重复)
  - `passwordHash`:密码的 bcrypt 哈希(**不存明文**)
  - `realName`:真实姓名
  - `phone`:电话(可空)
  - `roleId`:外键 → roles.id
- **外键**:`roleId` → roles(id)。每个用户必须绑定一个角色。
- **枚举字段**:通过 roleId 间接关联 RoleCode
- **金额字段**:无
- **时间字段**:createdAt / updatedAt

### 1.3 customers — 客户企业画像表
- **用途**:商务主理人填单录入的客户企业信息,业务链路的核心数据。
- **主键**:id
- **关键字段**:
  - `companyName`:企业名称(必填)
  - `industry` / `registerDate` / `taxType` / `region`:行业 / 注册时间 / 税务类型 / 区域
  - `annualRevenue`:年流水,**金额字段,@db.Decimal(12,2)**
  - `staffCount`:人员数(整数)
  - `companyType`:**枚举 CompanyType**(一人公司/多股东/个体户)
  - `customerCategory`:**枚举 CustomerCategory**(新用户/代理户)
  - `tier`:**枚举 CustomerTier**(VIP/优质/中低/零申报),分层自动判断逻辑待客户给标准(目前手动选)
  - `lifecycleStage`:**枚举 LifecycleStage**,默认值"填单",由系统控制流转
  - `ownerId`:外键 → users.id,客户主理人
- **外键**:`ownerId` → users(id)。每个客户必须有一个主理人。
- **金额字段**:annualRevenue,Decimal(12,2)
- **时间字段**:createdAt / updatedAt
- **重要规则**:ownerId 在新建时由后端从 JWT(当前登录人)自动写入,**不接受前端传**(防篡改)。

### 1.4 _prisma_migrations — Prisma 迁移记录表(系统表)
- **用途**:Prisma 自动维护的"施工记录表",记录哪些 migration 已执行。
- **说明**:**这是工具自动建的,不是业务表。不要手动改它、删它。** 看到它存在是正常的。

### 1.5 service_templates — 服务模板表
- **用途**:预置服务类型的模板信息（资料清单、办理流程、预计时效）。主理人填单选择服务类型后，前端弹窗展示对应模板。
- **主键**:id
- **关键字段**:
  - `serviceType`:服务类型名称（String，如"注册"、"食品证"、"代理记账"）
  - `requiredMaterials`:JSON 字段，数组格式（如 `["营业执照","法人身份证"]`）
  - `processSteps`:JSON 字段，数组格式（如 `["收集资料","提交申请","等待审核"]`）
  - `estimatedDuration`:String，预计时效（如 `"3-5个工作日"`）
  - `isActive`:Boolean，默认 true
- **外键**:无
- **金额字段**:无
- **时间字段**:createdAt / updatedAt
- **说明**:一期不做后台模板编辑界面，模板内容通过 seed 预置。真实资料/流程/时效等客户补充后更新。

### 1.6 service_read_confirmations — 已读确认表
- **用途**:记录相关人员对服务模板的"已阅读/确认"动作。
- **主键**:id
- **关键字段**:
  - `customerId`:外键 → customers.id
  - `templateId`:外键 → service_templates.id
  - `userId`:外键 → users.id（从 JWT 自动取）
  - `serviceItemId`:可空外键，二期关联到具体的 ServiceItem
  - `confirmedAt`:确认时间
- **外键**:customerId → customers, templateId → service_templates, userId → users
- **唯一约束**:`(customerId, templateId, userId)` —— 同一人+同一客户+同一模板只能确认一次
- **金额字段**:无
- **时间字段**:confirmedAt / createdAt
- **说明**:重复确认返回 409。serviceItemId 为二期预留，一期传 null。

### 1.7 service_items — 客户服务项表
- **用途**:记录客户选择了哪些服务，一条记录=一个客户的一个服务类型实例。
- **主键**:id
- **关键字段**:
  - `customerId`:外键 → customers.id
  - `serviceTemplateId`:外键 → service_templates.id
  - `status`:枚举 ItemStatus(待办/办件中/办结)，默认"待办"
- **外键**:customerId → customers, serviceTemplateId → service_templates
- **唯一约束**:`(customerId, serviceTemplateId)` —— 同一客户不能重复添加同一服务模板，重复会返回错误提示
- **金额字段**:无
- **时间字段**:createdAt / updatedAt
- **说明**:PATCH 接口本期只允许改 status。不做办结打卡/材料上传/交接触发。

### 1.8 staff_assignments — 人员配置表
- **用途**:每个客户一份人员配置，记录业务岗/会计岗/顾问岗/总务岗分别指派给谁。
- **主键**:id
- **关键字段**:
  - `customerId`:外键 → customers.id，UNIQUE(一个客户一份)
  - `businessStaffId`:外键 → users.id(可空，需业务/商务角色)
  - `accountantId`:外键 → users.id(可空，需会计角色)
  - `consultantId`:外键 → users.id(可空，TODO: 等客户确认顾问岗角色后补校验)
  - `generalAffairsId`:外键 → users.id(可空，需总务角色)
- **外键**:customerId → customers, 四个岗位分别 FK → users
- **金额字段**:无
- **时间字段**:createdAt / updatedAt
- **说明**:用 PUT upsert 操作。配置时会校验用户角色是否匹配岗位要求，不匹配返回 400。

### 1.9 work_orders — 办件工单表
- **用途**:记录客户服务项的办件流转——创建工单、办理、办结、打卡。
- **主键**:id
- **关键字段**:
  - `customerId`:外键 → customers.id
  - `serviceItemId`:外键 → service_items.id，UNIQUE(MVP 一个服务项一个办件)
  - `handlerId`:外键 → users.id，对接人
  - `status`:枚举 WorkOrderStatus(待办→办件中→办结→已打卡)
  - `receiptReceiverId`:外键 → users.id，回执接收人
  - `archiveFiles`:JSON 字段，归档材料列表
  - `completedAt`:DateTime，办结时间
  - `checkedInAt`:DateTime，打卡时间
- **外键**:customerId → customers，serviceItemId → service_items，handlerId → users，receiptReceiverId → users
- **枚举**:WorkOrderStatus(待办/办件中/办结/已打卡)
- **金额字段**:无
- **关键规则**:
  - PATCH 不允许直接改 status="已打卡"，必须通过 POST check-in
  - check-in 必须传 archiveFiles(至少1项)，空返回 400
  - status 改"办结"时自动写 completedAt

### 1.10 charges — 收费记录表
- **用途**:客户的收费标准、合同号、发票号、收费状态。
- **主键**:id
- **关键字段**:
  - `customerId`:外键 → customers.id，UNIQUE(MVP 一个客户一条)
  - `chargeMode`:枚举 ChargeMode(一次性/定金加尾款)
  - `amount`:金额，**@db.Decimal(12,2)**
  - `chargeStatus`:枚举 ChargeStatus(已收/未收)，默认未收
  - `contractNo`/`invoiceNo`:合同号/发票号
  - `confirmedBy`:外键 → users.id，总务确认人
  - `confirmedAt`:DateTime，确认时间
- **外键**:customerId → customers, confirmedBy → users
- **金额字段**:amount，Decimal(12,2)
- **权限硬约束**:PATCH/confirm/remind 限总务+管理员(@Roles)。PATCH 不允许改 chargeStatus。

### 1.11 collection_reminders — 催收记录表
- **用途**:记录总务/管理员向主理人发起的每次催收。
- **主键**:id
- **关键字段**:
  - `chargeId`:外键 → charges.id
  - `fromUserId`:外键 → users.id，催收发起人
  - `toUserId`:外键 → users.id，催收对象（不传默认客户主理人）
  - `message`:催收备注
- **外键**:chargeId → charges, fromUserId → users, toUserId → users
- **金额字段**:无
- **说明**:只在未收状态下可发起，已收后返回 400。

### 1.12 tenant_registers — 托管入档表(仅代理户)
- **用途**:代理户客户的企业详细概况、服务方案、主理人确认、会计分派与确认。
- **主键**:id
- **关键字段**:
  - `customerId`:UNIQUE，一个客户一条。**仅代理户可创建**
  - `enterpriseDetail`/`servicePlan`:JSON，内容等客户补充(TODO)
  - `planConfirmedByOwner`/`planConfirmedAt`:主理人确认
  - `assignedAccountantId`:被分派的会计(FK→users)。通过单独接口 `/assign-accountant` 设置
  - `assignConfirmed`/`assignConfirmedAt`:会计确认
- **外键**:customerId → customers, assignedAccountantId → users
- **金额字段**:无
- **权限**:
  - 创建/PATCH:会计/主管/管理员
  - 分派会计:主管/管理员
  - 会计确认:会计本人或管理员(非本人 403)

### 1.13 tasks — 任务表(主管→员工)
- **用途**:通用任务流转框架。主管发布任务、员工确认/完成。
- **主键**:id
- **关键字段**:
  - `title`/`content`:任务标题/内容(TODO: 任务1/2/3等客户给)
  - `fromUserId`:发布人(主管)
  - `toUserId`:执行人
  - `customerId`:可空 FK→customers，不传=通用任务
  - `deadline`:截止时间
  - `status`:枚举 TaskStatus(待确认→进行中→已完成)
  - `confirmedAt`/`confirmedById`:确认时间/操作人
  - `completedAt`/`completedById`:完成时间/操作人
- **外键**:fromUserId→users, toUserId→users, customerId→customers, confirmedById→users, completedById→users
- **金额字段**:无
- **权限**:创建/更新→主管+管理员。confirm/complete→toUserId 本人或管理员

### 1.15 manual_business_reports — 经营手动录入表
- **用途**：手动录入月度经营数据，后端自动计算利润。
- **主键**：id
- **关键字段**：
  - `month`:YYYY-MM 格式
  - `revenueAmount`/`costAmount`:**@db.Decimal(12,2)**，收入/成本
  - `profitAmount`:**@db.Decimal(12,2)**，利润，**后端自动计算=revenue-cost，前端不传**
  - `createdById`:录入人
- **外键**：createdById→users
- **金额字段**：revenueAmount/costAmount/profitAmount，Decimal(12,2)

### 1.16 manual_salary_reports — 工资手动录入表
- **用途**：手动录入员工月度工资，后端自动计算合计。
- **主键**：id
- **关键字段**：
  - `month`/`userId`:月份+员工，UNIQUE 约束
  - `baseSalary`/`commission`/`bonus`/`deduction`/`socialInsurance`:**@db.Decimal(12,2)**，未传默认0
  - `totalAmount`:**@db.Decimal(12,2)**，合计，**后端自动计算=base+comm+bonus-deduction-si，前端不传**
- **外键**：userId→users，createdById→users
- **唯一约束**：(month, userId) UNIQUE
- **金额字段**：全部6个字段，Decimal(12,2)

### Dashboard 看板模块(无新表)
Dashboard 模块不新增数据库表，仅基于已有表（customers/service_items/work_orders/tasks/charges/collection_reminders）做只读统计，查询方式：Prisma count()/groupBy()/aggregate({ _sum })。

### Files 文件上传模块(无新表)

Files 模块不新增数据库表。文件通过 multer 写入本地磁盘 `server/uploads/`，文件名使用 `timestamp+UUID+ext` 防重名和路径穿越。文件访问通过 `ServeStaticModule` 挂载 `/uploads` 路径。上传返回的元数据（name/url/size/mimeType/uploadedAt）可直接放入 WorkOrder.archiveFiles JSON 字段。

### 1.14 fission_leads — 业务裂变线索表
- **用途**：记录由现有客户/服务产生的裂变线索。第一期只做填单+确认+归档。
- **主键**：id
- **关键字段**：
  - `sourceCustomerId`：外键 → customers.id，**可空**（来源客户，可能来自外部渠道）
  - `initiatedById`：外键 → users.id，发起人（JWT 自动取）
  - `leadName`/`contactName`/`phone`/`description`：线索基本信息
  - `assigneeId`：外键 → users.id，业务指派人
  - `price`：**@db.Decimal(12,2)**。仅记录报价，不参与佣金/奖励/绩效/收费记录
  - `status`：枚举 FissionStatus（待确认→已确认→已归档/无效）
  - `confirmedById`/`confirmedAt`：确认操作人和时间
  - `archivedById`/`archivedAt`：归档操作人和时间
  - `archiveFiles`：JSON，格式兼容 Files upload 返回对象
- **外键**：sourceCustomerId→customers(可空)，initiatedById/assigneeId/confirmedById/archivedById→users
- **枚举**：FissionStatus(待确认/已确认/已归档/无效)
- **金额字段**：price，Decimal(12,2)
- **权限**：PATCH/confirm/archive/mark-invalid 限主管+管理员(@Roles)
- **状态流转**：PATCH 禁改 status，必须通过 confirm/archive/mark-invalid 接口

---

## 二、表关系

```
RoleCode(枚举)
     │
     ▼
  roles ──1:N──→ users ──1:N──→ customers
   角色          用户 │            客户
                     │              │
                     │    service_read_confirmations(已读确认)
                     │     ┌──────────────────┘
                     │     │
                     │     ├── customerId → customers
                     │     ├── userId     → users
                     │     └── templateId → service_templates(服务模板)
                     │
                     └── (1:N) → service_read_confirmations
```

文字说明:
- **一个角色(role)有多个用户(user)** — 比如"会计"角色下有会计1、会计2、会计3。
- **一个用户(user)可以创建多个客户(customer)** — 一个商务名下管多个客户。
- **客户的 ownerId 来自 JWT 当前登录人** — 谁登录建的客户,ownerId 就是谁,后端自动写入,前端不传,防止篡改归属。
- **已读确认关联客户、模板、用户** — 记录谁(users)对哪个客户(customers)的哪个服务模板(service_templates)点了确认。

---

## 三、金额规范(强制)

> **所有金额字段统一使用 `@db.Decimal(12,2)`。**
> - ❌ 禁止用 float / double(浮点会丢精度,算钱会出错)
> - ❌ 禁止用 Prisma 默认的 Decimal(65,30)(30 位小数对钱无意义、浪费,且会导致序列化异常)
> - ✅ Decimal(12,2) = 总共 12 位、小数点后 2 位,支持到亿级金额、精确到分,符合财务规范。

适用于所有涉及金额的字段:年流水、各类费用、成本、工资、利润等。新建任何带钱的字段,一律 Decimal(12,2)。已写入 CLAUDE.md。

后端返回金额时已做 Decimal → 普通数字的序列化处理(避免 Prisma Decimal 对象转 JSON 变成奇怪字符串)。

---

## 四、已存在枚举

| 枚举 | 用途 | 可选值 |
|---|---|---|
| RoleCode | 角色编码 | 商务、业务、会计、主管、总务、管理员 |
| CompanyType | 公司类型 | 一人公司、多股东、个体户 |
| CustomerCategory | 客户分类 | 新用户、代理户 |
| CustomerTier | 客户分层 | VIP、优质、中低、零申报 |
| LifecycleStage | 客户生命周期 | 填单、办件中、办结、维护中、出库 |

> 枚举值是数据库原生 Enum,前端/接口传值必须用这些中文原值,传错会报错。

---

## 五、后续计划表(根据 PRD 规划,尚未创建)

> 以下表在开发到对应模块时再用 Prisma migration 创建,不要一次性全建。

### ServiceItem — 服务项
- **用途**:客户选的具体服务(注册/地址/食品证/代理记账等),一个客户多条。
- **预计字段**:id、customerId、serviceType、userType(新用户/代理户)、status(待办/办件中/办结)、createdAt
- **关系**:外键 customerId → customers
- **依赖客户补资料**:否(服务项清单 PRD 已给)

### Charge — 收费
- **用途**:客户的费用记录,总务审核用。
- **预计字段**:id、customerId、chargeCategory(托管费/一次性/第三方支出/人工成本)、amount(Decimal(12,2))、chargeStatus(已收/未收)、contractNo、invoiceNo、reviewedBy、reviewStatus、createdAt
- **关系**:外键 customerId → customers;reviewedBy → users(总务)
- **依赖客户补资料**:部分(费用具体字段待细化)
- **权限硬约束**:涉及资金/合同/发票,操作权限限总务 + 管理员

### StaffAssignment — 人员配置
- **用途**:一个客户配置的各岗位人员。
- **预计字段**:id、customerId、businessStaffId、accountantId、consultantId、generalAffairsId
- **关系**:外键 customerId → customers;各岗位 id → users
- **依赖客户补资料**:否

### WorkOrder — 办件
- **用途**:办件流转 + 办结打卡 + 材料归档。
- **预计字段**:id、customerId、serviceItemId、handlerId(对接人)、status(提交/办结)、receiptReceiverId(回执接收人)、archiveFiles(归档材料)、completedAt
- **关系**:外键 customerId → customers;serviceItemId → ServiceItem;handlerId → users
- **依赖客户补资料**:部分(办结上传材料类型待细化)

### Task — 任务
- **用途**:主管发布、会计确认的任务。
- **预计字段**:id、title、content、fromUserId(主管)、toUserId(会计)、relatedCustomerId、deadline、status(待确认/进行中/已完成)、starRating(1-5)、resultFeedback、createdAt、completedAt
- **关系**:外键 fromUserId/toUserId → users;relatedCustomerId → customers
- **依赖客户补资料**:是(第四步具体任务内容客户正在编写)

### TenantRegister — 托管入档(仅代理户)
- **用途**:财务岗代理户托管入档登记。
- **预计字段**:id、customerId、enterpriseDetail、servicePlan、planConfirmedByOwner、assignedAccountantId、assignConfirmed
- **关系**:外键 customerId → customers;assignedAccountantId → users
- **依赖客户补资料**:否(流程 PRD 已给)

### Fission — 业务裂变(简化版)
- **用途**:代理户业务裂变填单 + 确认 + 归档(不做群协同)。
- **预计字段**:id、customerId、initiatedBy、price(Decimal(12,2))、assigneeId、confirmed、archiveFiles、createdAt
- **关系**:外键 customerId → customers;initiatedBy/assigneeId → users
- **依赖客户补资料**:否

### ManualBusinessMetric — 经营看板手动录入
- **用途**:经营看板的手动录入数据(收入、各项成本),系统只做汇总,不自动反推。
- **预计字段**:id、period(年月)、totalRevenue、各项成本(均 Decimal(12,2))、createdBy、createdAt
- **关系**:createdBy → users
- **依赖客户补资料**:部分(具体录入项可与客户确认)

### ManualSalaryMetric — 工资看板手动录入
- **用途**:工资看板的手动录入数据(各员工薪资项),系统只做汇总。
- **预计字段**:id、period(年月)、userId(或员工名)、baseSalary、commission、bonus(均 Decimal(12,2))、createdBy、createdAt
- **关系**:userId → users;createdBy → users
- **依赖客户补资料**:部分

> 注:经营/工资看板一期只做"手动录入 + 自动汇总(加减乘除、可视化)",不做自动反推佣金/成本(放二期)。

---

## 六、禁止事项(改库红线)

- ❌ **不要随便改已有枚举值**(改了会导致已存数据失效、代码处处出错)。需增减枚举值,走 Prisma migration 并评估影响。
- ❌ **不要随便删 migration 文件**(它们是数据库结构的版本记录,删了会导致迁移历史断裂)。
- ❌ **不要直接手写 SQL 改数据库结构**(绕过 Prisma 会导致 schema 和实际库不一致)。改结构一律走 Prisma migration:改 schema.prisma → `pnpm prisma migrate dev` 生成迁移。
- ❌ **不要改金额字段精度**(统一 Decimal(12,2),已在 CLAUDE.md 固定)。
- ⚠️ 改表结构前,开发期可重置测试库;**若已上线,改表前必须先备份数据库**。

---

## 七、常用命令速查

```bash
# 查所有表
psql -d junce_dev -c "\dt"
# 查单表结构
psql -d junce_dev -c "\d customers"
# 查所有枚举类型
psql -d junce_dev -c "\dT"
# 改完 schema.prisma 后生成并应用迁移
pnpm prisma migrate dev
# 重新生成 Prisma Client(注意:schema 里已固定 moduleFormat="cjs")
pnpm prisma generate
```
