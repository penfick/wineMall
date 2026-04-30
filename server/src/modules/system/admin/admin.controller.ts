import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { Auth, CheckPermission, CurrentUser } from '@common/decorators';
import type { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { AdminService } from './admin.service';
import {
  AdminQueryDto,
  CreateAdminDto,
  ResetPasswordDto,
  UpdateAdminDto,
} from './dto/admin.dto';

@Auth('admin')
@Controller('admin/system/admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get()
  page(@Query() query: AdminQueryDto) {
    return this.svc.page(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('admin:create')
  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('admin:update')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() me: CurrentUserPayload,
  ) {
    return this.svc.update(id, dto, me.id);
  }

  @CheckPermission('admin:update')
  @Put(':id/reset-password')
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(id, dto);
  }

  @CheckPermission('admin:update')
  @Put(':id/status/:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
    @CurrentUser() me: CurrentUserPayload,
  ) {
    return this.svc.toggleStatus(id, status, me.id);
  }

  @CheckPermission('admin:kick')
  @Post(':id/kick')
  kick(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: CurrentUserPayload) {
    return this.svc.kick(id, me.id);
  }

  @CheckPermission('admin:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: CurrentUserPayload) {
    return this.svc.remove(id, me.id);
  }
}
