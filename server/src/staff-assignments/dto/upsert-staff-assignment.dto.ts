import { IsOptional, IsInt } from 'class-validator';

export class UpsertStaffAssignmentDto {
  @IsOptional()
  @IsInt()
  businessStaffId?: number;

  @IsOptional()
  @IsInt()
  accountantId?: number;

  // TODO: 客户确认顾问岗是否需要独立账号角色后再补校验规则
  @IsOptional()
  @IsInt()
  consultantId?: number;

  @IsOptional()
  @IsInt()
  generalAffairsId?: number;
}
