import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { Auth, CheckPermission } from '@common/decorators';

import { CacheService } from './cache.service';
import { CacheClearDto, CacheKeyQueryDto } from './dto/cache.dto';

@Auth('admin')
@Controller('admin/system/cache')
export class CacheController {
  constructor(private readonly svc: CacheService) {}

  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @Get('keys')
  listKeys(@Query() query: CacheKeyQueryDto) {
    const pattern = (query.pattern || '').trim() || '*';
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? query.limit ?? 20;
    return this.svc.listKeys(pattern, page, pageSize);
  }

  @Get('value')
  getValue(@Query('key') key: string) {
    return this.svc.getValue(key);
  }

  @CheckPermission('cache:clear')
  @Delete('key')
  deleteKey(@Query('key') key: string) {
    return this.svc.deleteKey(key);
  }

  @CheckPermission('cache:clear')
  @Post('clear')
  clear(@Body() dto: CacheClearDto) {
    const pattern =
      dto.pattern ?? (dto.prefix ? (dto.prefix.endsWith('*') ? dto.prefix : `${dto.prefix}*`) : '');
    const confirm = dto.confirm === true || dto.confirm === 'true' || dto.confirm === 'CONFIRM';
    return this.svc.clearByPattern(pattern, confirm);
  }
}
