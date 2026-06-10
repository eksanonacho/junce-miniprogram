import { IsOptional, IsString, IsInt, IsNumber, Min } from 'class-validator';

export class UpdateFissionLeadDto {
  @IsOptional() @IsInt() sourceCustomerId?: number;
  @IsOptional() @IsString() leadName?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() assigneeId?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price?: number;
  @IsOptional() archiveFiles?: any[];
}
