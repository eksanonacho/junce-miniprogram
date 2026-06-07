import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CustomerTier, LifecycleStage } from '../../../generated/prisma/client';

export class QueryCustomerDto {
  @IsOptional()
  @IsEnum(CustomerTier)
  tier?: CustomerTier;

  @IsOptional()
  @IsEnum(LifecycleStage)
  lifecycleStage?: LifecycleStage;

  @IsOptional()
  @IsString()
  keyword?: string; // 按 companyName 模糊搜索
}
