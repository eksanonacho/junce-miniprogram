import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // 老板总览
  async overview() {
    const [customers, serviceItems, workOrders, tasks, charges, accounting] = await Promise.all([
      this.customersOverview(),
      this.serviceItemsOverview(),
      this.workOrdersOverview(),
      this.tasksOverview(),
      this.chargesOverview(),
      this.accounting(),
    ]);

    return { customers, serviceItems, workOrders, tasks, charges, accounting };
  }

  // 客户看板
  async customers() {
    const [total, byCategory, byTier, byStage] = await Promise.all([
      this.prisma.customer.count(),
      this.groupBy('customer', 'customerCategory'),
      this.groupBy('customer', 'tier'),
      this.groupBy('customer', 'lifecycleStage'),
    ]);

    return { total, byCategory, byTier, byLifecycleStage: byStage };
  }

  // 服务看板
  async services() {
    const [siTotal, siByStatus, woTotal, woByStatus] = await Promise.all([
      this.prisma.serviceItem.count(),
      this.groupBy('serviceItem', 'status'),
      this.prisma.workOrder.count(),
      this.groupBy('workOrder', 'status'),
    ]);

    return {
      serviceItems: { total: siTotal, byStatus: siByStatus },
      workOrders: { total: woTotal, byStatus: woByStatus },
    };
  }

  // 任务看板
  async tasks() {
    const [total, byStatus, overdue] = await Promise.all([
      this.prisma.task.count(),
      this.groupBy('task', 'status'),
      this.prisma.task.count({
        where: {
          status: { not: '已完成' },
          deadline: { lt: new Date() },
        },
      }),
    ]);

    return { total, byStatus, overdue };
  }

  // 收费看板
  async charges() {
    const [total, collectedCount, unpaidCount, sumResult] = await Promise.all([
      this.prisma.charge.count(),
      this.prisma.charge.count({ where: { chargeStatus: '已收' } }),
      this.prisma.charge.count({ where: { chargeStatus: '未收' } }),
      // aggregate for amounts
      this.prisma.charge.aggregate({
        _sum: { amount: true },
        where: { chargeStatus: '已收' },
      }),
    ]);

    const unpaidSum = await this.prisma.charge.aggregate({
      _sum: { amount: true },
      where: { chargeStatus: '未收' },
    });

    const reminderCount = await this.prisma.collectionReminder.count();

    // Decimal → number（Dashboard 仅用于展示，不用于财务计算）
    const collectedAmount = Number(sumResult._sum.amount?.toString() ?? '0');
    const unpaidAmount = Number(unpaidSum._sum.amount?.toString() ?? '0');

    return { total, collectedCount, unpaidCount, collectedAmount, unpaidAmount, reminderCount };
  }

  async accounting() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [total, thisMonth, pendingReview, reviewed, byTypeRows] = await Promise.all([
      this.prisma.accountingWorkLog.count(),
      this.prisma.accountingWorkLog.count({ where: { recordDate: { gte: monthStart } } }),
      this.prisma.accountingWorkLog.count({ where: { reviewedAt: null } }),
      this.prisma.accountingWorkLog.count({ where: { reviewedAt: { not: null } } }),
      this.prisma.accountingWorkLog.groupBy({
        by: ['recordType'],
        _count: { id: true },
        where: { recordDate: { gte: monthStart } },
      }),
    ]);
    return {
      total,
      thisMonth,
      pendingReview,
      reviewed,
      byType: Object.fromEntries(
        byTypeRows.map((row) => [row.recordType, row._count.id]),
      ),
    };
  }

  // ========== helpers ==========

  /** Prisma groupBy 通用包装，遍历枚举值并返回 { value: count } */
  private async groupBy(
    model: 'customer' | 'serviceItem' | 'workOrder' | 'task',
    field: string,
  ): Promise<Record<string, number>> {
    const prisma: any = this.prisma;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rows = await prisma[model].groupBy({
      by: [field],
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const row of rows) {
      const key: string = row[field] ?? 'null';
      result[key] = row._count.id;
    }
    return result;
  }

  // ---- overview helpers (lightweight counts) ----

  /** activeCount = lifecycleStage !== "出库" */
  private async customersOverview() {
    const [total, activeCount] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({
        where: { lifecycleStage: { not: '出库' } },
      }),
    ]);
    return { total, activeCount };
  }

  private async serviceItemsOverview() {
    const [total, todo, inProgress, completed] = await Promise.all([
      this.prisma.serviceItem.count(),
      this.prisma.serviceItem.count({ where: { status: '待办' } }),
      this.prisma.serviceItem.count({ where: { status: '办件中' } }),
      this.prisma.serviceItem.count({ where: { status: '办结' } }),
    ]);
    return { total, todo, inProgress, completed };
  }

  private async workOrdersOverview() {
    const [total, inProgress] = await Promise.all([
      this.prisma.workOrder.count(),
      this.prisma.workOrder.count({ where: { status: '办件中' } }),
    ]);
    return { total, inProgress };
  }

  private async tasksOverview() {
    const [total, pendingConfirm, inProgress, completed] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: '待确认' } }),
      this.prisma.task.count({ where: { status: '进行中' } }),
      this.prisma.task.count({ where: { status: '已完成' } }),
    ]);
    return { total, pendingConfirm, inProgress, completed };
  }

  private async chargesOverview() {
    const [unpaidCount, collectedSum, unpaidSum] = await Promise.all([
      this.prisma.charge.count({ where: { chargeStatus: '未收' } }),
      this.prisma.charge.aggregate({ _sum: { amount: true }, where: { chargeStatus: '已收' } }),
      this.prisma.charge.aggregate({ _sum: { amount: true }, where: { chargeStatus: '未收' } }),
    ]);
    return {
      unpaidCount,
      // Decimal → number（Dashboard 仅用于展示，不用于二次财务计算）
      collectedAmount: Number(collectedSum._sum.amount?.toString() ?? '0'),
      unpaidAmount: Number(unpaidSum._sum.amount?.toString() ?? '0'),
    };
  }
}
