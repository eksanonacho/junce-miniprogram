import { IsOptional, IsInt, IsEnum, IsArray } from 'class-validator';
import { WorkOrderStatus } from '../../../generated/prisma/client';

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus, {
    message: 'status 必须是 待办 / 办件中 / 办结',
  })
  status?: WorkOrderStatus;

  @IsOptional()
  @IsInt()
  handlerId?: number;

  @IsOptional()
  @IsInt()
  receiptReceiverId?: number;

  @IsOptional()
  @IsArray()
  archiveFiles?: any[];
}
