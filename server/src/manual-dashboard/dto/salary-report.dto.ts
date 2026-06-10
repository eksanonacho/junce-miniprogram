import { IsString, IsInt, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class CreateSalaryReportDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month 必须为 YYYY-MM 格式，如 2026-06' })
  month: string;

  @IsInt()
  userId: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) commission?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) bonus?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) deduction?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) socialInsurance?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSalaryReportDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) commission?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) bonus?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) deduction?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) socialInsurance?: number;
  @IsOptional() @IsString() note?: string;
}
