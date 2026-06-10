import { IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class CreateBusinessReportDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month 必须为 YYYY-MM 格式，如 2026-06' })
  month: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  revenueAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateBusinessReportDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  revenueAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
