import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { Auth, CheckPermission } from '@common/decorators';

import { OperationLogService } from './operation-log.service';

@Auth('admin')
@Controller('admin/system/operation-log')
export class OperationLogController {
  constructor(private readonly svc: OperationLogService) {}

  @Get()
  page(@Query() query: any) {
    return this.svc.page(query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('log:clear')
  @Post('clear')
  clear(@Body() dto: { beforeDate: string; confirm: string }) {
    return this.svc.clear(dto.beforeDate, dto.confirm);
  }
}
