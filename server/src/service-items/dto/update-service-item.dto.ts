import { IsEnum } from 'class-validator';
import { ItemStatus } from '../../../generated/prisma/client';

export class UpdateServiceItemDto {
  @IsEnum(ItemStatus, { message: 'status 必须是 待办 / 办件中 / 办结' })
  status: ItemStatus;
}
