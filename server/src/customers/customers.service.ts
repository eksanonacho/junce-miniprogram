import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // 新建客户。ownerId 来自登录用户的 JWT，不允许前端传
  async create(dto: CreateCustomerDto, ownerId: number) {
    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        ownerId,
        // registerDate 是前端传的 ISO 字符串，转为 Date
        registerDate: dto.registerDate ? new Date(dto.registerDate) : undefined,
      },
      include: { owner: { select: { id: true, realName: true } } },
    });
    return this.serializeDecimal(customer);
  }

  // 客户列表，支持筛选和搜索
  async findAll(query: QueryCustomerDto) {
    const where: Prisma.CustomerWhereInput = {};

    if (query.tier) {
      where.tier = query.tier;
    }
    if (query.lifecycleStage) {
      where.lifecycleStage = query.lifecycleStage;
    }
    if (query.keyword) {
      where.companyName = { contains: query.keyword };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: { owner: { select: { id: true, realName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => this.serializeDecimal(c));
  }

  // 客户详情
  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { owner: { select: { id: true, realName: true } } },
    });

    if (!customer) {
      throw new NotFoundException(`客户 id=${id} 不存在`);
    }

    return this.serializeDecimal(customer);
  }

  // 修改客户
  async update(id: number, dto: UpdateCustomerDto) {
    // 先确认存在
    await this.findOne(id);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        registerDate: dto.registerDate ? new Date(dto.registerDate) : undefined,
      },
      include: { owner: { select: { id: true, realName: true } } },
    });

    return this.serializeDecimal(updated);
  }

  // ---- helpers ----

  /**
   * 把 Prisma.Decimal 转成 JS number，否则 JSON 序列化会变成 { "$numberDecimal": "..." }
   * Decimal(12,2) 的值完整在 JS number 安全范围内（最大 9999999999.99 < 2^53）
   */
  private serializeDecimal<T>(obj: T): T {
    const result = { ...obj } as any;
    if (result.annualRevenue !== null && result.annualRevenue !== undefined) {
      result.annualRevenue = Number(result.annualRevenue.toString());
    }
    return result as T;
  }
}
