import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemStatus } from '../../generated/prisma/client';

@Injectable()
export class ServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // 为某客户批量添加服务项
  async create(customerId: number, templateIds: number[]) {
    // 验证客户存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${customerId} 不存在`);
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const templateId of templateIds) {
      // 验证模板存在
      const template = await this.prisma.serviceTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        errors.push(`服务模板 id=${templateId} 不存在`);
        continue;
      }

      // 检查唯一约束
      const existing = await this.prisma.serviceItem.findUnique({
        where: {
          unique_customer_service_template: {
            customerId,
            serviceTemplateId: templateId,
          },
        },
      });
      if (existing) {
        errors.push(
          `客户已添加过 "${template.serviceType}"（模板 id=${templateId}），不能重复添加`,
        );
        continue;
      }

      const item = await this.prisma.serviceItem.create({
        data: { customerId, serviceTemplateId: templateId },
        include: {
          serviceTemplate: {
            select: { id: true, serviceType: true },
          },
        },
      });
      results.push(item);
    }

    return { created: results, errors };
  }

  // 查某客户的所有服务项
  async findByCustomer(customerId: number) {
    return this.prisma.serviceItem.findMany({
      where: { customerId },
      include: {
        serviceTemplate: {
          select: {
            id: true,
            serviceType: true,
            requiredMaterials: true,
            processSteps: true,
            estimatedDuration: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  // 修改单个服务项状态（本期只允许改 status）
  async updateStatus(id: number, status: ItemStatus) {
    const item = await this.prisma.serviceItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`服务项 id=${id} 不存在`);
    }

    return this.prisma.serviceItem.update({
      where: { id },
      data: { status },
      include: {
        serviceTemplate: {
          select: { id: true, serviceType: true },
        },
      },
    });
  }
}
