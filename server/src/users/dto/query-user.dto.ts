import { IsOptional, IsEnum } from 'class-validator';
import { RoleCode } from '../../../generated/prisma/client';

export class QueryUserDto {
  @IsOptional()
  @IsEnum(RoleCode, {
    message: 'roleCode 必须是合法的角色编码：商务/业务/会计/主管/总务/管理员',
  })
  roleCode?: RoleCode;
}
