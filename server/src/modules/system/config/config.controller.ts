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

import { SysConfigService } from './config.service';
import {
  BatchUpdateConfigDto,
  ConfigQueryDto,
  CreateConfigDto,
  UpdateConfigDto,
} from './dto/config.dto';

@Auth('admin')
@Controller('admin/system/config')
export class AdminConfigController {
  constructor(private readonly svc: SysConfigService) {}

  /** 前端：分组聚合（系统配置页主接口） */
  @Get()
  groups() {
    return this.svc.getGroups();
  }

  /** 内部：分页（旧接口，保留备用） */
  @Get('page')
  page(@Query() query: ConfigQueryDto) {
    return this.svc.page(query);
  }

  @CheckPermission('config:update')
  @Post()
  create(@Body() dto: CreateConfigDto) {
    return this.svc.create(dto);
  }

  @CheckPermission('config:update')
  @Put('batch/update')
  batchUpdate(@Body() dto: BatchUpdateConfigDto) {
    return this.svc.batchUpdate(dto);
  }

  /** 数字 id → 走 update 单条；非数字 → 当作 groupCode 走 saveGroup */
  @CheckPermission('config:update')
  @Put(':idOrGroup')
  updateOne(
    @Param('idOrGroup') idOrGroup: string,
    @Body() body: any,
  ) {
    if (/^\d+$/.test(idOrGroup)) {
      return this.svc.update(parseInt(idOrGroup, 10), body as UpdateConfigDto);
    }
    const values = (body && body.values) || {};
    return this.svc.saveGroup(idOrGroup, values);
  }

  /** 数字 id → 删除单条；非数字 → 视为 groupCode（暂不支持，404） */
  @CheckPermission('config:update')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  /** 前端：取单个分组 */
  @Get(':groupCode')
  group(@Param('groupCode') groupCode: string) {
    return this.svc.getGroups().then((all) =>
      all.find((g) => g.groupCode === groupCode) ?? { groupCode, groupName: groupCode, items: [] },
    );
  }
}

/** C 端：拉取公开配置 */
@Public()
@Controller('config')
export class PublicConfigController {
  constructor(private readonly svc: SysConfigService) {}

  @Get('public')
  getPublic() {
    return this.svc.getPublicConfigs();
  }
}
