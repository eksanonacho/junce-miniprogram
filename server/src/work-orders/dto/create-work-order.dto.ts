import { IsInt, IsOptional } from 'class-validator';

export class CreateWorkOrderDto {
  @IsInt()
  serviceItemId: number;

  @IsOptional()
  @IsInt()
  handlerId?: number;

  @IsOptional()
  @IsInt()
  receiptReceiverId?: number;
}
