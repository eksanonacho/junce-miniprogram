import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ChargeStatus } from '../../../generated/prisma/client';

export class QueryChargeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsEnum(ChargeStatus)
  chargeStatus?: ChargeStatus;
}
