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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../permissions/permissions.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // POST /tasks  —— 主管/管理员
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Post()
  async create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(dto, req.user.sub);
  }

  // GET /tasks?status=进行中&fromUserId=X&toUserId=X
  // TODO: 后续权限表补充后细化查询权限
  @Get()
  async findAll(@Query() query: QueryTaskDto, @Request() req: any) {
    return this.tasksService.findAll(query, req.user as AuthUser);
  }

  // GET /tasks/:id
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tasksService.findOne(id, req.user as AuthUser);
  }

  // PATCH /tasks/:id  —— 主管/管理员，不允许改状态
  @UseGuards(RolesGuard)
  @Roles('主管', '管理员')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto);
  }

  // POST /tasks/:id/confirm  —— toUserId 本人或管理员
  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.tasksService.confirm(id, req.user.sub, req.user.roleCode);
  }

  // POST /tasks/:id/complete  —— toUserId 本人或管理员
  @Post(':id/complete')
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.tasksService.complete(id, req.user.sub, req.user.roleCode);
  }
}
