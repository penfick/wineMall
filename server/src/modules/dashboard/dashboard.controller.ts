import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';

import { Auth } from '@common/decorators';

import { DashboardService } from './dashboard.service';

@Auth('admin')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @Get('trend')
  trend(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.svc.trend(days ?? 30);
  }

  @Get('category-share')
  category() {
    return this.svc.categoryShare();
  }

  @Get('top10')
  top10() {
    return this.svc.top10();
  }
}
