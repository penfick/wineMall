import { Controller, Get, Param } from '@nestjs/common';

import { Public } from '@common/decorators';

import { RegionService } from './region.service';

/**
 * 区域接口（公开）
 * - C 端地址新建/编辑用
 * - B 端用户列表筛选用
 */
@Public()
@Controller('region')
export class RegionController {
  constructor(private readonly svc: RegionService) {}

  @Get('tree')
  tree() {
    return this.svc.tree();
  }

  @Get('children/:code')
  children(@Param('code') code: string) {
    return this.svc.children(code);
  }
}
