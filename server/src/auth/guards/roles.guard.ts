import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 读取 @Roles() 装饰器设置的角色数组
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有 @Roles() 装饰器 → 不检查，直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // JwtAuthGuard 没放行 → user 不存在
    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // 检查用户角色是否在要求的角色列表中
    if (!requiredRoles.includes(user.roleCode)) {
      throw new ForbiddenException(
        `权限不足：需要 [${requiredRoles.join('、')}] 角色，当前为 ${user.roleCode}`,
      );
    }

    return true;
  }
}
