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

import { CategoryService } from './category.service';
import {
  BatchSortDto,
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

/** B 端：分类管理 */
@Auth('admin')
@Controller('admin/category')
export class AdminCategoryController {
  constructor(private readonly svc: CategoryService) {}

  @Get()
  list(@Query() query: CategoryQueryDto) {
    return this.svc.list(query);
  }

  @Get('tree')
  tree() {
    return this.svc.treeAdmin();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('category:create')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('category:update')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('category:update')
  @Put('sort/batch')
  batchSort(@Body() dto: BatchSortDto) {
    return this.svc.batchSort(dto);
  }

  @CheckPermission('category:update')
  @Put(':id/status/:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
  ) {
    return this.svc.toggleStatus(id, status);
  }

  @CheckPermission('category:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

/** C 端：公开分类树 */
@Public()
@Controller('category')
export class PublicCategoryController {
  constructor(private readonly svc: CategoryService) {}

  @Get('tree')
  tree() {
    return this.svc.treePublic();
  }

  /** 首页用：仅一级分类（取前 N 个），用于首页九宫格入口 */
  @Get('home')
  async home(@Query('limit') limit?: string) {
    const n = Math.max(1, Math.min(20, Number(limit) || 10));
    const tree = await this.svc.treePublic();
    return tree.slice(0, n).map(({ children: _omit, ...rest }) => rest);
  }
}
