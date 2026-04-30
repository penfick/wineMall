import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Auth, CheckPermission, CurrentUser } from '@common/decorators';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { OrderService } from './order.service';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderListAdminDto,
  OrderListUserDto,
  OrderPreviewDto,
  ShipOrderDto,
} from './dto/order.dto';

/* ==================== C 端 ==================== */
@Auth('user')
@Controller('order')
export class UserOrderController {
  constructor(private readonly svc: OrderService) {}

  @Post('preview')
  async preview(
    @CurrentUser() u: CurrentUserPayload,
    @Body() raw: Record<string, unknown>,
  ) {
    const dto = await this.toDto(raw, OrderPreviewDto);
    return this.svc.preview(u.id, dto);
  }

  @Post()
  async create(
    @CurrentUser() u: CurrentUserPayload,
    @Body() raw: Record<string, unknown>,
  ) {
    const dto = await this.toDto(raw, CreateOrderDto);
    return this.svc.create(u.id, dto);
  }

  /**
   * 绕开全局 ValidationPipe 对这两个接口的处理：
   * 先就地把 cartIds / skuId+qty 归一化进 items，再用 plainToInstance + validate 验证。
   * 这是因为 @Transform 不会在缺失字段上触发，且 whitelist 会先剥未声明字段。
   */
  private async toDto<T extends object>(
    raw: Record<string, unknown>,
    Cls: new () => T,
  ): Promise<T> {
    // source 归一化
    const s = raw.source;
    if (s === 'cart') raw.source = 1;
    else if (s === 'goods') raw.source = 2;

    // items 归一化
    if (!Array.isArray(raw.items) || (raw.items as unknown[]).length === 0) {
      const cartIds = raw.cartIds;
      if (Array.isArray(cartIds) && cartIds.length) {
        raw.items = cartIds.map((id) => ({ skuId: Number(id), quantity: 1 }));
      } else if (raw.skuId !== undefined) {
        const qty = raw.qty ?? raw.quantity ?? 1;
        raw.items = [{ skuId: Number(raw.skuId), quantity: Number(qty) }];
      }
    }

    const { plainToInstance } = await import('class-transformer');
    const { validateOrReject } = await import('class-validator');
    const instance = plainToInstance(Cls, raw, {
      enableImplicitConversion: true,
    });
    try {
      await validateOrReject(instance as object, {
        whitelist: true,
        stopAtFirstError: true,
      });
    } catch (errors) {
      const arr = Array.isArray(errors) ? errors : [];
      const first = arr[0] as { constraints?: Record<string, string> } | undefined;
      const msg =
        (first?.constraints && Object.values(first.constraints)[0]) || '参数校验失败';
      throw new BusinessException(ErrorCode.PARAM_INVALID, String(msg));
    }
    return instance;
  }

  @Get()
  list(@CurrentUser() u: CurrentUserPayload, @Query() query: OrderListUserDto) {
    return this.svc.listForUser(u.id, query);
  }

  @Get(':id')
  detail(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.detail(id, u.id);
  }

  @Post(':id/pay-mock')
  pay(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.payMock(u.id, id);
  }

  @Put(':id/cancel')
  cancel(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.svc.cancelByUser(u.id, id, dto);
  }

  /** 前端兼容：POST /order/:id/cancel */
  @Post(':id/cancel')
  cancelPost(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.svc.cancelByUser(u.id, id, dto);
  }

  @Put(':id/confirm')
  confirm(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.confirm(u.id, id);
  }

  /** 前端兼容：POST /order/:id/confirm */
  @Post(':id/confirm')
  confirmPost(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.confirm(u.id, id);
  }
}

/* ==================== B 端 ==================== */
@Auth('admin')
@Controller('admin/order')
export class AdminOrderController {
  constructor(private readonly svc: OrderService) {}

  @Get()
  list(@Query() query: OrderListAdminDto) {
    return this.svc.listForAdmin(query);
  }

  @Get('export')
  async export(@Query() query: OrderListAdminDto, @Res() res: Response) {
    const buf = await this.svc.exportXlsx(query);
    const filename = `orders-${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(buf);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @CheckPermission('order:ship')
  @Post(':id/ship')
  ship(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShipOrderDto,
  ) {
    return this.svc.ship(u.id, u.username ?? '', id, dto);
  }

  @CheckPermission('order:cancel')
  @Put(':id/cancel')
  cancel(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.svc.cancelByAdmin(u.id, u.username ?? '', id, dto);
  }

  /** 前端兼容：POST /admin/order/:id/cancel */
  @CheckPermission('order:cancel')
  @Post(':id/cancel')
  cancelPost(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.svc.cancelByAdmin(u.id, u.username ?? '', id, dto);
  }

  @CheckPermission('order:cancel')
  @Post(':id/refund')
  refund(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { reason: string; amount?: number },
  ) {
    return this.svc.refundByAdmin(u.id, u.username ?? '', id, dto);
  }

  @CheckPermission('order:update')
  @Post(':id/remark')
  remark(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { remark: string },
  ) {
    return this.svc.addRemark(u.id, u.username ?? '', id, dto.remark);
  }
}
