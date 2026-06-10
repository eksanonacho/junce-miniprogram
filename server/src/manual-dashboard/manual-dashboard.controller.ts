import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ManualDashboardService } from './manual-dashboard.service';
import { CreateBusinessReportDto, UpdateBusinessReportDto } from './dto/business-report.dto';
import { CreateSalaryReportDto, UpdateSalaryReportDto } from './dto/salary-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('manual-dashboard')
@UseGuards(JwtAuthGuard)
export class ManualDashboardController {
  constructor(private readonly svc: ManualDashboardService) {}

  // ========== 经营看板 ==========

  // POST — 总务+管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Post('business-reports')
  createBusiness(@Body() dto: CreateBusinessReportDto, @Req() req: any) {
    return this.svc.createBusiness(dto, req.user.sub);
  }

  // GET — 主管+总务+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '总务', '管理员')
  @Get('business-reports')
  findBusiness(@Query('month') month?: string) {
    return this.svc.findBusiness(month);
  }

  // GET summary — 主管+总务+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '总务', '管理员')
  @Get('business-reports/summary')
  businessSummary(@Query('month') month: string) {
    return this.svc.businessSummary(month);
  }

  // PATCH — 总务+管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Patch('business-reports/:id')
  updateBusiness(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusinessReportDto) {
    return this.svc.updateBusiness(id, dto);
  }

  // ========== 工资看板 ==========

  // POST — 总务+管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Post('salary-reports')
  createSalary(@Body() dto: CreateSalaryReportDto, @Req() req: any) {
    return this.svc.createSalary(dto, req.user.sub);
  }

  // GET — 主管+总务+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '总务', '管理员')
  @Get('salary-reports')
  findSalary(@Query('month') month?: string) {
    return this.svc.findSalary(month);
  }

  // GET summary — 主管+总务+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '总务', '管理员')
  @Get('salary-reports/summary')
  salarySummary(@Query('month') month: string) {
    return this.svc.salarySummary(month);
  }

  // PATCH — 总务+管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Patch('salary-reports/:id')
  updateSalary(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSalaryReportDto) {
    return this.svc.updateSalary(id, dto);
  }
}
