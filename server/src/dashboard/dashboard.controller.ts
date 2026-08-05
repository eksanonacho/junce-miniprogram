import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('主管', '管理员')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  overview() {
    return this.dashboardService.overview();
  }

  @Get('customers')
  customers() {
    return this.dashboardService.customers();
  }

  @Get('services')
  services() {
    return this.dashboardService.services();
  }

  @Get('tasks')
  tasks() {
    return this.dashboardService.tasks();
  }

  @Get('charges')
  charges() {
    return this.dashboardService.charges();
  }

  @Get('accounting')
  accounting() {
    return this.dashboardService.accounting();
  }
}
