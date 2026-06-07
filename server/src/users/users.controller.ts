import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// TODO: 客户权限表补充后启用细粒度角色控制
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users?roleCode=会计
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query.roleCode);
  }
}
