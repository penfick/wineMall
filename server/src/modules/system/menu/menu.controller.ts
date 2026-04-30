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

import { MenuService } from './menu.service';
import { CreateMenuDto, MenuQueryDto, UpdateMenuDto } from './dto/menu.dto';

@Auth('admin')
@Controller('admin/system/menu')
export class MenuController {
  constructor(private readonly svc: MenuService) {}

  @Get()
  list(@Query() query: MenuQueryDto) {
    return this.svc.tree(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('menu:create')
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('menu:update')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuDto) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('menu:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
