import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ManualDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== 经营看板 ==========

  async createBusiness(dto: { month: string; revenueAmount: number; costAmount: number; note?: string }, userId: number) {
    return this.prisma.manualBusinessReport.create({
      data: {
        month: dto.month,
        revenueAmount: dto.revenueAmount,
        costAmount: dto.costAmount,
        profitAmount: dto.revenueAmount - dto.costAmount,
        note: dto.note,
        createdById: userId,
      },
      include: this.businessInclude(),
    });
  }

  async findBusiness(month?: string) {
    const where: any = {};
    if (month) where.month = month;
    const rows = await this.prisma.manualBusinessReport.findMany({ where, include: this.businessInclude(), orderBy: { createdAt: 'desc' } });
    return rows.map(r => ({ ...r, revenueAmount: Number(r.revenueAmount), costAmount: Number(r.costAmount), profitAmount: Number(r.profitAmount) }));
  }

  async businessSummary(month: string) {
    const result = await this.prisma.manualBusinessReport.aggregate({
      where: { month },
      _sum: { revenueAmount: true, costAmount: true, profitAmount: true },
      _count: true,
    });
    return {
      month,
      totalRevenue: Number(result._sum.revenueAmount || 0),
      totalCost: Number(result._sum.costAmount || 0),
      totalProfit: Number(result._sum.profitAmount || 0),
      recordCount: result._count,
    };
  }

  async updateBusiness(id: number, dto: { revenueAmount?: number; costAmount?: number; note?: string }) {
    const row = await this.prisma.manualBusinessReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`经营记录 id=${id} 不存在`);

    const revenue = dto.revenueAmount !== undefined ? dto.revenueAmount : Number(row.revenueAmount);
    const cost = dto.costAmount !== undefined ? dto.costAmount : Number(row.costAmount);
    const data: any = { profitAmount: revenue - cost };
    if (dto.revenueAmount !== undefined) data.revenueAmount = dto.revenueAmount;
    if (dto.costAmount !== undefined) data.costAmount = dto.costAmount;
    if (dto.note !== undefined) data.note = dto.note;

    const updated = await this.prisma.manualBusinessReport.update({ where: { id }, data, include: this.businessInclude() });
    return { ...updated, revenueAmount: Number(updated.revenueAmount), costAmount: Number(updated.costAmount), profitAmount: Number(updated.profitAmount) };
  }

  // ========== 工资看板 ==========

  async createSalary(dto: { month: string; userId: number; baseSalary?: number; commission?: number; bonus?: number; deduction?: number; socialInsurance?: number; note?: string }, createdById: number) {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`用户 id=${dto.userId} 不存在`);

    // 唯一约束
    const existing = await this.prisma.manualSalaryReport.findUnique({ where: { unique_month_user: { month: dto.month, userId: dto.userId } } });
    if (existing) throw new ConflictException('该员工在该月份已有工资记录，请使用 PATCH 修改');

    const base = dto.baseSalary ?? 0;
    const comm = dto.commission ?? 0;
    const bon = dto.bonus ?? 0;
    const ded = dto.deduction ?? 0;
    const si = dto.socialInsurance ?? 0;

    return this.prisma.manualSalaryReport.create({
      data: {
        month: dto.month, userId: dto.userId,
        baseSalary: base, commission: comm, bonus: bon, deduction: ded, socialInsurance: si,
        totalAmount: base + comm + bon - ded - si,
        note: dto.note, createdById,
      },
      include: this.salaryInclude(),
    });
  }

  async findSalary(month?: string) {
    const where: any = {};
    if (month) where.month = month;
    const rows = await this.prisma.manualSalaryReport.findMany({ where, include: this.salaryInclude(), orderBy: { createdAt: 'desc' } });
    return rows.map(r => ({
      ...r, baseSalary: Number(r.baseSalary), commission: Number(r.commission), bonus: Number(r.bonus),
      deduction: Number(r.deduction), socialInsurance: Number(r.socialInsurance), totalAmount: Number(r.totalAmount),
    }));
  }

  async salarySummary(month: string) {
    const result = await this.prisma.manualSalaryReport.aggregate({
      where: { month },
      _sum: { baseSalary: true, commission: true, bonus: true, deduction: true, socialInsurance: true, totalAmount: true },
      _count: true,
    });
    return {
      month,
      totalBaseSalary: Number(result._sum.baseSalary || 0),
      totalCommission: Number(result._sum.commission || 0),
      totalBonus: Number(result._sum.bonus || 0),
      totalDeduction: Number(result._sum.deduction || 0),
      totalSocialInsurance: Number(result._sum.socialInsurance || 0),
      totalAmount: Number(result._sum.totalAmount || 0),
      recordCount: result._count,
    };
  }

  async updateSalary(id: number, dto: { baseSalary?: number; commission?: number; bonus?: number; deduction?: number; socialInsurance?: number; note?: string }) {
    const row = await this.prisma.manualSalaryReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`工资记录 id=${id} 不存在`);

    const base = dto.baseSalary !== undefined ? dto.baseSalary : Number(row.baseSalary);
    const comm = dto.commission !== undefined ? dto.commission : Number(row.commission);
    const bon = dto.bonus !== undefined ? dto.bonus : Number(row.bonus);
    const ded = dto.deduction !== undefined ? dto.deduction : Number(row.deduction);
    const si = dto.socialInsurance !== undefined ? dto.socialInsurance : Number(row.socialInsurance);

    const data: any = { totalAmount: base + comm + bon - ded - si };
    if (dto.baseSalary !== undefined) data.baseSalary = dto.baseSalary;
    if (dto.commission !== undefined) data.commission = dto.commission;
    if (dto.bonus !== undefined) data.bonus = dto.bonus;
    if (dto.deduction !== undefined) data.deduction = dto.deduction;
    if (dto.socialInsurance !== undefined) data.socialInsurance = dto.socialInsurance;
    if (dto.note !== undefined) data.note = dto.note;

    const updated = await this.prisma.manualSalaryReport.update({ where: { id }, data, include: this.salaryInclude() });
    return { ...updated, baseSalary: Number(updated.baseSalary), commission: Number(updated.commission), bonus: Number(updated.bonus), deduction: Number(updated.deduction), socialInsurance: Number(updated.socialInsurance), totalAmount: Number(updated.totalAmount) };
  }

  private businessInclude() { return { createdBy: { select: { id: true, realName: true } } }; }
  private salaryInclude() { return { createdBy: { select: { id: true, realName: true } }, user: { select: { id: true, realName: true } } }; }
}
