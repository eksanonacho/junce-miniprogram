import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { Prisma } from '../../generated/prisma/client';
import { AuthUser, PermissionService } from '../permissions/permissions.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  // 新建客户。ownerId 来自登录用户的 JWT，不允许前端传
  async create(dto: CreateCustomerDto, user: AuthUser) {
    this.permissions.ensure(
      this.permissions.canCreateCustomer(user),
      '只有商务或管理员可以创建客户',
    );

    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        ownerId: user.sub,
        // registerDate 是前端传的 ISO 字符串，转为 Date
        registerDate: dto.registerDate ? new Date(dto.registerDate) : undefined,
      },
      include: { owner: { select: { id: true, realName: true } } },
    });
    return this.serializeDecimal(customer);
  }

  // 客户列表，支持筛选和搜索
  async findAll(query: QueryCustomerDto, user: AuthUser) {
    const where: Prisma.CustomerWhereInput = this.permissions.customerVisibleWhere(user);

    if (query.tier) {
      where.tier = query.tier;
    }
    if (query.lifecycleStage) {
      where.lifecycleStage = query.lifecycleStage;
    }
    if (query.keyword) {
      where.companyName = { contains: query.keyword };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: { owner: { select: { id: true, realName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => this.serializeDecimal(c));
  }

  // 客户详情
  async findOne(id: number, user?: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, realName: true } },
        staffAssignment: true,
        tenantRegister: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`客户 id=${id} 不存在`);
    }

    if (user) {
      this.permissions.ensure(
        this.permissions.canReadCustomer(user, customer),
        '无权限访问该客户',
      );
    }

    return this.serializeDecimal(customer);
  }

  // 修改客户
  async update(id: number, dto: UpdateCustomerDto, user: AuthUser) {
    // 先确认存在
    const customer = await this.findOne(id, user);
    this.permissions.ensure(
      this.permissions.canUpdateCustomer(user, customer),
      '无权限修改该客户',
    );

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        registerDate: dto.registerDate ? new Date(dto.registerDate) : undefined,
        intakeSubmittedAt: null,
      },
      include: { owner: { select: { id: true, realName: true } } },
    });
    await this.prisma.intakeAssignmentConfirmation.deleteMany({
      where: { customerId: id },
    });

    return this.serializeDecimal(updated);
  }

  async getIntakeStatus(id: number, user: AuthUser) {
    const customer = await this.findIntakeCustomer(id);
    this.permissions.ensure(
      this.permissions.canReadCustomer(user, customer),
      '无权限查看该客户提单状态',
    );
    return this.buildIntakeStatus(customer, user);
  }

  async submitIntake(id: number, user: AuthUser) {
    const customer = await this.findIntakeCustomer(id);
    this.permissions.ensure(
      this.permissions.canUpdateCustomer(user, customer),
      '只有客户主理人或管理员可以正式提交提单',
    );

    const status = this.buildIntakeStatus(customer, user);
    if (!status.ready) {
      throw new BadRequestException({
        statusCode: 400,
        message: '提单资料不完整，请先完成缺失项目',
        missingItems: status.missingItems,
      });
    }
    if (customer.intakeSubmittedAt) {
      throw new ConflictException('该客户提单已经正式提交');
    }

    const assignments = this.assignmentEntries(customer.staffAssignment);
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { intakeSubmittedAt: new Date() },
      });
      await tx.intakeAssignmentConfirmation.deleteMany({
        where: { customerId: id },
      });
      if (assignments.length > 0) {
        await tx.notification.createMany({
          data: assignments.map((assignment) => ({
            type: 'customer_intake',
            title: '新客户提单待确认',
            body: `客户【${customer.companyName}】已完成提单，你被指派为${assignment.position}，请确认接单`,
            senderId: user.sub,
            receiverId: assignment.user.id,
            targetType: 'customer',
            targetId: id,
          })),
        });
      }
    });

    return this.getIntakeStatus(id, user);
  }

  async confirmIntakeAssignment(id: number, user: AuthUser) {
    const customer = await this.findIntakeCustomer(id);
    this.permissions.ensure(
      this.permissions.canReadCustomer(user, customer),
      '无权限确认该客户提单',
    );
    if (!customer.intakeSubmittedAt) {
      throw new BadRequestException('客户提单尚未正式提交');
    }

    const myAssignments = this.assignmentEntries(
      customer.staffAssignment,
    ).filter((assignment) => assignment.user.id === user.sub);
    if (myAssignments.length === 0) {
      throw new BadRequestException('当前用户不是该客户被指派的岗位人员');
    }

    await this.prisma.$transaction(
      myAssignments.map((assignment) =>
        this.prisma.intakeAssignmentConfirmation.upsert({
          where: {
            unique_intake_assignment_confirmation: {
              customerId: id,
              userId: user.sub,
              position: assignment.position,
            },
          },
          update: { confirmedAt: new Date() },
          create: {
            customerId: id,
            userId: user.sub,
            position: assignment.position,
          },
        }),
      ),
    );
    return this.getIntakeStatus(id, user);
  }

  // ---- helpers ----

  /**
   * 把 Prisma.Decimal 转成 JS number，否则 JSON 序列化会变成 { "$numberDecimal": "..." }
   * Decimal(12,2) 的值完整在 JS number 安全范围内（最大 9999999999.99 < 2^53）
   */
  private serializeDecimal<T>(obj: T): T {
    const result = { ...obj } as any;
    if (result.annualRevenue !== null && result.annualRevenue !== undefined) {
      result.annualRevenue = Number(result.annualRevenue.toString());
    }
    return result as T;
  }

  private async findIntakeCustomer(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, realName: true } },
        serviceItems: {
          include: {
            serviceTemplate: {
              select: {
                id: true,
                serviceType: true,
                requiredMaterials: true,
              },
            },
          },
        },
        staffAssignment: {
          include: {
            businessStaff: { select: { id: true, realName: true } },
            accountant: { select: { id: true, realName: true } },
            consultant: { select: { id: true, realName: true } },
            generalAffairs: { select: { id: true, realName: true } },
          },
        },
        charge: { select: { id: true, chargeMode: true, amount: true } },
        intakeConfirmations: {
          include: {
            user: { select: { id: true, realName: true } },
          },
        },
      },
    });
    if (!customer) throw new NotFoundException(`客户 id=${id} 不存在`);

    // Prisma 不能在静态 include 中引用同一行 ownerId，查询后只保留主理人的阅读确认。
    (customer as any).readConfirmations = await this.prisma.serviceReadConfirmation.findMany({
      where: { customerId: id, userId: customer.ownerId },
      select: { templateId: true, userId: true },
    });
    return customer as any;
  }

  private buildIntakeStatus(customer: any, user: AuthUser) {
    const profileFields = [
      ['companyType', '公司类型'],
      ['industry', '行业'],
      ['registerDate', '注册日期'],
      ['taxType', '税务类型'],
      ['region', '区域'],
      ['annualRevenue', '年流水'],
      ['staffCount', '人员数'],
    ] as const;
    const missingItems = profileFields
      .filter(([field]) => customer[field] === null || customer[field] === '')
      .map(([, label]) => `企业画像：${label}`);

    if (customer.serviceItems.length === 0) {
      missingItems.push('至少选择一项服务');
    }
    if (!customer.staffAssignment?.businessStaffId) {
      missingItems.push('配置业务岗');
    }
    if (!customer.staffAssignment?.accountantId) {
      missingItems.push('配置会计岗');
    }
    if (!customer.staffAssignment?.generalAffairsId) {
      missingItems.push('配置总务岗');
    }
    if (!customer.charge) {
      missingItems.push('创建收费记录');
    }

    const confirmedTemplateIds = new Set(
      customer.readConfirmations.map((confirmation: any) => confirmation.templateId),
    );
    const unreadServices = customer.serviceItems
      .filter(
        (item: any) => !confirmedTemplateIds.has(item.serviceTemplateId),
      )
      .map((item: any) => item.serviceTemplate.serviceType);
    if (unreadServices.length > 0) {
      missingItems.push(`主理人阅读确认服务：${unreadServices.join('、')}`);
    }

    const assignments = this.assignmentEntries(customer.staffAssignment);
    const confirmationMap = new Map(
      customer.intakeConfirmations.map((confirmation: any) => [
        `${confirmation.userId}:${confirmation.position}`,
        confirmation,
      ]),
    );
    const assignmentConfirmations = assignments.map((assignment) => {
      const confirmation = confirmationMap.get(
        `${assignment.user.id}:${assignment.position}`,
      ) as any;
      return {
        position: assignment.position,
        user: assignment.user,
        confirmed: !!confirmation,
        confirmedAt: confirmation?.confirmedAt ?? null,
      };
    });
    const myAssignments = assignmentConfirmations.filter(
      (assignment) => assignment.user.id === user.sub,
    );

    return {
      customerId: customer.id,
      ready: missingItems.length === 0,
      submitted: !!customer.intakeSubmittedAt,
      submittedAt: customer.intakeSubmittedAt,
      missingItems,
      assignmentConfirmations,
      allAssignmentsConfirmed:
        assignmentConfirmations.length > 0 &&
        assignmentConfirmations.every((assignment) => assignment.confirmed),
      canSubmit:
        !customer.intakeSubmittedAt &&
        this.permissions.canUpdateCustomer(user, customer),
      canConfirm:
        !!customer.intakeSubmittedAt &&
        myAssignments.some((assignment) => !assignment.confirmed),
    };
  }

  private assignmentEntries(assignment: any) {
    if (!assignment) return [];
    return [
      { position: '业务岗', user: assignment.businessStaff },
      { position: '会计岗', user: assignment.accountant },
      { position: '顾问岗', user: assignment.consultant },
      { position: '总务岗', user: assignment.generalAffairs },
    ].filter((entry) => entry.user);
  }
}
