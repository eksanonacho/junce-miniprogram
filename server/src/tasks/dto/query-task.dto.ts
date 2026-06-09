import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../../generated/prisma/client';

export class QueryTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fromUserId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  toUserId?: number;
}
