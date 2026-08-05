import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser, PermissionService } from '../permissions/permissions.service';
import { CustomerLifecycleService } from '../customer-lifecycle/customer-lifecycle.service';

@Injectable()
export class TenantRegistersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
    private readonly customerLifecycle: CustomerLifecycleService,
  ) {}

  // 创建（会计/主管/管理员）
  async create(dto: { customerId: number; enterpriseDetail?: any; servicePlan?: any }) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      include: {
        serviceItems: {
          include: { workOrder: { select: { id: true, status: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);

    // 必须是代理户
    if (customer.customerCategory !== '代理户') {
      throw new BadRequestException(
        `只有代理户才能创建托管入档，当前客户类别为"${customer.customerCategory}"`,
      );
    }
    if (
      customer.serviceItems.length === 0 ||
      customer.serviceItems.some(
        (item) => !item.workOrder || item.workOrder.status !== '已打卡',
      )
    ) {
      throw new BadRequestException(
        '代理户全部服务必须先完成办结打卡和电子材料归档，才能创建托管入档',
      );
    }
    if (!this.hasContent(dto.enterpriseDetail) || !this.hasContent(dto.servicePlan)) {
      throw new BadRequestException('创建托管入档时必须填写企业概况和服务方案');
    }

    const existing = await this.prisma.tenantRegister.findUnique({
      where: { customerId: dto.customerId },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: '该客户已存在托管入档记录，请勿重复创建',
        error: 'Conflict',
        existingTenantRegister: { id: existing.id },
      });
    }

    const tr = await this.prisma.tenantRegister.create({
      data: {
        customerId: dto.customerId,
        enterpriseDetail: dto.enterpriseDetail,
        servicePlan: dto.servicePlan,
      },
      include: this.includes(),
    });

    // 通知商务确认方案
    if (customer.ownerId) {
      this.notifications.create({
        type: 'tenant', title: '托管方案待确认', body: `客户【${customer.companyName}】的托管入档方案已生成，请确认服务方案`,
        receiverId: customer.ownerId, targetType: 'tenant', targetId: tr.id,
      }).catch(() => {});
    }

    return tr;
  }

  // 详情
  async findOne(id: number, user?: AuthUser) {
    const tr = await this.prisma.tenantRegister.findUnique({
      where: { id },
      include: this.includes(),
    });
    if (!tr) throw new NotFoundException(`托管入档 id=${id} 不存在`);
    if (user) {
      this.permissions.ensure(
        this.permissions.canReadTenant(user, tr),
        '无权限查看该托管入档',
      );
    }
    return tr;
  }

  // 查询
  async findByCustomer(customerId: number | undefined, user: AuthUser) {
    const where: any = this.permissions.tenantVisibleWhere(user);
    if (customerId) where.customerId = customerId;
    return this.prisma.tenantRegister.findMany({
      where,
      include: this.includes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  // 更新概况/方案（会计/主管/管理员）
  async update(id: number, dto: { enterpriseDetail?: any; servicePlan?: any }, user: AuthUser) {
    const tr = await this.findOne(id, user);
    this.permissions.ensure(
      this.permissions.canUpdateTenant(user, tr),
      '无权限修改该托管入档',
    );
    if (tr.planConfirmedByOwner) {
      throw new BadRequestException('服务方案已由主理人确认，不能再修改概况或方案');
    }
    return this.prisma.tenantRegister.update({
      where: { id },
      data: dto,
      include: this.includes(),
    });
  }

  // 主理人确认服务方案（所有登录角色，TODO: 限客户 ownerId）
  async confirmPlan(id: number, user: AuthUser) {
    const tr = await this.findOne(id, user);
    this.permissions.ensure(
      this.permissions.canConfirmTenantPlan(user, tr),
      '只有客户主理人或管理员可以确认托管方案',
    );

    if (tr.planConfirmedByOwner) {
      throw new BadRequestException('服务方案已经确认，无需重复确认');
    }
    if (!this.hasContent(tr.enterpriseDetail) || !this.hasContent(tr.servicePlan)) {
      throw new BadRequestException('企业概况和服务方案填写完整后才能确认');
    }

    const updated = await this.prisma.tenantRegister.update({
      where: { id },
      data: {
        planConfirmedByOwner: true,
        planConfirmedAt: new Date(),
      },
      include: this.includes(),
    });
    this.notifications.createForRole({
      type: 'tenant',
      title: '托管方案已确认',
      body: `客户【${updated.customer.companyName}】的托管方案已确认，请分派会计`,
      senderId: user.sub,
      roleTarget: '主管',
      targetType: 'tenant',
      targetId: id,
    }).catch(() => {});
    return updated;
  }

  // 分派会计（主管/管理员）
  async assignAccountant(id: number, accountantId: number) {
    const tr = await this.findOne(id);
    if (!tr.planConfirmedByOwner) {
      throw new BadRequestException('主理人尚未确认服务方案，不能分派会计');
    }
    if (tr.assignConfirmed) {
      throw new BadRequestException('会计已确认接收，不能重新分派');
    }
    if (tr.assignedAccountantId === accountantId) {
      throw new BadRequestException('该会计已经处于待确认分派状态');
    }

    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      include: { role: true },
    });
    if (!accountant) throw new NotFoundException(`用户 id=${accountantId} 不存在`);
    if (accountant.role.code !== '会计') {
      throw new BadRequestException(
        `分派会计必须是会计角色，用户 ${accountant.realName} 当前角色为"${accountant.role.code}"`,
      );
    }

    const updated = await this.prisma.tenantRegister.update({
      where: { id },
      data: {
        assignedAccountantId: accountantId,
        assignConfirmed: false,
        assignConfirmedAt: null,
      },
      include: this.includes(),
    });

    this.notifications.create({
      type: 'tenant', title: '托管分派', body: `你已被分配为客户【${updated.customer?.companyName || '—'}】的负责会计`,
      receiverId: accountantId, targetType: 'tenant', targetId: id,
    }).catch(() => {});

    return updated;
  }

  // 会计确认分派（会计/管理员）
  async confirmAssignment(id: number, userId: number, userRoleCode: string) {
    const tr = await this.findOne(id);

    if (!tr.assignedAccountantId) {
      throw new BadRequestException('尚未分派会计，无法确认');
    }
    if (!tr.planConfirmedByOwner) {
      throw new BadRequestException('主理人尚未确认服务方案，不能确认会计分派');
    }

    if (tr.assignConfirmed) {
      throw new BadRequestException('会计分派已经确认，无需重复确认');
    }

    // 如果是会计角色，必须是 assignedAccountantId 本人
    // TODO: 后续权限表补齐后调整权限规则
    if (userRoleCode === '会计' && userId !== tr.assignedAccountantId) {
      throw new ForbiddenException(
        '只有被分派的会计本人才能确认分派，或由管理员代确认',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenantRegister.update({
        where: { id },
        data: {
          assignConfirmed: true,
          assignConfirmedAt: new Date(),
        },
        include: this.includes(),
      });
      await this.customerLifecycle.sync(updated.customerId, tx);
      const ownerId = updated.customer.ownerId;
      if (ownerId) {
        await tx.notification.create({
          data: {
            type: 'tenant',
            title: '托管会计已接收',
            body: `客户【${updated.customer.companyName}】已由${updated.assignedAccountant?.realName || '分派会计'}确认接收，进入日常维护`,
            senderId: userId,
            receiverId: ownerId,
            targetType: 'tenant',
            targetId: id,
          },
        });
      }
      return updated;
    });
  }

  private hasContent(value: any) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private includes() {
    return {
      customer: { select: { id: true, companyName: true, customerCategory: true, ownerId: true } },
      assignedAccountant: { select: { id: true, realName: true } },
    };
  }
}
