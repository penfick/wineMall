import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { Auth, CheckPermission, CurrentUser } from '@common/decorators';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { StockService } from './stock.service';
import {
  StockAdjustDto,
  StockLogQueryDto,
  StockWarningDto,
} from './dto/stock.dto';

@Auth('admin')
@Controller('admin/system/stock')
export class StockController {
  constructor(private readonly svc: StockService) {}

  @Get('warning')
  warning(@Query('limit') limit?: string) {
    return this.svc.warningList(limit ? parseInt(limit, 10) : 50);
  }

  @Get('log')
  log(@Query() query: StockLogQueryDto) {
    return this.svc.logPage(query);
  }

  @CheckPermission('stock:adjust')
  @Post('adjust')
  adjust(@Body() dto: StockAdjustDto, @CurrentUser() u: CurrentUserPayload) {
    return this.svc.adjust(dto, u);
  }

  @CheckPermission('stock:adjust')
  @Put('warning')
  setWarning(@Body() dto: StockWarningDto) {
    return this.svc.setWarning(dto);
  }
}
