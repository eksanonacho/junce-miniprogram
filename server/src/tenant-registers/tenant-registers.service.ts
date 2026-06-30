import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class TenantRegistersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // 创建（会计/主管/管理员）
  async create(dto: { customerId: number; enterpriseDetail?: any; servicePlan?: any }) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException(`客户 id=${dto.customerId} 不存在`);

    // 必须是代理户
    if (customer.customerCategory !== '代理户') {
      throw new BadRequestException(
        `只有代理户才能创建托管入档，当前客户类别为"${customer.customerCategory}"`,
      );
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

    return this.prisma.tenantRegister.create({
      data: {
        customerId: dto.customerId,
        enterpriseDetail: dto.enterpriseDetail,
        servicePlan: dto.servicePlan,
      },
      include: this.includes(),
    });
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

    return this.prisma.tenantRegister.update({
      where: { id },
      data: {
        planConfirmedByOwner: true,
        planConfirmedAt: new Date(),
      },
      include: this.includes(),
    });
  }

  // 分派会计（主管/管理员）
  async assignAccountant(id: number, accountantId: number) {
    await this.findOne(id);

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

    return this.prisma.tenantRegister.update({
      where: { id },
      data: { assignedAccountantId: accountantId },
      include: this.includes(),
    });
  }

  // 会计确认分派（会计/管理员）
  async confirmAssignment(id: number, userId: number, userRoleCode: string) {
    const tr = await this.findOne(id);

    if (!tr.assignedAccountantId) {
      throw new BadRequestException('尚未分派会计，无法确认');
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

    return this.prisma.tenantRegister.update({
      where: { id },
      data: {
        assignConfirmed: true,
        assignConfirmedAt: new Date(),
      },
      include: this.includes(),
    });
  }

  private includes() {
    return {
      customer: { select: { id: true, companyName: true, customerCategory: true, ownerId: true } },
      assignedAccountant: { select: { id: true, realName: true } },
    };
  }
}
