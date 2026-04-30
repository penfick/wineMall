import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { Auth, CurrentUser } from '@common/decorators';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { FavoriteService } from './favorite.service';
import { FavoriteAddDto, FavoriteListDto } from './dto/favorite.dto';

@Auth('user')
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly svc: FavoriteService) {}

  @Get()
  page(@CurrentUser() u: CurrentUserPayload, @Query() query: FavoriteListDto) {
    return this.svc.page(u.id, query);
  }

  @Get('check/:goodsId')
  check(
    @CurrentUser() u: CurrentUserPayload,
    @Param('goodsId', ParseIntPipe) goodsId: number,
  ) {
    return this.svc.check(u.id, goodsId);
  }

  @Post()
  add(@CurrentUser() u: CurrentUserPayload, @Body() dto: FavoriteAddDto) {
    return this.svc.add(u.id, dto);
  }

  @Delete('batch')
  batchRemove(
    @CurrentUser() u: CurrentUserPayload,
    @Body('ids') ids: number[],
  ) {
    return this.svc.batchRemove(u.id, ids);
  }

  @Delete(':goodsId')
  remove(
    @CurrentUser() u: CurrentUserPayload,
    @Param('goodsId', ParseIntPipe) goodsId: number,
  ) {
    return this.svc.remove(u.id, goodsId);
  }
}
