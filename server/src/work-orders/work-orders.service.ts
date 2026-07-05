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
import { WorkOrderStatus } from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
  ) {}

  // 创建办件
  async create(dto: CreateWorkOrderDto, user: AuthUser) {
    // 验证服务项存在，并拿到 customerId
    const item = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceItemId },
      select: { id: true, customerId: true, serviceTemplate: { select: { serviceType: true } } },
    });
    if (!item) {
      throw new NotFoundException(`服务项 id=${dto.serviceItemId} 不存在`);
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id: item.customerId },
      include: { staffAssignment: true, tenantRegister: true },
    });
    this.permissions.ensure(
      !!customer && this.permissions.canReadCustomer(user, customer),
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
      await this.validateUser(dto.handlerId);
    }
    if (dto.receiptReceiverId) {
      await this.validateUser(dto.receiptReceiverId);
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

    const data: any = { ...dto };

    // status 变更为"办结"时自动写 completedAt
    if (dto.status === '办结' && wo.status !== '办结') {
      data.completedAt = new Date();
    }

    // 验证 handler/receiptReceiver 存在
    if (dto.handlerId) await this.validateUser(dto.handlerId);
    if (dto.receiptReceiverId) await this.validateUser(dto.receiptReceiverId);

    // TODO: 后续 WorkOrder status 变化可同步更新 ServiceItem.status，
    // 避免服务项状态和办件状态不一致。本期暂不联动。

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: this.includes(),
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

    const result = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: '已打卡',
        archiveFiles,
        checkedInAt: new Date(),
      },
      include: this.includes(),
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`用户 id=${userId} 不存在`);
  }

  private includes() {
    return {
      customer: { select: { id: true, companyName: true } },
      serviceItem: {
        select: {
          id: true,
          status: true,
          serviceTemplate: { select: { id: true, serviceType: true } },
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
          serviceTemplate: { select: { id: true, serviceType: true } },
        },
      },
      handler: { select: { id: true, realName: true } },
      receiptReceiver: { select: { id: true, realName: true } },
    };
  }
}
