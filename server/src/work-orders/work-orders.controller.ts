import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { QueryWorkOrderDto } from './dto/query-work-order.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// TODO: 客户权限表补充后，PATCH 和 check-in 限业务岗/管理员
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  // POST /work-orders
  @Post()
  async create(@Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(dto);
  }

  // GET /work-orders?customerId=1&handlerId=2&status=办件中
  @Get()
  async findAll(@Query() query: QueryWorkOrderDto) {
    return this.workOrdersService.findAll(query);
  }

  // GET /work-orders/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workOrdersService.findOne(id);
  }

  // PATCH /work-orders/:id   —— 不允许改"已打卡"
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(id, dto);
  }

  // POST /work-orders/:id/check-in   —— 必须传 archiveFiles
  @Post(':id/check-in')
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckInDto,
  ) {
    return this.workOrdersService.checkIn(id, dto.archiveFiles);
  }
}
