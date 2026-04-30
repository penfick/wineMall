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

import { BannerService } from './banner.service';
import {
  BannerQueryDto,
  BannerSortDto,
  CreateBannerDto,
  UpdateBannerDto,
} from './dto/banner.dto';

@Auth('admin')
@Controller('admin/banner')
export class AdminBannerController {
  constructor(private readonly svc: BannerService) {}

  @Get()
  page(@Query() query: BannerQueryDto) {
    return this.svc.pageAdmin(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('banner:create')
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('banner:update')
  @Put('sort/batch')
  batchSort(@Body() dto: BannerSortDto) {
    return this.svc.batchSort(dto);
  }

  @CheckPermission('banner:update')
  @Put(':id/status/:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
  ) {
    return this.svc.toggleStatus(id, status);
  }

  @CheckPermission('banner:update')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('banner:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

@Public()
@Controller('banner')
export class PublicBannerController {
  constructor(private readonly svc: BannerService) {}

  @Get()
  list() {
    return this.svc.listPublic();
  }
}
