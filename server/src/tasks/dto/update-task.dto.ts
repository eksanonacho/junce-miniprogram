import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  toUserId?: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  // 注意：status/confirmedAt/confirmedById/completedAt/completedById
  // 不能通过 PATCH 修改，只能通过 confirm/complete 接口流转
}
