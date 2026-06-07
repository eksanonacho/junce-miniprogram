import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ServiceTemplatesService } from './service-templates.service';
import { QueryTemplateDto } from './dto/query-template.dto';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';
import { QueryConfirmationDto } from './dto/query-confirmation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// TODO: 客户权限表补充后启用细粒度角色控制
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ServiceTemplatesController {
  constructor(
    private readonly serviceTemplatesService: ServiceTemplatesService,
  ) {}

  // GET /service-templates?serviceType=食品证
  @Get('service-templates')
  async findAll(@Query() query: QueryTemplateDto) {
    return this.serviceTemplatesService.findAll(query.serviceType);
  }

  // GET /service-templates/:id
  @Get('service-templates/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceTemplatesService.findOne(id);
  }

  // POST /service-read-confirmations
  @Post('service-read-confirmations')
  async confirm(
    @Body() dto: CreateConfirmationDto,
    @Request() req: any,
  ) {
    return this.serviceTemplatesService.confirm(dto, req.user.sub);
  }

  // GET /service-read-confirmations?customerId=1&templateId=2
  @Get('service-read-confirmations')
  async findConfirmations(@Query() query: QueryConfirmationDto) {
    return this.serviceTemplatesService.findConfirmations(
      query.customerId,
      query.templateId,
    );
  }
}
