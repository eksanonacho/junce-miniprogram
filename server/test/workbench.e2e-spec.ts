import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

type LoginResult = {
  accessToken: string;
  user: { id: number; roleCode: string };
};

type TodoGroup = {
  key: string;
  count: number;
  targetPath: string;
  items: Array<Record<string, any>>;
};

describe('Workbench todos (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  const auth: Record<string, LoginResult> = {};
  const suffix = Date.now();

  const validPaths = new Set([
    '/pages/customer-list/customer-list',
    '/pages/customer-detail/customer-detail',
    '/pages/workorder-list/workorder-list',
    '/pages/workorder-detail/workorder-detail',
    '/pages/charge-unpaid-list/charge-unpaid-list',
    '/pages/charge-detail/charge-detail',
    '/pages/task-list/task-list',
    '/pages/task-detail/task-detail',
    '/pages/tenant-detail/tenant-detail',
    '/pages/fission-list/fission-list',
    '/pages/fission-detail/fission-detail',
    '/pages/manual-business/manual-business',
    '/pages/manual-salary/manual-salary',
  ]);

  const names = {
    ownedCustomer: `P1待办商务客户-${suffix}`,
    otherCustomer: `P1待办他人客户-${suffix}`,
    unassignedCustomer: `P1待办未分派托管客户-${suffix}`,
  };

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

    await seedTodoData();
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (username: string) => `Bearer ${auth[username].accessToken}`;

  const findGroup = (body: any, key: string) =>
    body.todoGroups.find((group: TodoGroup) => group.key === key);

  const expectValidShape = (body: any) => {
    expect(body).toHaveProperty('roleCode');
    expect(body).toHaveProperty('generatedAt');
    expect(Array.isArray(body.todoGroups)).toBe(true);

    for (const group of body.todoGroups as TodoGroup[]) {
      expect(validPaths.has(group.targetPath)).toBe(true);
      expect(group.items.length).toBeLessThanOrEqual(3);
      for (const item of group.items) {
        expect(validPaths.has(item.targetPath)).toBe(true);
      }
    }
  };

  async function seedTodoData() {
    const templateRes = await request(httpServer)
      .get('/service-templates')
      .set('Authorization', bearer('admin'))
      .expect(200);
    const templateIds = templateRes.body.slice(0, 5).map((item: any) => item.id);
    expect(templateIds.length).toBeGreaterThanOrEqual(4);

    const owned = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('shangwu'))
      .send({
        companyName: names.ownedCustomer,
        customerCategory: '代理户',
        tier: '优质',
      })
      .expect(201);
    const ownedCustomerId = owned.body.id;

    await request(httpServer)
      .put(`/customers/${ownedCustomerId}/staff-assignment`)
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
      .send({ customerId: ownedCustomerId, templateId: templateIds[0] })
      .expect(201);

    const serviceItems = await request(httpServer)
      .post(`/customers/${ownedCustomerId}/service-items`)
      .set('Authorization', bearer('shangwu'))
      .send({ templateIds: templateIds.slice(0, 3) })
      .expect(201);

    const workOrders: any[] = [];
    for (const serviceItem of serviceItems.body.created) {
      const workOrder = await request(httpServer)
        .post('/work-orders')
        .set('Authorization', bearer('shangwu'))
        .send({
          serviceItemId: serviceItem.id,
          handlerId: auth.yewu.user.id,
          receiptReceiverId: auth.shangwu.user.id,
        })
        .expect(201);
      workOrders.push(workOrder.body);
    }

    await request(httpServer)
      .patch(`/work-orders/${workOrders[1].id}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办件中' })
      .expect(200);

    await request(httpServer)
      .patch(`/work-orders/${workOrders[2].id}`)
      .set('Authorization', bearer('yewu'))
      .send({ status: '办结' })
      .expect(200);

    await request(httpServer)
      .post('/charges')
      .set('Authorization', bearer('shangwu'))
      .send({
        customerId: ownedCustomerId,
        chargeMode: '一次性',
        amount: 1888,
        contractNo: `P1WB-${suffix}`,
      })
      .expect(201);

    const tenant = await request(httpServer)
      .post('/tenant-registers')
      .set('Authorization', bearer('kuaiji'))
      .send({
        customerId: ownedCustomerId,
        enterpriseDetail: { name: 'P1待办企业概况' },
        servicePlan: { plan: 'P1待办服务方案' },
      })
      .expect(201);

    await request(httpServer)
      .post(`/tenant-registers/${tenant.body.id}/assign-accountant`)
      .set('Authorization', bearer('zhuguan'))
      .send({ accountantId: auth.kuaiji.user.id })
      .expect(201);

    await request(httpServer)
      .post('/tasks')
      .set('Authorization', bearer('zhuguan'))
      .send({
        title: `P1会计待确认任务-${suffix}`,
        toUserId: auth.kuaiji.user.id,
        customerId: ownedCustomerId,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    const accountantInProgress = await request(httpServer)
      .post('/tasks')
      .set('Authorization', bearer('zhuguan'))
      .send({
        title: `P1会计进行中任务-${suffix}`,
        toUserId: auth.kuaiji.user.id,
        customerId: ownedCustomerId,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    await request(httpServer)
      .post(`/tasks/${accountantInProgress.body.id}/confirm`)
      .set('Authorization', bearer('kuaiji'))
      .expect(201);

    await request(httpServer)
      .post('/tasks')
      .set('Authorization', bearer('zhuguan'))
      .send({
        title: `P1逾期任务-${suffix}`,
        toUserId: auth.yewu.user.id,
        customerId: ownedCustomerId,
        deadline: new Date(Date.now() - 86400000).toISOString(),
      })
      .expect(201);

    const other = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('admin'))
      .send({
        companyName: names.otherCustomer,
        customerCategory: '新用户',
      })
      .expect(201);
    const otherCustomerId = other.body.id;

    const otherServiceItems = await request(httpServer)
      .post(`/customers/${otherCustomerId}/service-items`)
      .set('Authorization', bearer('admin'))
      .send({ templateIds: [templateIds[3]] })
      .expect(201);

    await request(httpServer)
      .post('/work-orders')
      .set('Authorization', bearer('admin'))
      .send({
        serviceItemId: otherServiceItems.body.created[0].id,
        handlerId: auth.admin.user.id,
        receiptReceiverId: auth.admin.user.id,
      })
      .expect(201);

    const unassigned = await request(httpServer)
      .post('/customers')
      .set('Authorization', bearer('admin'))
      .send({
        companyName: names.unassignedCustomer,
        customerCategory: '代理户',
      })
      .expect(201);

    await request(httpServer)
      .post('/tenant-registers')
      .set('Authorization', bearer('admin'))
      .send({
        customerId: unassigned.body.id,
        enterpriseDetail: { name: 'P1待分派企业概况' },
        servicePlan: { plan: 'P1待分派服务方案' },
      })
      .expect(201);

    const fission = await request(httpServer)
      .post('/fission-leads')
      .set('Authorization', bearer('shangwu'))
      .send({
        sourceCustomerId: ownedCustomerId,
        leadName: `P1裂变待审批-${suffix}`,
        contactName: '待审批联系人',
        assigneeId: auth.yewu.user.id,
      })
      .expect(201);

    const confirmedFission = await request(httpServer)
      .post('/fission-leads')
      .set('Authorization', bearer('shangwu'))
      .send({
        sourceCustomerId: ownedCustomerId,
        leadName: `P1裂变待归档-${suffix}`,
        contactName: '待归档联系人',
        assigneeId: auth.yewu.user.id,
      })
      .expect(201);
    expect(fission.body.id).toBeTruthy();
    await request(httpServer)
      .post(`/fission-leads/${confirmedFission.body.id}/confirm`)
      .set('Authorization', bearer('zhuguan'))
      .expect(201);
  }

  it('returns 401 for anonymous requests', async () => {
    await request(httpServer).get('/workbench/todos').expect(401);
  });

  it('returns business user todos only for owned customer data', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('shangwu'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('商务');
    expect(findGroup(res.body, 'customers_follow_up').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'charges_unpaid').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'work_orders_progress').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tenant_plan_confirm').count).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).toContain(names.ownedCustomer);
    expect(JSON.stringify(res.body)).not.toContain(names.otherCustomer);
    expect(JSON.stringify(res.body)).not.toContain('"amount"');
  });

  it('returns work-order handler todos only for assigned work orders', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('yewu'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('业务');
    expect(findGroup(res.body, 'work_orders_pending').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'work_orders_in_progress').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'work_orders_check_in').count).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).toContain(names.ownedCustomer);
    expect(JSON.stringify(res.body)).not.toContain(names.otherCustomer);
    expect(JSON.stringify(res.body)).not.toContain('"amount"');
  });

  it('returns accountant todos only for own tasks and tenant assignment', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('kuaiji'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('会计');
    expect(findGroup(res.body, 'tasks_pending_confirm').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tasks_in_progress').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tenant_assignment_confirm').count).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).toContain(names.ownedCustomer);
    expect(JSON.stringify(res.body)).not.toContain(names.otherCustomer);
    expect(JSON.stringify(res.body)).not.toContain('"amount"');
  });

  it('returns supervisor scoped todo groups', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('zhuguan'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('主管');
    expect(findGroup(res.body, 'tasks_unfinished').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tasks_overdue').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'fission_pending_confirm').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'fission_pending_archive').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tenant_pending_assign').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'work_orders_follow_up').count).toBeGreaterThan(0);
  });

  it('returns general affairs charge/report todos without work-order operation groups', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('zongwu'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('总务');
    expect(findGroup(res.body, 'charges_unpaid').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'manual_business_month')).toBeTruthy();
    expect(findGroup(res.body, 'manual_salary_month')).toBeTruthy();
    expect(res.body.todoGroups.some((group: TodoGroup) => group.key.startsWith('work_orders'))).toBe(false);
  });

  it('returns admin global todo groups', async () => {
    const res = await request(httpServer)
      .get('/workbench/todos')
      .set('Authorization', bearer('admin'))
      .expect(200);

    expectValidShape(res.body);
    expect(res.body.roleCode).toBe('管理员');
    expect(findGroup(res.body, 'customers_follow_up').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'work_orders_pending').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'charges_unpaid').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tasks_unfinished').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'fission_pending_confirm').count).toBeGreaterThan(0);
    expect(findGroup(res.body, 'tenant_pending_assign').count).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).toContain(names.otherCustomer);
  });
});
