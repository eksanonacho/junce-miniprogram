import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

type LoginResult = {
  accessToken: string;
  user: { id: number; roleCode: string };
};

describe('P0 permissions (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  const auth: Record<string, LoginResult> = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer();

    for (const username of ['shangwu', 'yewu', 'kuaiji', 'zhuguan', 'zongwu', 'admin']) {
      const res = await request(httpServer)
        .post('/auth/login')
        .send({ username, password: '123456' })
        .expect(201);
      auth[username] = res.body;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (username: string) => `Bearer ${auth[username].accessToken}`;

  const suffix = Date.now();

  // ---- shared seed ----
  let ownedCustomerId: number;
  let otherCustomerId: number;
  let serviceItemId: number;
  let workOrderId: number;
  let chargeId: number;
  let taskId: number;
  let tenantId: number;
  let unrelatedWorkOrderId: number;

  // ====================================================================
  it('1. auth & seed — 建客户 + 服务项 + 办件 + 收费 + 任务 + 托管', async () => {
    // 服务模板
    const templateRes = await request(httpServer)
      .get('/service-templates')
      .set('Authorization', bearer('admin'))
      .expect(200);
    const templateId = templateRes.body[0].id;

    // 商务建自有客户
    const c1 = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('shangwu'))
      .send({
        companyName: `P0商务自有客户-${suffix}`,
        customerCategory: '代理户',
        tier: '优质',
      })
      .expect(201);
    ownedCustomerId = c1.body.id;

    // 管理员建非商务客户（用于 "商务访问其他商务客户" 703 模拟）
    const c2 = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('admin'))
      .send({
        companyName: `P0管理员客户-${suffix}`,
        customerCategory: '新用户',
      })
      .expect(201);
    otherCustomerId = c2.body.id;

    // 人员配置（商务本人）
    await request(httpServer)
      .put(`/customers/${ownedCustomerId}/staff-assignment`)
      .set('Authorization', bearer('shangwu'))
      .send({
        businessStaffId: auth.yewu.user.id,
        accountantId: auth.kuaiji.user.id,
        generalAffairsId: auth.zongwu.user.id,
      })
      .expect(200);

    // 服务确认 + 添加服务项
    await request(httpServer)
      .post('/service-read-confirmations')
      .set('Authorization', bearer('shangwu'))
      .send({ customerId: ownedCustomerId, templateId })
      .expect(201);

    const si = await request(httpServer)
      .post(`/customers/${ownedCustomerId}/service-items`)
      .set('Authorization', bearer('shangwu'))
      .send({ templateIds: [templateId] })
      .expect(201);
    serviceItemId = si.body.created[0].id;

    // 办件
    const wo = await request(httpServer)
      .post('/work-orders')
      .set('Authorization', bearer('shangwu'))
      .send({
        serviceItemId,
        handlerId: auth.yewu.user.id,
        receiptReceiverId: auth.shangwu.user.id,
      })
      .expect(201);
    workOrderId = wo.body.id;

    // 收费
    const ch = await request(httpServer)
      .post('/charges')
      .set('Authorization', bearer('shangwu'))
      .send({
        customerId: ownedCustomerId,
        chargeMode: '一次性',
        amount: 1200,
        contractNo: `P0-${suffix}`,
      })
      .expect(201);
    chargeId = ch.body.id;

    // 任务（主管 → 会计）
    const t = await request(httpServer)
      .post('/tasks')
      .set('Authorization', bearer('zhuguan'))
      .send({
        title: `P0会计任务-${suffix}`,
        toUserId: auth.kuaiji.user.id,
        customerId: ownedCustomerId,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    taskId = t.body.id;

    // 在管理员客户（无 staff 分配）上建服务项+办件，用于无关角色越权测试
    const adminSi = await request(httpServer)
      .post(`/customers/${otherCustomerId}/service-items`)
      .set('Authorization', bearer('admin'))
      .send({ templateIds: [templateId] })
      .expect(201);
    const adminServiceItemId = adminSi.body.created[0].id;

    const adminWo = await request(httpServer)
      .post('/work-orders')
      .set('Authorization', bearer('admin'))
      .send({
        serviceItemId: adminServiceItemId,
        handlerId: auth.admin.user.id,
        receiptReceiverId: auth.admin.user.id,
      })
      .expect(201);
    unrelatedWorkOrderId = adminWo.body.id;
  });

  // ====================================================================
  it('2. customer ownership — 正向读己 + 403 越权读/改', async () => {
    // 正向：商务读自己客户
    await request(httpServer)
      .get(`/customers/${ownedCustomerId}`)
      .set('Authorization', bearer('shangwu'))
      .expect(200);

    // shangwu 请求 admin 创建的客户 → 403（模拟商务访问其他商务客户）
    await request(httpServer)
      .get(`/customers/${otherCustomerId}`)
      .set('Authorization', bearer('shangwu'))
      .expect(403);

    // yewu 读非自己关联客户
    await request(httpServer)
      .get(`/customers/${otherCustomerId}`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // yewu 改非自己关联客户
    await request(httpServer)
      .patch(`/customers/${otherCustomerId}`)
      .set('Authorization', bearer('yewu'))
      .send({ industry: '越权行业' })
      .expect(403);

    // kuaiji 读非自己关联客户
    await request(httpServer)
      .get(`/customers/${otherCustomerId}`)
      .set('Authorization', bearer('kuaiji'))
      .expect(403);

    // kuaiji 改非自己关联客户
    await request(httpServer)
      .patch(`/customers/${otherCustomerId}`)
      .set('Authorization', bearer('kuaiji'))
      .send({ industry: '越权行业' })
      .expect(403);
  });

  // ====================================================================
  it('3. staff-assignment — 商务可配 | 业务越权 403', async () => {
    await request(httpServer)
      .put(`/customers/${ownedCustomerId}/staff-assignment`)
      .set('Authorization', bearer('yewu'))
      .send({
        businessStaffId: auth.yewu.user.id,
        accountantId: auth.kuaiji.user.id,
        generalAffairsId: auth.zongwu.user.id,
      })
      .expect(403);
  });

  // ====================================================================
  it('4. work-order — 业务正向处理 | 无关角色越权操作/详情 403', async () => {
    // 无关角色（yewu，无 staff-assignment 在 unrelatedWorkOrderId 所属客户上）越权更新
    await request(httpServer)
      .patch(`/work-orders/${unrelatedWorkOrderId}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办件中' })
      .expect(403);

    // 无关角色越权打卡
    await request(httpServer)
      .post(`/work-orders/${unrelatedWorkOrderId}/check-in`)
      .set('Authorization', bearer('yewu'))
      .send({ archiveFiles: [{ name: '归档.pdf', url: '/uploads/archive.pdf' }] })
      .expect(403);

    // 无关角色越权查看办件详情（P0 补充）
    await request(httpServer)
      .get(`/work-orders/${unrelatedWorkOrderId}`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 业务正向：更新自己负责的办件
    await request(httpServer)
      .patch(`/work-orders/${workOrderId}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办件中' })
      .expect(200);

    await request(httpServer)
      .patch(`/work-orders/${workOrderId}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办结' })
      .expect(200);

    // 业务正向：打卡归档
    await request(httpServer)
      .post(`/work-orders/${workOrderId}/check-in`)
      .set('Authorization', bearer('yewu'))
      .send({ archiveFiles: [{ name: '归档.pdf', url: '/uploads/archive.pdf' }] })
      .expect(201);
  });

  // ====================================================================
  it('5. charge — 商务正向创建 | 会计越权创建 | 业务越权确认 | 业务越权详情', async () => {
    // 会计越权创建收费
    await request(httpServer)
      .post('/charges')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: ownedCustomerId,
        chargeMode: '一次性',
        amount: 1200,
      })
      .expect(403);

    // 业务越权确认收费
    await request(httpServer)
      .post(`/charges/${chargeId}/confirm`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 业务越权查看收费详情（P0 补充）
    await request(httpServer)
      .get(`/charges/${chargeId}`)
      .set('Authorization', bearer('yewu'))
      .expect(403);
    await request(httpServer)
      .get(`/charges/${chargeId}/reminders`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 总务正向确认收费
    await request(httpServer)
      .post(`/charges/${chargeId}/confirm`)
      .set('Authorization', bearer('zongwu'))
      .expect(201);

    await request(httpServer)
      .patch(`/charges/${chargeId}`)
      .set('Authorization', bearer('zongwu'))
      .send({ amount: 1300 })
      .expect(400);
  });

  // ====================================================================
  it('6. task — 总务越权创建 | kuaiji 正向读任务 | 非指派人越权读详情 | confirm/complete smoke', async () => {
    // 总务越权创建任务
    await request(httpServer)
      .post('/tasks')
      .set('Authorization', bearer('zongwu'))
      .send({
        title: `P0越权任务-${suffix}`,
        toUserId: auth.kuaiji.user.id,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(403);

    // kuaiji 正向读自己的任务
    await request(httpServer)
      .get(`/tasks/${taskId}`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);

    // 非指派人 yewu 越权读任务详情（P0 补充）
    await request(httpServer)
      .get(`/tasks/${taskId}`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 非指派人 yewu 越权确认任务（P0 补充）
    await request(httpServer)
      .post(`/tasks/${taskId}/confirm`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // kuaiji 正向：确认任务（NestJS POST 默认 201）
    await request(httpServer)
      .post(`/tasks/${taskId}/confirm`)
      .set('Authorization', bearer('kuaiji'))
      .expect(201);

    // 非指派人 yewu 越权完成任务（P0 补充；task 已确认，无业务校验干扰）
    await request(httpServer)
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // kuaiji 正向：完成任务（NestJS POST 默认 201）
    await request(httpServer)
      .post(`/tasks/${taskId}/complete`)
      .set('Authorization', bearer('kuaiji'))
      .expect(201);
  });

  // ====================================================================
  it('7. tenant — 非 owner 确认方案 403 | 业务越权读详情/更新 403', async () => {
    const tenant = await request(httpServer)
      .post('/tenant-registers')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: ownedCustomerId,
        enterpriseDetail: { name: 'P0企业概况' },
        servicePlan: { plan: 'P0服务方案' },
      })
      .expect(201);
    tenantId = tenant.body.id;

    // 方案未确认前禁止分派会计。
    await request(httpServer)
      .post(`/tenant-registers/${tenantId}/assign-accountant`)
      .set('Authorization', bearer('zhuguan'))
      .send({ accountantId: auth.kuaiji.user.id })
      .expect(400);

    // 非 owner 确认托管方案
    await request(httpServer)
      .post(`/tenant-registers/${tenantId}/confirm-plan`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 业务越权读托管详情（P0 补充）
    await request(httpServer)
      .get(`/tenant-registers/${tenantId}`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 业务越权更新托管（P0 补充）
    await request(httpServer)
      .patch(`/tenant-registers/${tenantId}`)
      .set('Authorization', bearer('yewu'))
      .send({ enterpriseDetail: { name: '越权修改' } })
      .expect(403);

    // shangwu 正向：确认自己客户的托管方案
    await request(httpServer)
      .post(`/tenant-registers/${tenantId}/confirm-plan`)
      .set('Authorization', bearer('shangwu'))
      .expect(201);

    // 主理人确认后锁定方案。
    await request(httpServer)
      .patch(`/tenant-registers/${tenantId}`)
      .set('Authorization', bearer('admin'))
      .send({ servicePlan: { plan: '确认后篡改' } })
      .expect(400);

    await request(httpServer)
      .post(`/tenant-registers/${tenantId}/assign-accountant`)
      .set('Authorization', bearer('zhuguan'))
      .send({ accountantId: auth.kuaiji.user.id })
      .expect(201);

    await request(httpServer)
      .post(`/tenant-registers/${tenantId}/confirm-assignment`)
      .set('Authorization', bearer('kuaiji'))
      .expect(201);
  });

  // ====================================================================
  it('8. dashboard + fission — 普通角色读看板 403 | 裂变确认+归档', async () => {
    // 普通角色越权读看板
    await request(httpServer)
      .get('/dashboard/overview')
      .set('Authorization', bearer('yewu'))
      .expect(403);

    // 管理员正向读看板
    await request(httpServer)
      .get('/dashboard/overview')
      .set('Authorization', bearer('admin'))
      .expect(200);
    await request(httpServer)
      .get('/dashboard/accounting')
      .set('Authorization', bearer('admin'))
      .expect(200);

    // 裂变正向流程（kuaiji 创建 → zhuguan 确认 → zhuguan 归档）
    const fission = await request(httpServer)
      .post('/fission-leads')
      .set('Authorization', bearer('kuaiji'))
      .send({
        sourceCustomerId: ownedCustomerId,
        leadName: `P0裂变线索-${suffix}`,
        contactName: '线索联系人',
        phone: '13800000000',
        assigneeId: auth.yewu.user.id,
        price: 900,
      })
      .expect(201);

    await request(httpServer)
      .post(`/fission-leads/${fission.body.id}/confirm`)
      .set('Authorization', bearer('zhuguan'))
      .expect(201);

    await request(httpServer)
      .post(`/fission-leads/${fission.body.id}/archive`)
      .set('Authorization', bearer('zhuguan'))
      .send({ archiveFiles: [{ name: '裂变归档.pdf', url: '/uploads/fission.pdf' }] })
      .expect(201);
  });

  // ====================================================================
  it('9. accounting work-order — 服务角色校验 | 会计对接人办理 | 回执人只读', async () => {
    const templates = await request(httpServer)
      .get('/service-templates')
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    const accountingTemplate = templates.body.find(
      (template: any) =>
        !Array.isArray(template.requiredMaterials) &&
        template.requiredMaterials?.responsibleRole === '会计',
    );
    expect(accountingTemplate).toBeDefined();

    const customer = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('shangwu'))
      .send({
        companyName: `P0会计办件客户-${suffix}`,
        customerCategory: '代理户',
      })
      .expect(201);

    await request(httpServer)
      .put(`/customers/${customer.body.id}/staff-assignment`)
      .set('Authorization', bearer('shangwu'))
      .send({
        businessStaffId: auth.yewu.user.id,
        accountantId: auth.kuaiji.user.id,
        generalAffairsId: auth.zongwu.user.id,
      })
      .expect(200);

    const serviceItems = await request(httpServer)
      .post(`/customers/${customer.body.id}/service-items`)
      .set('Authorization', bearer('shangwu'))
      .send({ templateIds: [accountingTemplate.id] })
      .expect(201);
    const accountingServiceItemId = serviceItems.body.created[0].id;

    // 会计服务不能误派给业务角色。
    await request(httpServer)
      .post('/work-orders')
      .set('Authorization', bearer('shangwu'))
      .send({
        serviceItemId: accountingServiceItemId,
        handlerId: auth.yewu.user.id,
        receiptReceiverId: auth.kuaiji.user.id,
      })
      .expect(400);

    const workOrder = await request(httpServer)
      .post('/work-orders')
      .set('Authorization', bearer('shangwu'))
      .send({
        serviceItemId: accountingServiceItemId,
        handlerId: auth.kuaiji.user.id,
        receiptReceiverId: auth.yewu.user.id,
      })
      .expect(201);

    // 回执接收人只负责接收，不能代替对接人办理。
    await request(httpServer)
      .patch(`/work-orders/${workOrder.body.id}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办件中' })
      .expect(403);

    await request(httpServer)
      .patch(`/work-orders/${workOrder.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .send({ status: '办件中' })
      .expect(200);

    const serviceItemsAfterStart = await request(httpServer)
      .get(`/customers/${customer.body.id}/service-items`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(serviceItemsAfterStart.body[0].status).toBe('办件中');

    const customerAfterStart = await request(httpServer)
      .get(`/customers/${customer.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(customerAfterStart.body.lifecycleStage).toBe('办件中');

    await request(httpServer)
      .patch(`/work-orders/${workOrder.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .send({ status: '办结' })
      .expect(200);

    await request(httpServer)
      .post(`/work-orders/${workOrder.body.id}/check-in`)
      .set('Authorization', bearer('kuaiji'))
      .send({
        archiveFiles: [
          { name: '会计办件归档.pdf', url: '/uploads/accounting-work-order.pdf' },
        ],
      })
      .expect(201);

    const serviceItemsAfterCheckIn = await request(httpServer)
      .get(`/customers/${customer.body.id}/service-items`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(serviceItemsAfterCheckIn.body[0].status).toBe('办结');

    const customerAfterCheckIn = await request(httpServer)
      .get(`/customers/${customer.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(customerAfterCheckIn.body.lifecycleStage).toBe('办结');

    const tenant = await request(httpServer)
      .post('/tenant-registers')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: customer.body.id,
        enterpriseDetail: { name: '状态联动企业概况' },
        servicePlan: { plan: '状态联动服务方案' },
      })
      .expect(201);

    await request(httpServer)
      .post(`/tenant-registers/${tenant.body.id}/confirm-plan`)
      .set('Authorization', bearer('shangwu'))
      .expect(201);

    await request(httpServer)
      .post(`/tenant-registers/${tenant.body.id}/assign-accountant`)
      .set('Authorization', bearer('zhuguan'))
      .send({ accountantId: auth.kuaiji.user.id })
      .expect(201);

    await request(httpServer)
      .post(`/tenant-registers/${tenant.body.id}/confirm-assignment`)
      .set('Authorization', bearer('kuaiji'))
      .expect(201);

    const customerInMaintenance = await request(httpServer)
      .get(`/customers/${customer.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(customerInMaintenance.body.lifecycleStage).toBe('维护中');
  });

  // ====================================================================
  it('10. customer intake — 完整度校验 | 正式提交通知 | 岗位确认 | 修改后失效', async () => {
    const templates = await request(httpServer)
      .get('/service-templates')
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    const businessTemplate = templates.body.find(
      (template: any) =>
        !Array.isArray(template.requiredMaterials) &&
        template.requiredMaterials?.responsibleRole === '业务',
    );
    expect(businessTemplate).toBeDefined();

    const customer = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('shangwu'))
      .send({
        companyName: `P0完整提单客户-${suffix}`,
        customerCategory: '代理户',
        companyType: '多股东',
        industry: '信息技术',
        registerDate: '2026-01-02',
        taxType: '小规模纳税人',
        region: '深圳',
        annualRevenue: 1000000,
        staffCount: 12,
      })
      .expect(201);

    const initialStatus = await request(httpServer)
      .get(`/customers/${customer.body.id}/intake-status`)
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    expect(initialStatus.body.ready).toBe(false);
    expect(initialStatus.body.missingItems).toEqual(
      expect.arrayContaining([
        '至少选择一项服务',
        '配置业务岗',
        '配置会计岗',
        '配置总务岗',
        '创建收费记录',
      ]),
    );

    await request(httpServer)
      .put(`/customers/${customer.body.id}/staff-assignment`)
      .set('Authorization', bearer('shangwu'))
      .send({
        businessStaffId: auth.yewu.user.id,
        accountantId: auth.kuaiji.user.id,
        generalAffairsId: auth.zongwu.user.id,
      })
      .expect(200);

    await request(httpServer)
      .post('/service-read-confirmations')
      .set('Authorization', bearer('shangwu'))
      .send({
        customerId: customer.body.id,
        templateId: businessTemplate.id,
      })
      .expect(201);

    await request(httpServer)
      .post(`/customers/${customer.body.id}/service-items`)
      .set('Authorization', bearer('shangwu'))
      .send({ templateIds: [businessTemplate.id] })
      .expect(201);

    await request(httpServer)
      .post('/charges')
      .set('Authorization', bearer('shangwu'))
      .send({
        customerId: customer.body.id,
        chargeMode: '一次性',
        amount: 3000,
      })
      .expect(201);

    const readyStatus = await request(httpServer)
      .get(`/customers/${customer.body.id}/intake-status`)
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    expect(readyStatus.body.ready).toBe(true);
    expect(readyStatus.body.canSubmit).toBe(true);

    await request(httpServer)
      .post(`/customers/${customer.body.id}/submit-intake`)
      .set('Authorization', bearer('yewu'))
      .expect(403);

    const submitted = await request(httpServer)
      .post(`/customers/${customer.body.id}/submit-intake`)
      .set('Authorization', bearer('shangwu'))
      .expect(201);
    expect(submitted.body.submitted).toBe(true);
    expect(submitted.body.assignmentConfirmations).toHaveLength(3);

    for (const username of ['yewu', 'kuaiji', 'zongwu']) {
      const notifications = await request(httpServer)
        .get('/notifications')
        .set('Authorization', bearer(username))
        .expect(200);
      expect(
        notifications.body.some(
          (notification: any) =>
            notification.type === 'customer_intake' &&
            notification.targetId === customer.body.id,
        ),
      ).toBe(true);

      await request(httpServer)
        .post(`/customers/${customer.body.id}/confirm-intake-assignment`)
        .set('Authorization', bearer(username))
        .expect(201);
    }

    const confirmedStatus = await request(httpServer)
      .get(`/customers/${customer.body.id}/intake-status`)
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    expect(confirmedStatus.body.allAssignmentsConfirmed).toBe(true);

    await request(httpServer)
      .patch(`/customers/${customer.body.id}`)
      .set('Authorization', bearer('shangwu'))
      .send({ industry: '软件和信息服务' })
      .expect(200);

    const invalidatedStatus = await request(httpServer)
      .get(`/customers/${customer.body.id}/intake-status`)
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    expect(invalidatedStatus.body.submitted).toBe(false);
    expect(
      invalidatedStatus.body.assignmentConfirmations.every(
        (assignment: any) => assignment.confirmed === false,
      ),
    ).toBe(true);
  });

  // ====================================================================
  it('11. accounting work log — 会计登记 | 客户隔离 | 主管复核 | 复核后锁定', async () => {
    const created = await request(httpServer)
      .post('/accounting-work-logs')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: ownedCustomerId,
        recordType: '报税进度',
        recordDate: new Date().toISOString(),
        content: '本月申报资料已核对，等待客户确认最后一项数据',
        remark: '计划两个工作日内完成',
      })
      .expect(201);
    expect(created.body.accountant.id).toBe(auth.kuaiji.user.id);
    expect(created.body.status).toBe('已登记');

    const supervisorNotifications = await request(httpServer)
      .get('/notifications')
      .set('Authorization', bearer('zhuguan'))
      .expect(200);
    expect(
      supervisorNotifications.body.some(
        (notification: any) =>
          notification.type === 'accounting_log' &&
          notification.targetId === created.body.id,
      ),
    ).toBe(true);

    await request(httpServer)
      .post('/accounting-work-logs')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: otherCustomerId,
        recordType: '日常咨询',
        recordDate: new Date().toISOString(),
        content: '越权登记',
      })
      .expect(403);

    const accountantList = await request(httpServer)
      .get('/accounting-work-logs')
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(accountantList.body.some((row: any) => row.id === created.body.id)).toBe(true);

    const businessList = await request(httpServer)
      .get('/accounting-work-logs')
      .set('Authorization', bearer('shangwu'))
      .expect(200);
    expect(businessList.body.some((row: any) => row.id === created.body.id)).toBe(true);

    const reviewed = await request(httpServer)
      .post(`/accounting-work-logs/${created.body.id}/review`)
      .set('Authorization', bearer('zhuguan'))
      .expect(201);
    expect(reviewed.body.status).toBe('已复核');
    expect(reviewed.body.reviewedBy.id).toBe(auth.zhuguan.user.id);

    const accountantNotifications = await request(httpServer)
      .get('/notifications')
      .set('Authorization', bearer('kuaiji'))
      .expect(200);
    expect(
      accountantNotifications.body.some(
        (notification: any) =>
          notification.type === 'accounting_log' &&
          notification.targetId === created.body.id,
      ),
    ).toBe(true);

    await request(httpServer)
      .patch(`/accounting-work-logs/${created.body.id}`)
      .set('Authorization', bearer('kuaiji'))
      .send({ content: '复核后尝试修改' })
      .expect(403);
  });
});
