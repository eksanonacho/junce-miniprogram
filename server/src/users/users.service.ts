import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleCode } from '../../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(roleCode?: RoleCode) {
    const where: any = {};
    if (roleCode) {
      where.role = { code: roleCode };
    }

    return this.prisma.user.findMany({
      where,
      // 严格排除 passwordHash，不返回任何敏感字段
      select: {
        id: true,
        username: true,
        realName: true,
        phone: true,
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      // 稳定排序：按 roleId, id 升序
      orderBy: [{ roleId: 'asc' }, { id: 'asc' }],
    });
  }
}
