import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../permissions/permissions.service';
import {
  CreateAccountingWorkLogDto,
  QueryAccountingWorkLogDto,
  UpdateAccountingWorkLogDto,
} from './dto/accounting-work-log.dto';
import { AccountingWorkLogsService } from './accounting-work-logs.service';

@Controller('accounting-work-logs')
@UseGuards(JwtAuthGuard)
export class AccountingWorkLogsController {
  constructor(private readonly service: AccountingWorkLogsService) {}

  @Get()
  findAll(@Query() query: QueryAccountingWorkLogDto, @Req() req: any) {
    return this.service.findAll(query, req.user as AuthUser);
  }

  @UseGuards(RolesGuard)
  @Roles('会计')
  @Post()
  create(@Body() dto: CreateAccountingWorkLogDto, @Req() req: any) {
    return this.service.create(dto, req.user as AuthUser);
  }

  @UseGuards(RolesGuard)
  @Roles('会计', '主管', '管理员')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountingWorkLogDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user as AuthUser);
  }

  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post(':id/review')
  review(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.review(id, req.user as AuthUser);
  }
}
