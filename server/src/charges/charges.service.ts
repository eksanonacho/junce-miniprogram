import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { ChargeStatus } from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // 创建收费记录（所有登录角色，TODO: 后续可能限商务/总务/管理员）
  async create(dto: CreateChargeDto, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);
    this.permissions.ensure(
      this.permissions.canCreateCharge(user, customer),
      '无权限为该客户创建收费记录',
    );

    const existing = await this.prisma.charge.findUnique({
      where: { customerId: dto.customerId },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: '该客户已存在收费记录，请勿重复创建',
        error: 'Conflict',
        existingCharge: {
          id: existing.id,
          chargeMode: existing.chargeMode,
          amount: Number(existing.amount.toString()),
          chargeStatus: existing.chargeStatus,
        },
      });
    }

    const charge = await this.prisma.charge.create({
      data: dto,
      include: this.includes(),
    });
    return { ...charge, amount: Number(charge.amount.toString()) };
  }

  // 查询（支持 customerId + chargeStatus 筛选）
  async findAll(query: { customerId?: number; chargeStatus?: ChargeStatus }, user: AuthUser) {
    const where: any = this.permissions.chargeVisibleWhere(user);
    if (query.customerId) where.customerId = query.customerId;
    if (query.chargeStatus) where.chargeStatus = query.chargeStatus;

    const charges = await this.prisma.charge.findMany({
      where,
      include: this.includes(),
      orderBy: { createdAt: 'desc' },
    });
    return charges.map((c) => ({ ...c, amount: Number(c.amount.toString()) }));
  }

  // 详情
  async findOne(id: number, user?: AuthUser) {
    const charge = await this.prisma.charge.findUnique({
      where: { id },
      include: this.includesWithPermission(),
    });
    if (!charge) throw new NotFoundException(`收费记录 id=${id} 不存在`);
    if (user) {
      this.permissions.ensure(
        this.permissions.canReadCharge(user, charge),
        '无权限查看该收费记录',
      );
    }
    return { ...charge, amount: Number(charge.amount.toString()) };
  }

  // 修改（不允许改 chargeStatus/confirmedBy/confirmedAt）
  async update(id: number, dto: UpdateChargeDto) {
    await this.findOne(id);
    const updated = await this.prisma.charge.update({
      where: { id },
      data: dto,
      include: this.includes(),
    });
    return { ...updated, amount: Number(updated.amount.toString()) };
  }

  // 确认已收费（总务/管理员）
  async confirm(id: number, userId: number) {
    const charge = await this.findOneRaw(id);

    if (charge.chargeStatus === '已收') {
      throw new BadRequestException('该收费记录已经是"已收"状态，无需重复确认');
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        chargeStatus: '已收',
        confirmedBy: userId,
        confirmedAt: new Date(),
      },
      include: this.includes(),
    });
    return { ...updated, amount: Number(updated.amount.toString()) };
  }

  // 发起催收（总务/管理员），toUserId 不传则默认客户主理人
  async remind(id: number, fromUserId: number, toUserId?: number, message?: string) {
    const charge = await this.findOneRaw(id);

    if (charge.chargeStatus === '已收') {
      throw new BadRequestException('该收费记录已是"已收"状态，不能发起催收');
    }

    // 不传 toUserId → 默认客户主理人
    const targetUserId = toUserId ?? charge.customer.ownerId;

    // 校验目标用户存在
    const toUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!toUser) throw new NotFoundException(`用户 id=${targetUserId} 不存在`);

    return this.prisma.collectionReminder.create({
      data: {
        chargeId: id,
        fromUserId,
        toUserId: targetUserId,
        message,
      },
      include: {
        fromUser: { select: { id: true, realName: true } },
        toUser: { select: { id: true, realName: true } },
      },
    });
  }

  // 查催收记录
  async findReminders(chargeId: number) {
    await this.findOne(chargeId);
    return this.prisma.collectionReminder.findMany({
      where: { chargeId },
      include: {
        fromUser: { select: { id: true, realName: true } },
        toUser: { select: { id: true, realName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- helpers ----

  private async findOneRaw(id: number) {
    const charge = await this.prisma.charge.findUnique({
      where: { id },
      include: { customer: { select: { id: true, ownerId: true } } },
    });
    if (!charge) throw new NotFoundException(`收费记录 id=${id} 不存在`);
    return charge;
  }

  private includes() {
    return {
      customer: { select: { id: true, companyName: true } },
      confirmer: { select: { id: true, realName: true } },
    };
  }

  private includesWithPermission() {
    return {
      customer: { select: { id: true, companyName: true, ownerId: true } },
      confirmer: { select: { id: true, realName: true } },
    };
  }
}
