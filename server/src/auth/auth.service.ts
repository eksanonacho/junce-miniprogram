import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 验证用户名密码，成功返回 JWT token + 用户信息
  async login(username: string, password: string) {
    // 1. 查用户（带角色信息）
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 2. 验密码
    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 3. 签发 JWT（payload 里放角色信息，后续权限检查不用再查库）
    const payload = {
      sub: user.id,
      username: user.username,
      realName: user.realName,
      roleCode: user.role.code,       // 如 "管理员"
      roleName: user.role.name,       // 如 "管理员/老板"
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        roleCode: user.role.code,
        roleName: user.role.name,
      },
    };
  }

  // 根据 token payload 中的 userId 查最新用户信息
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      phone: user.phone,
      roleCode: user.role.code,
      roleName: user.role.name,
    };
  }
}
