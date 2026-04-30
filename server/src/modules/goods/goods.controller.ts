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

import { GoodsService } from './goods.service';
import {
  BatchStatusDto,
  CreateGoodsDto,
  GoodsQueryDto,
  PublicGoodsListDto,
  UpdateGoodsDto,
} from './dto/goods.dto';

/** B 端：商品管理 */
@Auth('admin')
@Controller('admin/goods')
export class AdminGoodsController {
  constructor(private readonly svc: GoodsService) {}

  @Get()
  page(@Query() query: GoodsQueryDto) {
    return this.svc.pageAdmin(query);
  }

  @Get('low-stock')
  lowStock(@Query('limit') limit?: string) {
    return this.svc.lowStockList(limit ? parseInt(limit, 10) : 50);
  }

  /** 一次性：给所有缺 SKU 的存量商品补默认 SKU（迁移到「全 SKU 化」模型） */
  @CheckPermission('goods:create')
  @Post('backfill-default-sku')
  backfillDefaultSku() {
    return this.svc.backfillDefaultSku();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailAdmin(id);
  }

  @CheckPermission('goods:create')
  @Post()
  create(@Body() dto: CreateGoodsDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('goods:update')
  @Put('batch/status')
  batchStatus(@Body() dto: BatchStatusDto) {
    return this.svc.batchSetStatus(dto);
  }

  @CheckPermission('goods:update')
  @Put(':id/status/:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
  ) {
    return this.svc.batchSetStatus({ ids: [id], status });
  }

  @CheckPermission('goods:update')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGoodsDto) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('goods:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  /** 一次性回填 goods.sales / goods.stock（修复历史数据：销量从订单聚合，库存从 SKU 聚合）*/
  @CheckPermission('goods:update')
  @Post('recompute-aggregates')
  recompute() {
    return this.svc.recomputeAggregates();
  }
}

/** C 端：商品列表 / 详情 / 推荐 */
@Public()
@Controller('goods')
export class PublicGoodsController {
  constructor(private readonly svc: GoodsService) {}

  @Get()
  page(@Query() query: PublicGoodsListDto) {
    return this.svc.pagePublic(query);
  }

  @Get('hot')
  hot(@Query('limit') limit?: string) {
    return this.svc.hot(limit ? parseInt(limit, 10) : 6);
  }

  /** 推荐商品：MVP 复用 hot 逻辑（按销量倒序），后期可换成个性化推荐 */
  @Get('recommend')
  recommend(@Query('limit') limit?: string) {
    return this.svc.hot(limit ? parseInt(limit, 10) : 6);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailPublic(id);
  }
}
