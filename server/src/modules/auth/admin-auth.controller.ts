import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Auth, Public, CurrentUser } from '@common/decorators';
import type { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminProfileDto } from './dto/update-profile.dto';

@Auth('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AuthService) {}

  /** 管理员登录 */
  @Public()
  @Post('login')
  login(@Body() dto: AdminLoginDto, @Ip() ip: string, @Req() req: Request) {
    const ua = (req.headers['user-agent'] as string) || '';
    return this.auth.adminLogin(dto, ip, ua.slice(0, 500));
  }

  /** 注销 */
  @Post('logout')
  logout(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.logout(user);
  }

  /** 当前管理员资料 */
  @Get('profile')
  profile(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.getAdminProfile(user.id);
  }

  /** 更新当前管理员资料（昵称/头像） */
  @Post('profile')
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.auth.updateAdminProfile(user.id, dto);
  }

  /** 修改密码 */
  @Post('change-password')
  changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changeAdminPassword(user.id, dto);
  }

  /** 当前管理员可见菜单（树） */
  @Get('menu')
  menu(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.getMyMenu(user.id, !!user.isSuper);
  }

  /** 当前管理员按钮权限码列表 */
  @Get('ability')
  ability(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.getMyAbility(user.id, !!user.isSuper);
  }
}
