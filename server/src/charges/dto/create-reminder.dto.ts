import { IsOptional, IsInt, IsString } from 'class-validator';

export class CreateReminderDto {
  @IsOptional()
  @IsInt()
  toUserId?: number; // 不传则默认催收客户主理人

  @IsOptional()
  @IsString()
  message?: string;
}
