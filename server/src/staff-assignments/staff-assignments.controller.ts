import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { StaffAssignmentsService } from './staff-assignments.service';
import { UpsertStaffAssignmentDto } from './dto/upsert-staff-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../permissions/permissions.service';
// TODO: 客户权限表补充后，人员配置限商务岗/管理员
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class StaffAssignmentsController {
  constructor(
    private readonly staffAssignmentsService: StaffAssignmentsService,
  ) {}

  // PUT /customers/:customerId/staff-assignment
  @Put(':customerId/staff-assignment')
  async upsert(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: UpsertStaffAssignmentDto,
    @Request() req: any,
  ) {
    return this.staffAssignmentsService.upsert(customerId, dto, req.user as AuthUser);
  }

  // GET /customers/:customerId/staff-assignment
  @Get(':customerId/staff-assignment')
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    return this.staffAssignmentsService.findByCustomer(customerId, req.user as AuthUser);
  }
}
