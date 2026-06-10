import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { FissionLeadsService } from './fission-leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('fission-leads')
@UseGuards(JwtAuthGuard)
export class FissionLeadsController {
  constructor(private readonly fissionLeadsService: FissionLeadsService) {}

  // POST /fission-leads — 所有登录角色
  @Post()
  async create(@Body() dto: any, @Request() req: any) {
    return this.fissionLeadsService.create(dto, req.user.sub);
  }

  // GET /fission-leads?sourceCustomerId=&status=
  @Get()
  async findAll(@Query() query: any) {
    return this.fissionLeadsService.findAll(query);
  }

  // GET /fission-leads/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fissionLeadsService.findOne(id);
  }

  // PATCH /fission-leads/:id — 主管+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.fissionLeadsService.update(id, dto);
  }

  // POST /fission-leads/:id/confirm — 主管+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post(':id/confirm')
  async confirm(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.fissionLeadsService.confirm(id, req.user.sub);
  }

  // POST /fission-leads/:id/archive — 主管+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post(':id/archive')
  async archive(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Request() req: any) {
    return this.fissionLeadsService.archive(id, req.user.sub, dto.archiveFiles || []);
  }

  // POST /fission-leads/:id/mark-invalid — 主管+管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post(':id/mark-invalid')
  async markInvalid(@Param('id', ParseIntPipe) id: number) {
    return this.fissionLeadsService.markInvalid(id);
  }
}
