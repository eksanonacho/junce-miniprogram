import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: '用户名不能为空' })
  username: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}
