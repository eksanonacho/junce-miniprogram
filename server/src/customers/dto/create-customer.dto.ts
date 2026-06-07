import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { CompanyType, CustomerCategory, CustomerTier } from '../../../generated/prisma/client';

export class CreateCustomerDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsDateString()
  registerDate?: string;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  annualRevenue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  staffCount?: number;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsEnum(CustomerCategory)
  customerCategory: CustomerCategory;

  // TODO: 客户分层的自动判断逻辑，等客户补充界定标准后再做
  @IsOptional()
  @IsEnum(CustomerTier)
  tier?: CustomerTier;
}
