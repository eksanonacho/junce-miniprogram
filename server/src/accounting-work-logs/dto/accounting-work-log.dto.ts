import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const ACCOUNTING_RECORD_TYPES = [
  '客户入库',
  '客户出库',
  '开票登记',
  '日常咨询',
  '账务进度',
  '社保明细',
  '报税进度',
  '年报进度',
  '其他',
] as const;

export class CreateAccountingWorkLogDto {
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsIn(ACCOUNTING_RECORD_TYPES)
  recordType!: string;

  @IsDateString()
  recordDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class UpdateAccountingWorkLogDto {
  @IsOptional()
  @IsIn(ACCOUNTING_RECORD_TYPES)
  recordType?: string;

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class QueryAccountingWorkLogDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsIn(ACCOUNTING_RECORD_TYPES)
  recordType?: string;
}
