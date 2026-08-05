import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  ItemStatus,
  WorkOrderStatus,
} from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';
import { CustomerLifecycleService } from '../customer-lifecycle/customer-lifecycle.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
    private readonly customerLifecycle: CustomerLifecycleService,
  ) {}

  // 创建办件
  async create(dto: CreateWorkOrderDto, user: AuthUser) {
    // 验证服务项存在，并拿到 customerId
    const item = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceItemId },
      select: {
        id: true,
        customerId: true,
        serviceTemplate: {
          select: { serviceType: true, requiredMaterials: true },
        },
      },
    });
    if (!item) {
      throw new NotFoundException(`服务项 id=${dto.serviceItemId} 不存在`);
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id: item.customerId },
      include: { staffAssignment: true, tenantRegister: true },
    });
    this.permissions.ensure(
      !!customer && this.permissions.canCreateWorkOrder(user, customer),
      '无权限为该服务项创建办件',
    );

    // 验证该服务项还没有办件
    const existing = await this.prisma.workOrder.findUnique({
      where: { serviceItemId: dto.serviceItemId },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: '该服务项已存在办件工单，请勿重复创建',
        error: 'Conflict',
        existingWorkOrder: {
          id: existing.id,
          customerId: existing.customerId,
          serviceItemId: existing.serviceItemId,
          status: existing.status,
          handlerId: existing.handlerId,
          receiptReceiverId: existing.receiptReceiverId,
          createdAt: existing.createdAt,
          serviceName: item.serviceTemplate.serviceType,
        },
      });
    }

    // 验证 handler 存在（如果传了）
    if (dto.handlerId) {
      await this.validateHandlerRole(
        dto.handlerId,
        item.serviceTemplate.serviceType,
        item.serviceTemplate.requiredMaterials,
      );
    }
    if (dto.receiptReceiverId) {
      await this.validateCustomerParticipant(dto.receiptReceiverId, customer!);
    }

    const wo = await this.prisma.workOrder.create({
      data: {
        customerId: item.customerId,
        serviceItemId: dto.serviceItemId,
        handlerId: dto.handlerId,
        receiptReceiverId: dto.receiptReceiverId,
      },
      include: this.includes(),
    });

    // 通知处理人（业务）
    if (dto.handlerId) {
      this.notifications.create({
        type: 'work_order',
        title: '新办件待处理',
        body: `客户【${customer?.companyName || '—'}】-【${item.serviceTemplate.serviceType}】的办件已分配给你`,
        senderId: user.sub,
        receiverId: dto.handlerId,
        targetType: 'work_order',
        targetId: wo.id,
      }).catch(() => {});
    }

    return wo;
  }

  // 列表
  async findAll(query: {
    customerId?: number;
    handlerId?: number;
    status?: WorkOrderStatus;
  }, user: AuthUser) {
    const where: any = this.permissions.workOrderVisibleWhere(user);
    if (query.customerId) where.customerId = query.customerId;
    if (query.handlerId) where.handlerId = query.handlerId;
    if (query.status) where.status = query.status;

    return this.prisma.workOrder.findMany({
      where,
      include: this.includes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  // 详情
  async findOne(id: number, user?: AuthUser) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: this.includesWithPermission(),
    });
    if (!wo) throw new NotFoundException(`办件 id=${id} 不存在`);
    if (user) {
      this.permissions.ensure(
        this.permissions.canReadWorkOrder(user, wo),
        '无权限访问该办件',
      );
    }
    return wo;
  }

  // 更新（不允许直接改"已打卡"）
  async update(id: number, dto: UpdateWorkOrderDto, user: AuthUser) {
    const wo = await this.findOne(id, user);
    this.permissions.ensure(
      this.permissions.canOperateWorkOrder(user, wo),
      '无权限处理该办件',
    );

    // 不允许 PATCH 把 status 直接改成"已打卡"
    if (dto.status === '已打卡') {
      throw new BadRequestException(
        '不允许直接修改为"已打卡"。请通过 POST /work-orders/:id/check-in 完成打卡',
      );
    }
    if (dto.status && dto.status !== wo.status) {
      const allowedNextStatus: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
        待办: '办件中',
        办件中: '办结',
      };
      if (allowedNextStatus[wo.status] !== dto.status) {
        throw new BadRequestException(
          `办件状态不能从“${wo.status}”直接变更为“${dto.status}”`,
        );
      }
    }

    const data: any = { ...dto };

    // status 变更为"办结"时自动写 completedAt
    if (dto.status === '办结' && wo.status !== '办结') {
      data.completedAt = new Date();
    }

    // 验证 handler/receiptReceiver 存在
    if (dto.handlerId) {
      await this.validateHandlerRole(
        dto.handlerId,
        wo.serviceItem?.serviceTemplate?.serviceType,
        wo.serviceItem?.serviceTemplate?.requiredMaterials,
      );
    }
    if (dto.receiptReceiverId) {
      await this.validateCustomerParticipant(dto.receiptReceiverId, wo.customer);
    }

    // TODO: 后续 WorkOrder status 变化可同步更新 ServiceItem.status，
    // 避免服务项状态和办件状态不一致。本期暂不联动。

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.update({
        where: { id },
        data,
        include: this.includes(),
      });
      if (dto.status) {
        await tx.serviceItem.update({
          where: { id: wo.serviceItemId },
          data: { status: this.toItemStatus(dto.status) },
        });
      }
      await this.customerLifecycle.sync(wo.customerId, tx);
      return result;
    });

    // 办结时通知商务
    if (dto.status === '办结' && wo.customer?.ownerId) {
      const svcType = wo.serviceItem?.serviceTemplate?.serviceType || '—';
      this.notifications.create({
        type: 'work_order',
        title: '办件已办结',
        body: `客户【${wo.customer?.companyName || '—'}】-【${svcType}】的办件已办结`,
        senderId: user.sub,
        receiverId: wo.customer.ownerId,
        targetType: 'work_order',
        targetId: id,
      }).catch(() => {});
    }

    return updated;
  }

  // 办结打卡 —— 必须传 archiveFiles，且当前 status 必须是"办结"
  async checkIn(id: number, archiveFiles: any[], user: AuthUser) {
    const wo = await this.findOne(id, user);
    this.permissions.ensure(
      this.permissions.canOperateWorkOrder(user, wo),
      '无权限打卡该办件',
    );

    if (wo.status !== '办结') {
      throw new BadRequestException(
        `当前状态为"${wo.status}"，只有"办结"状态才能打卡`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id },
        data: {
          status: '已打卡',
          archiveFiles,
          checkedInAt: new Date(),
        },
        include: this.includes(),
      });
      await tx.serviceItem.update({
        where: { id: wo.serviceItemId },
        data: { status: '办结' },
      });
      await this.customerLifecycle.sync(wo.customerId, tx);
      return updated;
    });

    // 通知商务
    if (wo.customer?.ownerId) {
      const svcType = wo.serviceItem?.serviceTemplate?.serviceType || '—';
      this.notifications.create({
        type: 'work_order',
        title: '办件已归档',
        body: `客户【${wo.customer?.companyName || '—'}】-【${svcType}】的办件已归档`,
        senderId: user.sub,
        receiverId: wo.customer.ownerId,
        targetType: 'work_order',
        targetId: id,
      }).catch(() => {});
    }

    return result;
  }

  // ---- helpers ----

  private async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`用户 id=${userId} 不存在`);
    return user;
  }

  private toItemStatus(status: WorkOrderStatus): ItemStatus {
    return status === '已打卡' ? '办结' : status;
  }

  private async validateHandlerRole(
    userId: number,
    serviceType?: string,
    requiredMaterials?: unknown,
  ) {
    const handler = await this.validateUser(userId);
    const responsibleRole = this.resolveResponsibleRole(
      serviceType,
      requiredMaterials,
    );

    const isFallbackOperator = ['主管', '管理员'].includes(handler.role.code);
    if (
      responsibleRole &&
      handler.role.code !== responsibleRole &&
      !isFallbackOperator
    ) {
      throw new BadRequestException(
        `“${serviceType || '该服务'}”应由${responsibleRole}角色办理，不能指派给${handler.role.code}角色`,
      );
    }
  }

  private async validateCustomerParticipant(userId: number, customer: any) {
    await this.validateUser(userId);
    const allowedIds = new Set(
      [
        customer?.ownerId,
        customer?.staffAssignment?.businessStaffId,
        customer?.staffAssignment?.accountantId,
        customer?.staffAssignment?.consultantId,
        customer?.staffAssignment?.generalAffairsId,
      ].filter((id) => id != null),
    );
    if (!allowedIds.has(userId)) {
      throw new BadRequestException('回执接收人必须是该客户已配置的相关人员');
    }
  }

  private resolveResponsibleRole(
    serviceType?: string,
    requiredMaterials?: unknown,
  ): string | undefined {
    if (
      requiredMaterials &&
      !Array.isArray(requiredMaterials) &&
      typeof requiredMaterials === 'object'
    ) {
      const role = (requiredMaterials as Record<string, unknown>).responsibleRole;
      if (typeof role === 'string' && role) return role;
    }

    const legacyRoleMap: Record<string, string> = {
      注册: '业务',
      地址: '商务',
      开户: '业务',
      变更: '业务',
      注销: '会计',
      代理: '业务',
      社保: '会计',
      公积金: '会计',
      进出口备案: '业务',
      食品证: '业务',
      道路运输证: '业务',
      卫生证: '业务',
      代理记账: '会计',
      财务外包: '会计',
      合规项目: '会计',
    };
    return serviceType ? legacyRoleMap[serviceType] : undefined;
  }

  private includes() {
    return {
      customer: { select: { id: true, companyName: true } },
      serviceItem: {
        select: {
          id: true,
          status: true,
          serviceTemplate: {
            select: {
              id: true,
              serviceType: true,
              requiredMaterials: true,
            },
          },
        },
      },
      handler: { select: { id: true, realName: true } },
      receiptReceiver: { select: { id: true, realName: true } },
    };
  }

  private includesWithPermission() {
    return {
      customer: {
        include: {
          staffAssignment: true,
          tenantRegister: true,
        },
      },
      serviceItem: {
        select: {
          id: true,
          status: true,
          serviceTemplate: {
            select: {
              id: true,
              serviceType: true,
              requiredMaterials: true,
            },
          },
        },
      },
      handler: { select: { id: true, realName: true } },
      receiptReceiver: { select: { id: true, realName: true } },
    };
  }
}
