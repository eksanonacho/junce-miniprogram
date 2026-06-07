import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryConfirmationDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;
}
