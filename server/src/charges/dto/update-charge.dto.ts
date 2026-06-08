import { IsOptional, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { ChargeMode } from '../../../generated/prisma/client';

export class UpdateChargeDto {
  @IsOptional()
  @IsEnum(ChargeMode)
  chargeMode?: ChargeMode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  contractNo?: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  // 注意：chargeStatus、confirmedBy、confirmedAt 不能通过 PATCH 修改
}
