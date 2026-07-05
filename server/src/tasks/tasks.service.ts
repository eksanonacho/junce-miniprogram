import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskStatus } from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly notifications: NotificationsService,
  ) {}

  // 创建任务（主管/管理员）
  async create(
    dto: { title: string; content?: string; toUserId: number; customerId?: number; deadline: string },
    fromUserId: number,
  ) {
    await this.validateToUser(dto.toUserId);
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        content: dto.content,
        fromUserId,
        toUserId: dto.toUserId,
        customerId: dto.customerId,
        deadline: new Date(dto.deadline),
        status: '待确认',
      },
      include: this.includes(),
    });

    this.notifications.create({
      type: 'task', title: '新任务', body: `新任务：【${dto.title}】，截止【${dto.deadline || '未设'}】`,
      senderId: fromUserId, receiverId: dto.toUserId, targetType: 'task', targetId: task.id,
    }).catch(() => {});

    return task;
  }

  // 列表
  async findAll(query: { status?: TaskStatus; fromUserId?: number; toUserId?: number }, user: AuthUser) {
    const where: any = this.permissions.taskVisibleWhere(user);
    if (query.status) where.status = query.status;
    if (query.fromUserId) where.fromUserId = query.fromUserId;
    if (query.toUserId) where.toUserId = query.toUserId;

    return this.prisma.task.findMany({
      where,
      include: this.includes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  // 详情
  async findOne(id: number, user?: AuthUser) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: this.includes() });
    if (!task) throw new NotFoundException(`任务 id=${id} 不存在`);
    if (user) {
      this.permissions.ensure(
        this.permissions.canReadTask(user, task),
        '无权限查看该任务',
      );
    }
    return task;
  }

  // 更新（主管/管理员），不允许改状态
  async update(id: number, dto: any) {
    await this.findOne(id);
    if (dto.toUserId) await this.validateToUser(dto.toUserId);
    if (dto.customerId !== undefined) {
      if (dto.customerId) {
        const c = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
        if (!c) throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);
      }
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.toUserId !== undefined) data.toUserId = dto.toUserId;
    if (dto.customerId !== undefined) data.customerId = dto.customerId;
    if (dto.deadline !== undefined) data.deadline = new Date(dto.deadline);

    return this.prisma.task.update({
      where: { id },
      data,
      include: this.includes(),
    });
  }

  // 确认任务
  async confirm(id: number, userId: number, roleCode: string) {
    const task = await this.findOne(id);

    if (task.status !== '待确认') {
      throw new BadRequestException(`当前状态为"${task.status}"，只有"待确认"状态才能确认`);
    }

    this.ensureActor(task.toUserId, userId, roleCode, '确认');

    const result = await this.prisma.task.update({
      where: { id },
      data: {
        status: '进行中',
        confirmedAt: new Date(),
        confirmedById: userId,
      },
      include: this.includes(),
    });

    this.notifications.create({
      type: 'task', title: '任务已确认', body: `任务【${task.title}】已被确认`,
      senderId: userId, receiverId: task.fromUserId, targetType: 'task', targetId: id,
    }).catch(() => {});

    return result;
  }

  // 完成任务
  async complete(id: number, userId: number, roleCode: string) {
    const task = await this.findOne(id);

    if (task.status !== '进行中') {
      throw new BadRequestException(`当前状态为"${task.status}"，只有"进行中"状态才能完成`);
    }

    this.ensureActor(task.toUserId, userId, roleCode, '完成');

    const result = await this.prisma.task.update({
      where: { id },
      data: {
        status: '已完成',
        completedAt: new Date(),
        completedById: userId,
      },
      include: this.includes(),
    });

    this.notifications.create({
      type: 'task', title: '任务已完成', body: `任务【${task.title}】已完成`,
      senderId: userId, receiverId: task.fromUserId, targetType: 'task', targetId: id,
    }).catch(() => {});

    return result;
  }

  // ---- helpers ----

  private async validateToUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`用户 id=${userId} 不存在`);
  }

  private ensureActor(toUserId: number, userId: number, roleCode: string, action: string) {
    if (userId !== toUserId && roleCode !== '管理员') {
      throw new ForbiddenException(
        `只有被指派人本人或管理员才能${action}任务`,
      );
    }
  }

  private includes() {
    return {
      fromUser: { select: { id: true, realName: true } },
      toUser: { select: { id: true, realName: true } },
      confirmer: { select: { id: true, realName: true } },
      completer: { select: { id: true, realName: true } },
      customer: { select: { id: true, companyName: true } },
    };
  }
}
