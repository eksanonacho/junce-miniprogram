import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsInt()
  toUserId: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsDateString()
  deadline: string;
}
