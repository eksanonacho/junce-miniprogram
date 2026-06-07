import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';

@Injectable()
export class ServiceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询模板列表，可选按 serviceType 筛选
  async findAll(serviceType?: string) {
    const where: any = { isActive: true };
    if (serviceType) {
      where.serviceType = serviceType;
    }
    return this.prisma.serviceTemplate.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  // 查询单个模板详情
  async findOne(id: number) {
    const template = await this.prisma.serviceTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`服务模板 id=${id} 不存在`);
    }
    return template;
  }

  // 提交已读确认。userId 从 JWT 取，不接受前端传
  async confirm(dto: CreateConfirmationDto, userId: number) {
    // 验证模板存在
    await this.findOne(dto.templateId);

    // 验证客户存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);
    }

    // 检查是否已确认（unique 约束防重复）
    const existing = await this.prisma.serviceReadConfirmation.findUnique({
      where: {
        unique_read_confirmation: {
          customerId: dto.customerId,
          templateId: dto.templateId,
          userId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('该服务模板已确认，无需重复确认');
    }

    return this.prisma.serviceReadConfirmation.create({
      data: {
        customerId: dto.customerId,
        templateId: dto.templateId,
        serviceItemId: dto.serviceItemId ?? null,
        userId,
      },
      include: {
        template: { select: { id: true, serviceType: true } },
        user: { select: { id: true, realName: true } },
      },
    });
  }

  // 查询某客户的已读确认记录
  async findConfirmations(customerId: number, templateId?: number) {
    const where: any = { customerId };
    if (templateId) {
      where.templateId = templateId;
    }
    return this.prisma.serviceReadConfirmation.findMany({
      where,
      include: {
        template: { select: { id: true, serviceType: true } },
        user: { select: { id: true, realName: true } },
      },
      orderBy: { confirmedAt: 'desc' },
    });
  }
}
