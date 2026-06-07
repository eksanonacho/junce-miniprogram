import { IsOptional, IsString } from 'class-validator';

export class QueryTemplateDto {
  @IsOptional()
  @IsString()
  serviceType?: string; // 按服务类型筛选，如 ?serviceType=食品证
}
