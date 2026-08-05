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
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { QueryChargeDto } from './dto/query-charge.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../permissions/permissions.service';

@Controller('charges')
@UseGuards(JwtAuthGuard)
export class ChargesController {
  constructor(private readonly chargesService: ChargesService) {}

  // TODO: 客户补充完整权限表后，POST /charges 可能限为商务/总务/管理员
  // POST /charges
  @Post()
  async create(@Body() dto: CreateChargeDto, @Request() req: any) {
    return this.chargesService.create(dto, req.user as AuthUser);
  }

  // GET /charges?customerId=1&chargeStatus=未收
  @Get()
  async findAll(@Query() query: QueryChargeDto, @Request() req: any) {
    return this.chargesService.findAll(query, req.user as AuthUser);
  }

  // GET /charges/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.chargesService.findOne(id, req.user as AuthUser);
  }

  // PATCH /charges/:id  —— 总务/管理员，不允许改 chargeStatus
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChargeDto,
  ) {
    return this.chargesService.update(id, dto);
  }

  // POST /charges/:id/confirm  —— 总务/管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.chargesService.confirm(id, req.user.sub);
  }

  // POST /charges/:id/remind  —— 总务/管理员
  @UseGuards(RolesGuard)
  @Roles('总务', '管理员')
  @Post(':id/remind')
  async remind(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReminderDto,
    @Request() req: any,
  ) {
    return this.chargesService.remind(
      id,
      req.user.sub,
      dto.toUserId,
      dto.message,
    );
  }

  // GET /charges/:id/reminders
  @Get(':id/reminders')
  async findReminders(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.chargesService.findReminders(id, req.user as AuthUser);
  }
}
