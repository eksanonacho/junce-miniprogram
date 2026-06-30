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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../permissions/permissions.service';
// TODO: 客户权限表补充后启用细粒度角色控制
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard) // 所有接口都需要登录
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // POST /customers  —— ownerId 自动取当前登录用户，不允许前端手传
  @Post()
  async create(@Body() dto: CreateCustomerDto, @Request() req: any) {
    return this.customersService.create(dto, req.user as AuthUser);
  }

  // GET /customers?tier=VIP&lifecycleStage=填单&keyword=某某公司
  @Get()
  async findAll(@Query() query: QueryCustomerDto, @Request() req: any) {
    return this.customersService.findAll(query, req.user as AuthUser);
  }

  // GET /customers/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.customersService.findOne(id, req.user as AuthUser);
  }

  // PATCH /customers/:id
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @Request() req: any,
  ) {
    return this.customersService.update(id, dto, req.user as AuthUser);
  }
}
