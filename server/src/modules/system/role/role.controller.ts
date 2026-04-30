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

import { Auth, CheckPermission } from '@common/decorators';

import { RoleService } from './role.service';
import {
  AssignMenuDto,
  CreateRoleDto,
  RoleQueryDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Auth('admin')
@Controller('admin/system/role')
export class RoleController {
  constructor(private readonly svc: RoleService) {}

  /** 分页列表 */
  @Get()
  page(@Query() query: RoleQueryDto) {
    return this.svc.page(query);
  }

  /** 全部（下拉用） */
  @Get('all')
  all() {
    return this.svc.all();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('role:create')
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('role:update')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.svc.update(id, dto);
  }

  /** 仅分配菜单（菜单树勾选保存） */
  @CheckPermission('role:update')
  @Put(':id/menus')
  assignMenus(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignMenuDto) {
    return this.svc.assignMenus(id, dto);
  }

  @CheckPermission('role:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
