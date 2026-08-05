import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, PermissionService } from '../permissions/permissions.service';
import {
  CreateAccountingWorkLogDto,
  QueryAccountingWorkLogDto,
  UpdateAccountingWorkLogDto,
} from './dto/accounting-work-log.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AccountingWorkLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(query: QueryAccountingWorkLogDto, user: AuthUser) {
    const where: Prisma.AccountingWorkLogWhereInput = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.recordType) where.recordType = query.recordType;
    if (query.month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) {
        throw new BadRequestException('month 格式必须为 YYYY-MM');
      }
      const start = new Date(`${query.month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      where.recordDate = { gte: start, lt: end };
    }

    if (user.roleCode === '会计') {
      where.accountantId = user.sub;
    } else if (user.roleCode === '商务') {
      where.customer = { ownerId: user.sub };
    } else if (user.roleCode === '业务') {
      where.customer = {
        staffAssignment: { is: { businessStaffId: user.sub } },
      };
    } else if (
      user.roleCode !== '主管' &&
      user.roleCode !== '总务' &&
      user.roleCode !== '管理员'
    ) {
      return [];
    }

    return this.prisma.accountingWorkLog.findMany({
      where,
      include: this.include(),
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateAccountingWorkLogDto, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      include: { staffAssignment: true, tenantRegister: true },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);
    }
    if (user.roleCode === '会计') {
      const assigned =
        customer.staffAssignment?.accountantId === user.sub ||
        customer.tenantRegister?.assignedAccountantId === user.sub;
      if (!assigned) {
        throw new ForbiddenException('只能登记本人负责客户的会计工作');
      }
    }

    const created = await this.prisma.accountingWorkLog.create({
      data: {
        customerId: dto.customerId,
        accountantId: user.sub,
        recordType: dto.recordType,
        recordDate: new Date(dto.recordDate),
        content: dto.content.trim(),
        remark: dto.remark?.trim(),
      },
      include: this.include(),
    });
    await this.notifications.createForRole({
      type: 'accounting_log',
      title: '会计台账待复核',
      body: `${created.accountant.realName}登记了客户【${created.customer.companyName}】的${created.recordType}`,
      senderId: user.sub,
      roleTarget: '主管',
      targetType: 'accounting_log',
      targetId: created.id,
    });
    return created;
  }

  async update(id: number, dto: UpdateAccountingWorkLogDto, user: AuthUser) {
    const row = await this.prisma.accountingWorkLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`会计工作记录 id=${id} 不存在`);
    if (
      user.roleCode === '会计' &&
      (row.accountantId !== user.sub || row.reviewedAt)
    ) {
      throw new ForbiddenException('只能修改本人尚未复核的记录');
    }

    return this.prisma.accountingWorkLog.update({
      where: { id },
      data: {
        recordType: dto.recordType,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
        content: dto.content?.trim(),
        remark: dto.remark?.trim(),
        status: row.reviewedAt ? '已登记' : undefined,
        reviewedAt: row.reviewedAt ? null : undefined,
        reviewedById: row.reviewedAt ? null : undefined,
      },
      include: this.include(),
    });
  }

  async review(id: number, user: AuthUser) {
    const row = await this.prisma.accountingWorkLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`会计工作记录 id=${id} 不存在`);
    if (row.reviewedAt) throw new BadRequestException('该记录已经复核');

    const updated = await this.prisma.accountingWorkLog.update({
      where: { id },
      data: {
        status: '已复核',
        reviewedAt: new Date(),
        reviewedById: user.sub,
      },
      include: this.include(),
    });
    await this.notifications.create({
      type: 'accounting_log',
      title: '会计台账已复核',
      body: `客户【${updated.customer.companyName}】的${updated.recordType}已由主管复核`,
      senderId: user.sub,
      receiverId: updated.accountantId,
      targetType: 'accounting_log',
      targetId: updated.id,
    });
    return updated;
  }

  private include() {
    return {
      customer: { select: { id: true, companyName: true } },
      accountant: { select: { id: true, realName: true } },
      reviewedBy: { select: { id: true, realName: true } },
    };
  }
}
