import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  type: string;
  title: string;
  body: string;
  senderId?: number;
  receiverId?: number;
  roleTarget?: string;
  targetType?: string;
  targetId?: number;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input as any });
  }

  /** 给指定角色的所有用户各发一条 */
  async createForRole(input: CreateNotificationInput & { roleTarget: string }) {
    const users = await this.prisma.user.findMany({
      where: { role: { code: input.roleTarget as any } },
      select: { id: true },
    });
    if (users.length === 0) return [];
    const data = users.map((u) => ({
      type: input.type,
      title: input.title,
      body: input.body,
      senderId: input.senderId ?? null,
      receiverId: u.id,
      roleTarget: input.roleTarget,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
    }));
    return this.prisma.notification.createMany({ data: data as any });
  }

  async findAll(receiverId: number, limit = 50) {
    return this.prisma.notification.findMany({
      where: { receiverId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countUnread(receiverId: number) {
    return this.prisma.notification.count({
      where: { receiverId, isRead: false },
    });
  }

  async markRead(id: number, receiverId: number) {
    return this.prisma.notification.updateMany({
      where: { id, receiverId },
      data: { isRead: true },
    });
  }

  async markAllRead(receiverId: number) {
    return this.prisma.notification.updateMany({
      where: { receiverId, isRead: false },
      data: { isRead: true },
    });
  }
}
