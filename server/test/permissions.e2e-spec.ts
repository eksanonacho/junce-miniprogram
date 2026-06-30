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

    // 托管
    const tn = await request(httpServer)
      .post('/tenant-registers')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: ownedCustomerId,
        enterpriseDetail: { name: 'P0企业概况' },
        servicePlan: { plan: 'P0服务方案' },
      })
      .expect(201);
    tenantId = tn.body.id;

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

    // 总务正向确认收费
    await request(httpServer)
      .post(`/charges/${chargeId}/confirm`)
      .set('Authorization', bearer('zongwu'))
      .expect(201);
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
});
