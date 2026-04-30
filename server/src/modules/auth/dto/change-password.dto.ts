import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  oldPassword!: string;

  /** 新密码：8-20 位，必须包含字母与数字 */
  @IsString()
  @MinLength(8, { message: '新密码长度至少 8 位' })
  @MaxLength(20, { message: '新密码长度至多 20 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '新密码必须包含字母和数字' })
  newPassword!: string;
}
