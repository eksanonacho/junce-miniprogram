import { IsInt, IsOptional } from 'class-validator';

export class CreateConfirmationDto {
  @IsInt()
  customerId: number;

  @IsInt()
  templateId: number;

  // 二期关联到具体 ServiceItem 时使用，一期不传
  @IsOptional()
  @IsInt()
  serviceItemId?: number;
}
