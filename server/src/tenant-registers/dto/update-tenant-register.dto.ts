import { IsOptional } from 'class-validator';

export class UpdateTenantRegisterDto {
  @IsOptional()
  enterpriseDetail?: any;

  @IsOptional()
  servicePlan?: any;

  // 注意：assignedAccountantId 不走 PATCH，走 POST /:id/assign-accountant
}
