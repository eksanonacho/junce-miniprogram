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
    return this.customersService.create(dto, req.user.sub);
  }

  // GET /customers?tier=VIP&lifecycleStage=填单&keyword=某某公司
  @Get()
  async findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query);
  }

  // GET /customers/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  // PATCH /customers/:id
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }
}
