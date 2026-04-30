import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(3, { message: '用户名长度至少 3 位' })
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(6, { message: '密码长度至少 6 位' })
  @MaxLength(50)
  password!: string;

  /** 验证码 ID（M1 阶段不强制，预留接口）*/
  @IsOptional()
  @IsString()
  captchaId?: string;

  /** 验证码值（M1 阶段不强制） */
  @IsOptional()
  @IsString()
  captchaCode?: string;
}
