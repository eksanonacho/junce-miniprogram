import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { TenantRegistersService } from './tenant-registers.service';
import { CreateTenantRegisterDto } from './dto/create-tenant-register.dto';
import { UpdateTenantRegisterDto } from './dto/update-tenant-register.dto';
import { AssignAccountantDto } from './dto/assign-accountant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../permissions/permissions.service';

@Controller('tenant-registers')
@UseGuards(JwtAuthGuard)
export class TenantRegistersController {
  constructor(
    private readonly tenantRegistersService: TenantRegistersService,
  ) {}

  // POST /tenant-registers  —— 会计/主管/管理员
  @UseGuards(RolesGuard)
  @Roles('会计', '主管', '管理员')
  @Post()
  async create(@Body() dto: CreateTenantRegisterDto) {
    return this.tenantRegistersService.create(dto);
  }

  // GET /tenant-registers?customerId=X
  @Get()
  async findAll(@Query('customerId') customerId: string | undefined, @Request() req: any) {
    return this.tenantRegistersService.findByCustomer(
      customerId ? parseInt(customerId) : undefined,
      req.user as AuthUser,
    );
  }

  // GET /tenant-registers/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tenantRegistersService.findOne(id, req.user as AuthUser);
  }

  // PATCH /tenant-registers/:id  —— 会计/主管/管理员，只改 enterpriseDetail/servicePlan
  @UseGuards(RolesGuard)
  @Roles('会计', '主管', '管理员')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantRegisterDto,
    @Request() req: any,
  ) {
    return this.tenantRegistersService.update(id, dto, req.user as AuthUser);
  }

  // POST /tenant-registers/:id/confirm-plan  —— 所有登录角色
  // TODO: 后续权限表补齐后，应限制为客户主理人 ownerId 或管理员确认
  @Post(':id/confirm-plan')
  async confirmPlan(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tenantRegistersService.confirmPlan(id, req.user as AuthUser);
  }

  // POST /tenant-registers/:id/assign-accountant  —— 主管/管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post(':id/assign-accountant')
  async assignAccountant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignAccountantDto,
  ) {
    return this.tenantRegistersService.assignAccountant(id, dto.accountantId);
  }

  // POST /tenant-registers/:id/confirm-assignment  —— 会计/管理员
  @UseGuards(RolesGuard)
  @Roles('会计', '管理员')
  @Post(':id/confirm-assignment')
  async confirmAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.tenantRegistersService.confirmAssignment(
      id,
      req.user.sub,
      req.user.roleCode,
    );
  }
}
