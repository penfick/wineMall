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

import { LogisticsService } from './logistics.service';
import {
  CreateLogisticsCompanyDto,
  UpdateLogisticsCompanyDto,
} from './dto/logistics.dto';

@Auth('admin')
@Controller('admin/logistics')
export class AdminLogisticsController {
  constructor(private readonly svc: LogisticsService) {}

  // ---------- 物流公司 ----------
  @Get('company')
  page(@Query() query: any) {
    return this.svc.pageCompanies(query);
  }

  @Get('company/all')
  all() {
    return this.svc.listCompanies();
  }

  @Get('company/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailCompany(id);
  }

  @CheckPermission('logistics:create')
  @Post('company')
  create(@Body() dto: CreateLogisticsCompanyDto) {
    return this.svc.createCompany(dto);
  }

  @CheckPermission('logistics:update')
  @Put('company/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLogisticsCompanyDto,
  ) {
    return this.svc.updateCompany(id, dto);
  }

  @CheckPermission('logistics:delete')
  @Delete('company/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeCompany(id);
  }

  // ---------- 发货记录 ----------
  @Get('shipment')
  shipmentPage(@Query() query: any) {
    return this.svc.pageShipments(query);
  }

  @Get('shipment/:id')
  shipmentDetail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detailShipment(id);
  }

  @Get('shipment/:id/trace')
  shipmentTrace(@Param('id', ParseIntPipe) id: number) {
    return this.svc.traceShipment(id);
  }
}

/** C 端：物流公司枚举（下拉选择用） + 订单轨迹 */
@Auth('user')
@Controller('logistics')
export class UserLogisticsController {
  constructor(private readonly svc: LogisticsService) {}

  @Public()
  @Get('company')
  publicCompanies() {
    return this.svc.listCompanies(true);
  }

  @Get('track/:orderId')
  tracks(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.svc.getOrderTracks(orderId);
  }
}
