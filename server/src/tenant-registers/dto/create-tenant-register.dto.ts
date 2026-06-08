import { IsInt, IsOptional } from 'class-validator';

export class CreateTenantRegisterDto {
  @IsInt()
  customerId: number;

  @IsOptional()
  enterpriseDetail?: any;

  @IsOptional()
  servicePlan?: any;
}
