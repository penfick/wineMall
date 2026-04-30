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

import { FreightService } from './freight.service';
import {
  CreateFreightTemplateDto,
  FreightCalcDto,
  UpdateFreightTemplateDto,
} from './dto/freight.dto';

@Auth('admin')
@Controller('admin/freight')
export class AdminFreightController {
  constructor(private readonly svc: FreightService) {}

  @Get('template')
  page(@Query() query: any) {
    return this.svc.page(query);
  }

  @Get('template/all')
  all() {
    return this.svc.list();
  }

  @Get('template/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('freight:create')
  @Post('template')
  create(@Body() dto: CreateFreightTemplateDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('freight:update')
  @Put('template/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFreightTemplateDto,
  ) {
    return this.svc.update(id, dto);
  }

  @CheckPermission('freight:delete')
  @Delete('template/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  @CheckPermission('freight:update')
  @Put('template/:id/default')
  setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.svc.setDefault(id);
  }

  /** 试算接口（管理员页面预览） */
  @Post('calc')
  calc(@Body() dto: FreightCalcDto) {
    return this.svc.calc(dto);
  }
}

/** C 端运费试算（结算页用） */
@Auth('user')
@Controller('freight')
export class UserFreightController {
  constructor(private readonly svc: FreightService) {}

  @Post('calc')
  calc(@Body() dto: FreightCalcDto) {
    return this.svc.calc(dto);
  }
}
