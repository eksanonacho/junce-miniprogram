import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { ChargeStatus } from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
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
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { intakeSubmittedAt: null },
      }),
      this.prisma.intakeAssignmentConfirmation.deleteMany({
        where: { customerId: dto.customerId },
      }),
    ]);

    // 通知全部总务
    this.notifications.createForRole({
      type: 'charge', title: '新收费待确认', body: `客户【${customer.companyName}】新增收费 ¥${Number(charge.amount.toString())}`,
      senderId: user.sub, roleTarget: '总务', targetType: 'charge', targetId: charge.id,
    }).catch(() => {});

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
    const existing = await this.findOne(id);
    if (
      existing.chargeStatus === '已收' &&
      (dto.amount !== undefined || dto.chargeMode !== undefined)
    ) {
      throw new BadRequestException('已确认收款后不能修改收费方式或金额');
    }
    const updated = await this.prisma.charge.update({
      where: { id },
      data: dto,
      include: this.includes(),
    });
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: existing.customer.id },
        data: { intakeSubmittedAt: null },
      }),
      this.prisma.intakeAssignmentConfirmation.deleteMany({
        where: { customerId: existing.customer.id },
      }),
    ]);
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

    // 通知客户主理人（商务）
    if (charge.customer?.ownerId) {
      this.notifications.create({
        type: 'charge', title: '收费已确认', body: `客户【${charge.customer.companyName}】收费 ¥${Number(updated.amount.toString())} 已确认收款`,
        senderId: userId, receiverId: charge.customer.ownerId, targetType: 'charge', targetId: id,
      }).catch(() => {});
    }

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

    const reminder = await this.prisma.collectionReminder.create({
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

    this.notifications.create({
      type: 'charge', title: '催收提醒', body: `客户【${charge.customer.companyName}】收费未完成，请尽快处理`,
      senderId: fromUserId, receiverId: targetUserId, targetType: 'charge', targetId: id,
    }).catch(() => {});

    return reminder;
  }

  // 查催收记录
  async findReminders(chargeId: number, user: AuthUser) {
    await this.findOne(chargeId, user);
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
      include: { customer: { select: { id: true, ownerId: true, companyName: true } } },
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
