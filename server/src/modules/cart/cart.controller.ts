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

import { Auth, CurrentUser } from '@common/decorators';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { CartService } from './cart.service';
import {
  CartAddDto,
  CartBatchSelectDto,
  CartRemoveBatchDto,
  CartSelectDto,
  CartUpdateQtyDto,
} from './dto/cart.dto';

@Auth('user')
@Controller('cart')
export class CartController {
  constructor(private readonly svc: CartService) {}

  @Get()
  list(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.list(u.id);
  }

  @Get('count')
  count(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.count(u.id);
  }

  @Post()
  add(@CurrentUser() u: CurrentUserPayload, @Body() dto: CartAddDto) {
    return this.svc.add(u.id, dto);
  }

  @Put('qty')
  updateQty(
    @CurrentUser() u: CurrentUserPayload,
    @Body() dto: CartUpdateQtyDto,
  ) {
    return this.svc.updateQty(u.id, dto);
  }

  @Put('select')
  select(@CurrentUser() u: CurrentUserPayload, @Body() dto: CartSelectDto) {
    return this.svc.setSelected(u.id, dto);
  }

  @Put('select/batch')
  batchSelect(
    @CurrentUser() u: CurrentUserPayload,
    @Body() dto: CartBatchSelectDto,
  ) {
    return this.svc.batchSelect(u.id, dto);
  }

  @Put('select/all/:selected')
  selectAll(
    @CurrentUser() u: CurrentUserPayload,
    @Param('selected', ParseIntPipe) selected: number,
  ) {
    return this.svc.selectAll(u.id, selected === 1 ? 1 : 0);
  }

  @Delete('batch')
  batchRemove(
    @CurrentUser() u: CurrentUserPayload,
    @Body() dto: CartRemoveBatchDto,
  ) {
    return this.svc.batchRemove(u.id, dto);
  }

  @Delete('clear')
  clear(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.clear(u.id);
  }

  @Delete(':skuId')
  remove(
    @CurrentUser() u: CurrentUserPayload,
    @Param('skuId', ParseIntPipe) skuId: number,
  ) {
    return this.svc.remove(u.id, skuId);
  }
}
