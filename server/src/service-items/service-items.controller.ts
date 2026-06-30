import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemsDto } from './dto/create-service-items.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../permissions/permissions.service';
// TODO: 客户权限表补充后，status 修改限业务岗/管理员
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  // POST /customers/:customerId/service-items
  @Post('customers/:customerId/service-items')
  async create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateServiceItemsDto,
    @Request() req: any,
  ) {
    return this.serviceItemsService.create(customerId, dto.templateIds, req.user as AuthUser);
  }

  // GET /customers/:customerId/service-items
  @Get('customers/:customerId/service-items')
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    return this.serviceItemsService.findByCustomer(customerId, req.user as AuthUser);
  }

  // PATCH /service-items/:id   —— 本期只允许改 status
  @Patch('service-items/:id')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceItemDto,
    @Request() req: any,
  ) {
    return this.serviceItemsService.updateStatus(id, dto.status, req.user as AuthUser);
  }
}
