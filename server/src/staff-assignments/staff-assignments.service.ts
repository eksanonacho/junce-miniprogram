import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class StaffAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // 创建或更新人员配置（PUT upsert）
  async upsert(
    customerId: number,
    data: {
      businessStaffId?: number;
      accountantId?: number;
      consultantId?: number;
      generalAffairsId?: number;
    },
    user: AuthUser,
  ) {
    // 验证客户存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${customerId} 不存在`);
    }
    this.permissions.ensure(
      this.permissions.canConfigureStaff(user, customer),
      '无权限配置该客户人员',
    );

    // 角色校验
    await this.validateRole(data.businessStaffId, ['商务', '业务'], '业务岗');
    await this.validateRole(data.accountantId, ['会计'], '会计岗');
    // consultantId 本期可空，跳过校验。TODO: 客户确认后补角色校验
    await this.validateRole(data.generalAffairsId, ['总务'], '总务岗');

    const upsertData: any = {};

    if (data.businessStaffId !== undefined)
      upsertData.businessStaffId = data.businessStaffId;
    if (data.accountantId !== undefined)
      upsertData.accountantId = data.accountantId;
    if (data.consultantId !== undefined)
      upsertData.consultantId = data.consultantId;
    if (data.generalAffairsId !== undefined)
      upsertData.generalAffairsId = data.generalAffairsId;

    const result = await this.prisma.staffAssignment.upsert({
      where: { customerId },
      update: upsertData,
      create: { customerId, ...upsertData },
      include: {
        businessStaff: { select: { id: true, realName: true, role: { select: { code: true } } } },
        accountant: { select: { id: true, realName: true, role: { select: { code: true } } } },
        consultant: { select: { id: true, realName: true, role: { select: { code: true } } } },
        generalAffairs: { select: { id: true, realName: true, role: { select: { code: true } } } },
      },
    });
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { intakeSubmittedAt: null },
      }),
      this.prisma.intakeAssignmentConfirmation.deleteMany({
        where: { customerId },
      }),
    ]);
    return result;
  }

  // 查客户的人员配置
  async findByCustomer(customerId: number, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { staffAssignment: true, tenantRegister: true },
    });
    if (!customer) {
      throw new NotFoundException(`客户 id=${customerId} 不存在`);
    }
    this.permissions.ensure(
      this.permissions.canReadCustomer(user, customer),
      '无权限查看该客户人员配置',
    );

    const assignment = await this.prisma.staffAssignment.findUnique({
      where: { customerId },
      include: {
        businessStaff: { select: { id: true, realName: true } },
        accountant: { select: { id: true, realName: true } },
        consultant: { select: { id: true, realName: true } },
        generalAffairs: { select: { id: true, realName: true } },
      },
    });

    return assignment;
  }

  // ---- 角色校验 ----
  private async validateRole(
    userId: number | undefined,
    allowedRoleCodes: string[],
    positionName: string,
  ) {
    if (userId === undefined) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`用户 id=${userId} 不存在`);
    }

    if (!allowedRoleCodes.includes(user.role.code)) {
      throw new BadRequestException(
        `${positionName} 需要 [${allowedRoleCodes.join('、')}] 角色，用户 ${user.realName} 当前角色为 ${user.role.code}`,
      );
    }
  }
}
