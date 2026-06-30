import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PermissionService, AuthUser } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

type TodoPriority = 'normal' | 'high';

type TodoItem = {
  id: number | string;
  title: string;
  subtitle?: string;
  status?: string;
  priority: TodoPriority;
  targetPath: string;
  targetId: number | string;
  updatedAt?: string;
};

type TodoGroup = {
  key: string;
  title: string;
  count: number;
  targetPath: string;
  items: TodoItem[];
};

@Injectable()
export class WorkbenchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  async getTodos(user: AuthUser) {
    const generatedAt = new Date();
    const todoGroups = await this.groupsForRole(user, generatedAt);

    return {
      roleCode: user.roleCode,
      generatedAt: generatedAt.toISOString(),
      todoGroups,
    };
  }

  private async groupsForRole(user: AuthUser, now: Date): Promise<TodoGroup[]> {
    if (this.permissions.isAdmin(user)) return this.adminGroups(user);

    switch (user.roleCode) {
      case '商务':
        return this.businessGroups(user);
      case '业务':
        return this.workOrderHandlerGroups(user);
      case '会计':
        return this.accountantGroups(user);
      case '主管':
        return this.supervisorGroups(user, now);
      case '总务':
        return this.generalAffairsGroups(user, now);
      default:
        return [];
    }
  }

  private async businessGroups(user: AuthUser) {
    const ownCustomer: Prisma.CustomerWhereInput = { ownerId: user.sub };

    return Promise.all([
      this.customerGroup(
        'customers_follow_up',
        '待跟进客户',
        { ...ownCustomer, lifecycleStage: '填单' },
      ),
      this.chargeGroup(
        'charges_unpaid',
        '待收费客户',
        { chargeStatus: '未收', customer: ownCustomer },
      ),
      this.workOrderGroup(
        'work_orders_progress',
        '客户办件进度',
        {
          customer: ownCustomer,
          status: { in: ['待办', '办件中', '办结'] },
        },
      ),
      this.tenantGroup(
        'tenant_plan_confirm',
        '托管方案待确认',
        {
          customer: ownCustomer,
          planConfirmedByOwner: false,
        },
      ),
    ]);
  }

  private async workOrderHandlerGroups(user: AuthUser) {
    return Promise.all([
      this.workOrderGroup('work_orders_pending', '待处理办件', {
        handlerId: user.sub,
        status: '待办',
      }),
      this.workOrderGroup('work_orders_in_progress', '进行中办件', {
        handlerId: user.sub,
        status: '办件中',
      }),
      this.workOrderGroup('work_orders_check_in', '待打卡归档', {
        handlerId: user.sub,
        status: '办结',
      }),
    ]);
  }

  private async accountantGroups(user: AuthUser) {
    return Promise.all([
      this.taskGroup('tasks_pending_confirm', '待确认任务', {
        toUserId: user.sub,
        status: '待确认',
      }),
      this.taskGroup('tasks_in_progress', '待完成任务', {
        toUserId: user.sub,
        status: '进行中',
      }),
      this.tenantGroup('tenant_assignment_confirm', '会计待确认分派', {
        assignedAccountantId: user.sub,
        assignConfirmed: false,
      }),
    ]);
  }

  private async supervisorGroups(user: AuthUser, now: Date) {
    return Promise.all([
      this.taskGroup('tasks_unfinished', '未完成任务', {
        ...this.permissions.taskVisibleWhere(user),
        status: { in: ['待确认', '进行中'] },
      }),
      this.taskGroup('tasks_overdue', '逾期任务', {
        ...this.permissions.taskVisibleWhere(user),
        deadline: { lt: now },
        status: { not: '已完成' },
      }),
      this.fissionGroup('fission_pending_confirm', '裂变待审批', {
        status: '待确认',
      }),
      this.fissionGroup('fission_pending_archive', '裂变待归档', {
        status: '已确认',
      }),
      this.tenantGroup('tenant_pending_assign', '托管待分派会计', {
        ...this.permissions.tenantVisibleWhere(user),
        assignedAccountantId: null,
      }),
      this.workOrderGroup('work_orders_follow_up', '办件待跟进', {
        ...this.permissions.workOrderVisibleWhere(user),
        status: { in: ['办件中', '办结'] },
      }),
    ]);
  }

  private async generalAffairsGroups(user: AuthUser, now: Date) {
    return Promise.all([
      this.chargeGroup('charges_unpaid', '待收费', {
        ...this.permissions.chargeVisibleWhere(user),
        chargeStatus: '未收',
      }),
      this.manualBusinessGroup(now),
      this.manualSalaryGroup(now),
    ]);
  }

  private async adminGroups(user: AuthUser) {
    return Promise.all([
      this.customerGroup('customers_follow_up', '待跟进客户', {
        ...this.permissions.customerVisibleWhere(user),
        lifecycleStage: '填单',
      }),
      this.workOrderGroup('work_orders_pending', '待处理办件', {
        ...this.permissions.workOrderVisibleWhere(user),
        status: '待办',
      }),
      this.chargeGroup('charges_unpaid', '待收费', {
        ...this.permissions.chargeVisibleWhere(user),
        chargeStatus: '未收',
      }),
      this.taskGroup('tasks_unfinished', '未完成任务', {
        ...this.permissions.taskVisibleWhere(user),
        status: { in: ['待确认', '进行中'] },
      }),
      this.fissionGroup('fission_pending_confirm', '裂变待审批', {
        status: '待确认',
      }),
      this.tenantGroup('tenant_pending_assign', '托管待分派会计', {
        ...this.permissions.tenantVisibleWhere(user),
        assignedAccountantId: null,
      }),
    ]);
  }

  private async customerGroup(
    key: string,
    title: string,
    where: Prisma.CustomerWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          lifecycleStage: true,
          updatedAt: true,
        },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/customer-list/customer-list',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.companyName,
        subtitle: '客户建档待跟进',
        status: row.lifecycleStage,
        priority: 'normal',
        targetPath: '/pages/customer-detail/customer-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async workOrderGroup(
    key: string,
    title: string,
    where: Prisma.WorkOrderWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { companyName: true } },
          serviceItem: {
            include: {
              serviceTemplate: { select: { serviceType: true } },
            },
          },
        },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/workorder-list/workorder-list',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.serviceItem.serviceTemplate.serviceType,
        subtitle: row.customer.companyName,
        status: row.status,
        priority: row.status === '办结' ? 'high' : 'normal',
        targetPath: '/pages/workorder-detail/workorder-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async chargeGroup(
    key: string,
    title: string,
    where: Prisma.ChargeWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.charge.count({ where }),
      this.prisma.charge.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          chargeStatus: true,
          updatedAt: true,
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/charge-unpaid-list/charge-unpaid-list',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.customer.companyName,
        subtitle: '收费待确认',
        status: row.chargeStatus,
        priority: 'high',
        targetPath: '/pages/charge-detail/charge-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async taskGroup(
    key: string,
    title: string,
    where: Prisma.TaskWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/task-list/task-list',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.customer?.companyName,
        status: row.status,
        priority: row.deadline < new Date() && row.status !== '已完成' ? 'high' : 'normal',
        targetPath: '/pages/task-detail/task-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async tenantGroup(
    key: string,
    title: string,
    where: Prisma.TenantRegisterWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.tenantRegister.count({ where }),
      this.prisma.tenantRegister.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/tenant-detail/tenant-detail',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.customer.companyName,
        subtitle: '托管入档',
        status: row.assignedAccountantId ? '待确认分派' : '待分派会计',
        priority: 'normal',
        targetPath: '/pages/tenant-detail/tenant-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async fissionGroup(
    key: string,
    title: string,
    where: Prisma.FissionLeadWhereInput,
  ): Promise<TodoGroup> {
    const [count, rows] = await Promise.all([
      this.prisma.fissionLead.count({ where }),
      this.prisma.fissionLead.findMany({
        where,
        take: 3,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          leadName: true,
          contactName: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    return this.group(
      key,
      title,
      '/pages/fission-list/fission-list',
      count,
      rows.map((row) => ({
        id: row.id,
        title: row.leadName || row.contactName || `裂变线索 #${row.id}`,
        subtitle: row.contactName || undefined,
        status: row.status,
        priority: row.status === '待确认' ? 'high' : 'normal',
        targetPath: '/pages/fission-detail/fission-detail',
        targetId: row.id,
        updatedAt: this.iso(row.updatedAt),
      })),
    );
  }

  private async manualBusinessGroup(now: Date): Promise<TodoGroup> {
    const month = this.monthKey(now);
    const count = await this.prisma.manualBusinessReport.count({
      where: { month },
    });

    return this.group(
      'manual_business_month',
      '经营报表提醒',
      '/pages/manual-business/manual-business',
      count > 0 ? 0 : 1,
      count > 0
        ? []
        : [
            {
              id: `manual-business-${month}`,
              title: `${month} 经营报表待录入`,
              subtitle: '本月尚未录入经营报表',
              status: '待录入',
              priority: 'normal',
              targetPath: '/pages/manual-business/manual-business',
              targetId: month,
            },
          ],
    );
  }

  private async manualSalaryGroup(now: Date): Promise<TodoGroup> {
    const month = this.monthKey(now);
    const count = await this.prisma.manualSalaryReport.count({
      where: { month },
    });

    return this.group(
      'manual_salary_month',
      '工资报表提醒',
      '/pages/manual-salary/manual-salary',
      count > 0 ? 0 : 1,
      count > 0
        ? []
        : [
            {
              id: `manual-salary-${month}`,
              title: `${month} 工资报表待录入`,
              subtitle: '本月尚未录入工资报表',
              status: '待录入',
              priority: 'normal',
              targetPath: '/pages/manual-salary/manual-salary',
              targetId: month,
            },
          ],
    );
  }

  private group(
    key: string,
    title: string,
    targetPath: string,
    count: number,
    items: TodoItem[],
  ): TodoGroup {
    return {
      key,
      title,
      count,
      targetPath,
      items: items.slice(0, 3),
    };
  }

  private iso(date: Date) {
    return date.toISOString();
  }

  private monthKey(date: Date) {
    return date.toISOString().slice(0, 7);
  }
}
