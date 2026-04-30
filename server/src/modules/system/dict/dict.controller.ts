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

import { Auth, CheckPermission, Public } from '@common/decorators';

import { DictService } from './dict.service';
import {
  CreateDictItemDto,
  CreateDictTypeDto,
  DictTypeQueryDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './dto/dict.dto';

/** B 端：字典管理 */
@Auth('admin')
@Controller('admin/system/dict')
export class AdminDictController {
  constructor(private readonly svc: DictService) {}

  // ===== 类型 =====
  @Get('types')
  pageType(@Query() query: DictTypeQueryDto) {
    return this.svc.pageType(query);
  }

  @Get('types/all')
  allTypes() {
    return this.svc.listAllTypes();
  }

  @Get('types/:id')
  detailType(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailType(id);
  }

  @CheckPermission('dict:create')
  @Post('types')
  createType(@Body() dto: CreateDictTypeDto) {
    return this.svc.createType(dto);
  }

  @CheckPermission('dict:update')
  @Put('types/:id')
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictTypeDto) {
    return this.svc.updateType(id, dto);
  }

  @CheckPermission('dict:delete')
  @Delete('types/:id')
  removeType(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeType(id);
  }

  // ===== 项 =====
  @Get('items/:typeCode')
  listItemsByCode(@Param('typeCode') typeCode: string) {
    return this.svc.listItemsByCode(typeCode);
  }

  @CheckPermission('dict:create')
  @Post('items')
  createItem(@Body() dto: CreateDictItemDto) {
    return this.svc.createItem(dto);
  }

  @CheckPermission('dict:update')
  @Put('items/:id')
  updateItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictItemDto) {
    return this.svc.updateItem(id, dto);
  }

  @CheckPermission('dict:delete')
  @Delete('items/:id')
  removeItem(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeItem(id);
  }
}

/** 公开：C 端 / B 端启动时拉字典 */
@Public()
@Controller('dict')
export class PublicDictController {
  constructor(private readonly svc: DictService) {}

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.svc.getByCode(code);
  }

  /** /dict?codes=order_status,goods_status */
  @Get()
  getBatch(@Query('codes') codes: string) {
    if (!codes) return {};
    const arr = codes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return this.svc.getBatch(arr);
  }
}
