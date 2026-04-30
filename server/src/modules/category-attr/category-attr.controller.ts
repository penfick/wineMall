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

import { CategoryAttrService } from './category-attr.service';
import {
  CategoryAttrQueryDto,
  CreateCategoryAttrDto,
  UpdateCategoryAttrDto,
} from './dto/category-attr.dto';

/** B 端：分类属性管理 */
@Auth('admin')
@Controller('admin/category-attr')
export class AdminCategoryAttrController {
  constructor(private readonly svc: CategoryAttrService) {}

  /** ?categoryId=xx */
  @Get()
  list(@Query() query: CategoryAttrQueryDto) {
    return this.svc.listByCategory(query.categoryId);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('category-attr:create')
  @Post()
  create(@Body() dto: CreateCategoryAttrDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('category-attr:update')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryAttrDto,
  ) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('category-attr:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  // ---------- 属性可选值 ----------
  @CheckPermission('category-attr:update')
  @Post('value')
  createValue(@Body() dto: { attrId: number; value: string; sort?: number }) {
    return this.svc.createValue(dto);
  }

  @CheckPermission('category-attr:update')
  @Put('value/:id')
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { value?: string; sort?: number },
  ) {
    return this.svc.updateValue(id, dto);
  }

  @CheckPermission('category-attr:update')
  @Delete('value/:id')
  removeValue(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeValue(id);
  }
}
