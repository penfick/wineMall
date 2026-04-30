import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Auth, Public, CurrentUser } from '@common/decorators';
import type { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { UpdateUserProfileDto } from './dto/update-profile.dto';

@Auth('user')
@Controller('auth')
export class UserAuthController {
  constructor(private readonly auth: AuthService) {}

  /** 微信登录（mock 实现，code → 稳定 openid） */
  @Public()
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto, @Ip() ip: string, @Req() req: Request) {
    const ua = (req.headers['user-agent'] as string) || '';
    return this.auth.wechatLogin(dto, ip, ua.slice(0, 500));
  }

  /** 注销 */
  @Post('logout')
  logout(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.logout(user);
  }

  /** 当前用户资料 */
  @Get('profile')
  profile(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.getUserProfile(user.id);
  }

  /** 更新当前用户资料 */
  @Post('profile')
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.auth.updateUserProfile(user.id, dto);
  }
}
