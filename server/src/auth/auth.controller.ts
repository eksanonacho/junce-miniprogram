import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login  —— 不需要 token
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  // GET /auth/me  —— 需要 token，任何角色都行
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  // GET /auth/admin-only  —— 只有管理员能访问（验证权限守卫）
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('管理员')
  @Get('admin-only')
  async adminOnly() {
    return {
      message: '欢迎，管理员！你成功访问了受保护的接口。',
      timestamp: new Date().toISOString(),
    };
  }
}
