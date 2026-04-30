import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WechatLoginDto {
  /** 微信 wx.login 返回的临时 code（mock 阶段不会真请求微信，仅用于推导 openid） */
  @IsString()
  @MaxLength(200)
  code!: string;

  /** 用户昵称（首次登录时可选传入） */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  /** 头像 URL（首次登录时可选传入） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}
