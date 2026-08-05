import { Injectable, NotFoundException } from '@nestjs/common';
import { LifecycleStage, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(
    customerId: number,
    client?: Prisma.TransactionClient,
  ): Promise<LifecycleStage> {
    const db: any = client ?? this.prisma;
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        serviceItems: {
          select: {
            id: true,
            status: true,
            workOrder: { select: { status: true } },
          },
        },
        tenantRegister: {
          select: { assignConfirmed: true },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${customerId} 不存在`);
    }

    // 出库是人工终态，不允许业务流转自动重新激活。
    if (customer.lifecycleStage === '出库') return '出库';

    const items = customer.serviceItems;
    let lifecycleStage: LifecycleStage = '填单';

    if (items.length > 0) {
      const allArchived = items.every(
        (item: any) => item.workOrder?.status === '已打卡',
      );
      const anyStarted = items.some(
        (item: any) =>
          item.workOrder &&
          ['办件中', '办结', '已打卡'].includes(item.workOrder.status),
      );

      if (allArchived) {
        lifecycleStage =
          customer.customerCategory === '代理户' &&
          customer.tenantRegister?.assignConfirmed
            ? '维护中'
            : '办结';
      } else if (anyStarted) {
        lifecycleStage = '办件中';
      }
    }

    if (customer.lifecycleStage !== lifecycleStage) {
      await db.customer.update({
        where: { id: customerId },
        data: { lifecycleStage },
      });
    }
    return lifecycleStage;
  }
}
