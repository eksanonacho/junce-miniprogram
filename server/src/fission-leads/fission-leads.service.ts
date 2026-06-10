import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FissionLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建（所有登录角色）
  async create(dto: any, initiatedById: number) {
    if (dto.sourceCustomerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.sourceCustomerId } });
      if (!customer) throw new NotFoundException(`客户 id=${dto.sourceCustomerId} 不存在`);
    }
    if (dto.assigneeId) await this.validateUser(dto.assigneeId);

    return this.prisma.fissionLead.create({
      data: { ...dto, initiatedById },
      include: this.includes(),
    });
  }

  // 列表
  async findAll(query: { customerId?: number; status?: string }) {
    const where: any = {};
    if (query.customerId) where.sourceCustomerId = query.customerId;
    if (query.status) where.status = query.status;
    return this.prisma.fissionLead.findMany({ where, include: this.includes(), orderBy: { createdAt: 'desc' } });
  }

  // 详情
  async findOne(id: number) {
    const lead = await this.prisma.fissionLead.findUnique({ where: { id }, include: this.includes() });
    if (!lead) throw new NotFoundException(`裂变线索 id=${id} 不存在`);
    return lead;
  }

  // PATCH（主管+管理员），禁止改 status
  async update(id: number, dto: any) {
    await this.findOne(id);
    if (dto.assigneeId) await this.validateUser(dto.assigneeId);
    if (dto.sourceCustomerId !== undefined && dto.sourceCustomerId !== null) {
      const c = await this.prisma.customer.findUnique({ where: { id: dto.sourceCustomerId } });
      if (!c) throw new NotFoundException(`客户 id=${dto.sourceCustomerId} 不存在`);
    }
    const data: any = {};
    if (dto.sourceCustomerId !== undefined) data.sourceCustomerId = dto.sourceCustomerId;
    if (dto.leadName !== undefined) data.leadName = dto.leadName;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.archiveFiles !== undefined) data.archiveFiles = dto.archiveFiles;
    return this.prisma.fissionLead.update({ where: { id }, data, include: this.includes() });
  }

  // 确认（主管+管理员）
  async confirm(id: number, userId: number) {
    const lead = await this.findOne(id);
    if (lead.status !== '待确认') throw new BadRequestException(`当前状态为"${lead.status}"，只有"待确认"状态才能确认`);
    return this.prisma.fissionLead.update({
      where: { id },
      data: { status: '已确认', confirmedById: userId, confirmedAt: new Date() },
      include: this.includes(),
    });
  }

  // 归档（主管+管理员）
  async archive(id: number, userId: number, archiveFiles: any[]) {
    const lead = await this.findOne(id);
    if (lead.status !== '已确认') throw new BadRequestException(`当前状态为"${lead.status}"，只有"已确认"状态才能归档`);
    return this.prisma.fissionLead.update({
      where: { id },
      data: { status: '已归档', archivedById: userId, archivedAt: new Date(), archiveFiles },
      include: this.includes(),
    });
  }

  // 标记无效（主管+管理员）
  async markInvalid(id: number) {
    const lead = await this.findOne(id);
    if (!['待确认', '已确认'].includes(lead.status)) throw new BadRequestException(`当前状态为"${lead.status}"，只有"待确认"或"已确认"状态才能标记为无效`);
    return this.prisma.fissionLead.update({
      where: { id },
      data: { status: '无效' },
      include: this.includes(),
    });
  }

  private async validateUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`用户 id=${id} 不存在`);
  }

  private includes() {
    return {
      sourceCustomer: { select: { id: true, companyName: true } },
      initiatedBy: { select: { id: true, realName: true } },
      assignee: { select: { id: true, realName: true } },
      confirmer: { select: { id: true, realName: true } },
      archiver: { select: { id: true, realName: true } },
    };
  }
}
