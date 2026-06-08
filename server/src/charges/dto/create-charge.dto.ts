import { IsInt, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ChargeMode } from '../../../generated/prisma/client';

export class CreateChargeDto {
  @IsInt()
  customerId: number;

  @IsEnum(ChargeMode)
  chargeMode: ChargeMode;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  contractNo?: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;
}
