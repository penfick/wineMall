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

import { NoticeService } from './notice.service';
import {
  CreateNoticeDto,
  NoticeQueryDto,
  PublicNoticeListDto,
  UpdateNoticeDto,
} from './dto/notice.dto';

@Auth('admin')
@Controller('admin/notice')
export class AdminNoticeController {
  constructor(private readonly svc: NoticeService) {}

  @Get()
  page(@Query() query: NoticeQueryDto) {
    return this.svc.pageAdmin(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailAdmin(id);
  }

  @CheckPermission('notice:create')
  @Post()
  create(@Body() dto: CreateNoticeDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('notice:update')
  @Put(':id/status/:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
  ) {
    return this.svc.toggleStatus(id, status);
  }

  @CheckPermission('notice:update')
  @Put(':id/top/:isTop')
  toggleTop(
    @Param('id', ParseIntPipe) id: number,
    @Param('isTop', ParseIntPipe) isTop: number,
  ) {
    return this.svc.toggleTop(id, isTop);
  }

  @CheckPermission('notice:update')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoticeDto,
  ) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('notice:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}

@Public()
@Controller('notice')
export class PublicNoticeController {
  constructor(private readonly svc: NoticeService) {}

  @Get()
  page(@Query() query: PublicNoticeListDto) {
    return this.svc.pagePublic(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailPublic(id);
  }
}
