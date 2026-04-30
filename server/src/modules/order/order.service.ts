import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { RedisService } from '@shared/redis/redis.service';
import { IdGeneratorService } from '@shared/id/id-generator.service';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';
import { UserEntity } from '@modules/user/entities/user.entity';
import { AddressService } from '@modules/address/address.service';
import { FreightService } from '@modules/freight/freight.service';
import { CartService } from '@modules/cart/cart.service';
import { LogisticsService } from '@modules/logistics/logistics.service';
import { LogisticsCompanyEntity } from '@modules/logistics/entities/logistics-company.entity';
import { StockService } from '@modules/system/stock/stock.service';
import { StockAction } from '@modules/system/stock/entities/stock-log.entity';

import { OrderEntity, OrderStatus } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderLogEntity } from './entities/order-log.entity';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderItemInputDto,
  OrderListAdminDto,
  OrderListUserDto,
  OrderPreviewDto,
  ShipOrderDto,
} from './dto/order.dto';

const ORDER_TIMEOUT_SECONDS = 30 * 60; // 30 分钟超时
const IDEMPOTENT_TTL = 60; // 同 clientNo 1 分钟内只能下单一次

interface ResolvedItem {
  goodsId: number;
  skuId: number;
  goodsName: string;
  specName: string;
  imageUrl: string;
  price: string;
  quantity: number;
  subtotal: string;
  weight: number;
  freightTemplateId: number | null;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    @InjectRepository(OrderLogEntity)
    private readonly logRepo: Repository<OrderLogEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectRepository(GoodsImageEntity)
    private readonly imgRepo: Repository<GoodsImageEntity>,
    @InjectRepository(LogisticsCompanyEntity)
    private readonly companyRepo: Repository<LogisticsCompanyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly redis: RedisService,
    private readonly idGen: IdGeneratorService,
    private readonly addressSvc: AddressService,
    private readonly freightSvc: FreightService,
    private readonly cartSvc: CartService,
    private readonly logisticsSvc: LogisticsService,
    private readonly stockSvc: StockService,
  ) {}

  // ==================== 工具：解析下单/预览的商品项 ====================

  /**
   * 当 source=1（购物车结算）时，前端可能只传了 skuId 列表（quantity 占位 1）。
   * 此处用购物车里的真实数量覆盖；找不到对应购物车项就保留前端传入的 quantity。
   */
  private async fillQtyFromCart(
    userId: number,
    items: OrderItemInputDto[],
  ): Promise<OrderItemInputDto[]> {
    const cartItems = await this.cartSvc.getSelectedItems(userId);
    const qtyMap = new Map(cartItems.map((c) => [c.skuId, c.qty]));
    return items.map((i) => ({
      skuId: i.skuId,
      quantity: qtyMap.get(i.skuId) ?? i.quantity,
    }));
  }

  private async resolveItems(
    items: OrderItemInputDto[],
  ): Promise<ResolvedItem[]> {
    if (!items.length) {
      throw new BusinessException(ErrorCode.CART_EMPTY);
    }
    const skuIds = items.map((i) => i.skuId);
    const skus = await this.skuRepo.find({
      where: { id: In(skuIds), deletedAt: IsNull() },
    });
    if (skus.length !== skuIds.length) {
      throw new BusinessException(ErrorCode.SKU_NOT_FOUND);
    }
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const goodsIds = Array.from(new Set(skus.map((s) => s.goodsId)));
    const goods = await this.goodsRepo.find({
      where: { id: In(goodsIds), deletedAt: IsNull() },
    });
    const goodsMap = new Map(goods.map((g) => [g.id, g]));
    if (goods.length !== goodsIds.length) {
      throw new BusinessException(ErrorCode.GOODS_NOT_FOUND);
    }
    for (const g of goods) {
      if (g.status !== 1) {
        throw new BusinessException(
          ErrorCode.GOODS_OFF_SHELF,
          `「${g.name}」已下架`,
        );
      }
    }

    // 取首图
    const imgRows = await this.imgRepo
      .createQueryBuilder('i')
      .select('i.goods_id', 'goodsId')
      .addSelect('MIN(i.id)', 'imgId')
      .where('i.goods_id IN (:...ids)', { ids: goodsIds })
      .groupBy('i.goods_id')
      .getRawMany<{ goodsId: number; imgId: number }>();
    const imgIds = imgRows.map((r) => Number(r.imgId));
    const imgs = imgIds.length
      ? await this.imgRepo.find({ where: { id: In(imgIds) } })
      : [];
    const imgUrlMap = new Map(imgs.map((i) => [i.id, i.imageUrl]));
    const coverMap = new Map<number, string>();
    for (const r of imgRows) {
      const url = imgUrlMap.get(Number(r.imgId));
      if (url) coverMap.set(Number(r.goodsId), url);
    }

    return items.map((it) => {
      const sku = skuMap.get(it.skuId)!;
      const g = goodsMap.get(sku.goodsId)!;
      if (sku.stock < it.quantity) {
        throw new BusinessException(
          ErrorCode.STOCK_NOT_ENOUGH,
          `「${g.name}」${sku.attrText} 库存仅剩 ${sku.stock}`,
        );
      }
      const subtotalCents = Math.round(parseFloat(sku.price) * 100) * it.quantity;
      return {
        goodsId: sku.goodsId,
        skuId: sku.id,
        goodsName: g.name,
        specName: sku.attrText,
        imageUrl: coverMap.get(sku.goodsId) ?? '',
        price: sku.price,
        quantity: it.quantity,
        subtotal: (subtotalCents / 100).toFixed(2),
        weight: sku.weight,
        freightTemplateId: g.freightTemplateId,
      };
    });
  }

  // ==================== 预览（试算）====================

  async preview(userId: number, dto: OrderPreviewDto) {
    const inputItems = dto.source === 1
      ? await this.fillQtyFromCart(userId, dto.items)
      : dto.items;
    const items = await this.resolveItems(inputItems);
    const totalCents = items.reduce(
      (s, x) => s + Math.round(parseFloat(x.subtotal) * 100),
      0,
    );

    let freight = { amount: '0.00', details: [] as Array<{ templateId: number; amount: string; reason: string }> };
    let address: Awaited<ReturnType<AddressService['getDefault']>> | null = null;
    if (dto.addressId) {
      address = await this.addressSvc.detail(userId, dto.addressId);
    } else {
      address = await this.addressSvc.getDefault(userId);
    }
    if (address) {
      freight = await this.freightSvc.calcInternal(
        items.map((i) => ({
          goodsId: i.goodsId,
          skuId: i.skuId,
          qty: i.quantity,
          weight: i.weight,
          price: parseFloat(i.price),
          freightTemplateId: i.freightTemplateId,
        })),
        address.provinceCode,
      );
    }

    const freightCents = Math.round(parseFloat(freight.amount) * 100);
    const payCents = totalCents + freightCents;
    return {
      items,
      totalAmount: (totalCents / 100).toFixed(2),
      freightAmount: freight.amount,
      freightDetails: freight.details,
      payAmount: (payCents / 100).toFixed(2),
      address,
    };
  }

  // ==================== 创建订单 ====================

  async create(userId: number, dto: CreateOrderDto) {
    // 幂等：clientNo 1 分钟内只允许一次
    if (dto.clientNo) {
      const idemKey = CacheKey.idempotent(`order:${userId}:${dto.clientNo}`);
      const ok = await this.redis.tryLock(idemKey, IDEMPOTENT_TTL);
      if (!ok) {
        throw new BusinessException(ErrorCode.IDEMPOTENT_REPEAT);
      }
    }

    const address = await this.addressSvc.detail(userId, dto.addressId);
    if (!address) throw new BusinessException(ErrorCode.ADDRESS_REQUIRED);

    const inputItems = dto.source === 1
      ? await this.fillQtyFromCart(userId, dto.items)
      : dto.items;
    const items = await this.resolveItems(inputItems);
    const totalCents = items.reduce(
      (s, x) => s + Math.round(parseFloat(x.subtotal) * 100),
      0,
    );
    const freight = await this.freightSvc.calcInternal(
      items.map((i) => ({
        goodsId: i.goodsId,
        skuId: i.skuId,
        qty: i.quantity,
        weight: i.weight,
        price: parseFloat(i.price),
        freightTemplateId: i.freightTemplateId,
      })),
      address.provinceCode,
    );
    const freightCents = Math.round(parseFloat(freight.amount) * 100);
    const payCents = totalCents + freightCents;

    const orderNo = this.idGen.nextOrderNo();

    const created = await this.ds.transaction(async (m) => {
      // 1. 扣库存（pessimistic_write 行锁）
      await this.stockSvc.applyInTx(
        m,
        items.map((i) => ({ skuId: i.skuId, quantity: i.quantity, goodsId: i.goodsId })),
        StockAction.ORDER_DEDUCT,
        { orderNo, operatorId: userId, operatorName: '用户下单' },
      );

      // 1.1 同步更新 goods 表的销量 / 库存（聚合字段，给列表卡片展示用）
      const goodsAggMap = new Map<number, number>();
      for (const i of items) {
        goodsAggMap.set(i.goodsId, (goodsAggMap.get(i.goodsId) ?? 0) + i.quantity);
      }
      for (const [goodsId, qty] of goodsAggMap) {
        await m.getRepository(GoodsEntity)
          .createQueryBuilder()
          .update()
          .set({
            sales: () => `sales + ${qty}`,
            stock: () => `GREATEST(stock - ${qty}, 0)`,
          })
          .where('id = :id', { id: goodsId })
          .execute();
      }

      // 2. 建订单
      const order = await m.getRepository(OrderEntity).save(
        m.getRepository(OrderEntity).create({
          orderNo,
          userId,
          status: OrderStatus.PENDING_PAY,
          totalAmount: (totalCents / 100).toFixed(2),
          freightAmount: (freightCents / 100).toFixed(2),
          payAmount: (payCents / 100).toFixed(2),
          receiverName: address.receiverName,
          receiverPhone: address.receiverPhone,
          receiverProvinceCode: address.provinceCode,
          receiverCityCode: address.cityCode,
          receiverDistrictCode: address.districtCode,
          receiverProvince: address.provinceName,
          receiverCity: address.cityName,
          receiverDistrict: address.districtName,
          receiverAddress: address.detailAddress,
          remark: dto.remark ?? '',
          cancelReason: '',
          logisticsCompanyId: null,
          trackingNo: '',
          paidAt: null,
          shippedAt: null,
          completedAt: null,
          cancelledAt: null,
        }),
      );

      // 3. 写订单明细
      await m.getRepository(OrderItemEntity).save(
        items.map((i) =>
          m.getRepository(OrderItemEntity).create({
            orderId: order.id,
            goodsId: i.goodsId,
            skuId: i.skuId,
            goodsName: i.goodsName,
            specName: i.specName,
            imageUrl: i.imageUrl,
            price: i.price,
            quantity: i.quantity,
            subtotal: i.subtotal,
          }),
        ),
      );

      // 4. 写操作日志
      await m.getRepository(OrderLogEntity).save(
        m.getRepository(OrderLogEntity).create({
          orderId: order.id,
          operatorType: 1,
          operatorId: userId,
          operatorName: '用户',
          action: 'CREATE',
          content: `下单成功，订单号 ${orderNo}，应付 ${(payCents / 100).toFixed(2)}`,
        }),
      );

      return order;
    });

    // 事务外：清缓存 + 清购物车（购物车结算才清）
    await this.stockSvc.invalidateAfterTx(items.map((i) => i.goodsId));
    if (dto.source === 1) {
      await this.cartSvc.removeAfterOrder(
        userId,
        items.map((i) => i.skuId),
      );
    }
    await this.redis.set(
      CacheKey.orderLastTime(userId),
      String(Date.now()),
      IDEMPOTENT_TTL,
    );

    return {
      id: created.id,
      orderNo: created.orderNo,
      payAmount: created.payAmount,
      status: created.status,
    };
  }

  // ==================== 模拟支付 ====================

  async payMock(userId: number, orderId: number) {
    const o = await this.assertUserOrder(userId, orderId);
    if (o.status !== OrderStatus.PENDING_PAY) {
      if (o.status === OrderStatus.PENDING_SHIP) {
        throw new BusinessException(ErrorCode.ORDER_ALREADY_PAID);
      }
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID);
    }
    o.status = OrderStatus.PENDING_SHIP;
    o.paidAt = new Date();
    await this.orderRepo.save(o);
    await this.logRepo.save(
      this.logRepo.create({
        orderId: o.id,
        operatorType: 1,
        operatorId: userId,
        operatorName: '用户',
        action: 'PAY_MOCK',
        content: `模拟支付成功，金额 ${o.payAmount}`,
      }),
    );
    await this.redis.del(CacheKey.orderDetail(o.id));
    return { id: o.id, status: o.status, paidAt: o.paidAt };
  }

  // ==================== 取消订单（用户/系统/管理员通用底层）====================

  async cancelByUser(userId: number, orderId: number, dto: CancelOrderDto) {
    const o = await this.assertUserOrder(userId, orderId);
    if (o.status !== OrderStatus.PENDING_PAY) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '只有待付款订单可以取消');
    }
    return this.cancelInternal(o, {
      reason: dto.reason ?? '用户主动取消',
      operatorType: 1,
      operatorId: userId,
      operatorName: '用户',
    });
  }

  async cancelByAdmin(adminId: number, adminName: string, orderId: number, dto: CancelOrderDto) {
    const o = await this.orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
    if (!o) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    if (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID);
    }
    if (o.status === OrderStatus.PENDING_SHIP || o.status === OrderStatus.PENDING_RECEIVE) {
      // 已支付 / 已发货：MVP 暂不支持，需要走退款
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '已支付订单请走退款流程');
    }
    return this.cancelInternal(o, {
      reason: dto.reason ?? '管理员取消',
      operatorType: 2,
      operatorId: adminId,
      operatorName: adminName,
    });
  }

  /** 系统取消（定时任务调用：超时未付款）*/
  async cancelBySystem(orderId: number, reason = '超时未付款，自动取消') {
    const o = await this.orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
    if (!o) return;
    if (o.status !== OrderStatus.PENDING_PAY) return;
    await this.cancelInternal(o, {
      reason,
      operatorType: 3,
      operatorId: 0,
      operatorName: '系统',
    });
  }

  private async cancelInternal(
    o: OrderEntity,
    ctx: { reason: string; operatorType: 1 | 2 | 3; operatorId: number; operatorName: string },
  ) {
    const items = await this.itemRepo.find({ where: { orderId: o.id } });
    const goodsIds = Array.from(new Set(items.map((i) => i.goodsId)));

    await this.ds.transaction(async (m) => {
      // 仅未发货订单可恢复库存（已发货走退货流程，不在 MVP）
      if (
        o.status === OrderStatus.PENDING_PAY ||
        o.status === OrderStatus.PENDING_SHIP
      ) {
        await this.stockSvc.applyInTx(
          m,
          items.map((i) => ({ skuId: i.skuId, quantity: i.quantity, goodsId: i.goodsId })),
          StockAction.ORDER_REVERT,
          {
            orderNo: o.orderNo,
            operatorId: ctx.operatorId,
            operatorName: ctx.operatorName,
            remark: ctx.reason,
          },
        );

        // 反向同步 goods 表的销量 / 库存（与下单时的聚合更新对应）
        const goodsAggMap = new Map<number, number>();
        for (const i of items) {
          goodsAggMap.set(i.goodsId, (goodsAggMap.get(i.goodsId) ?? 0) + i.quantity);
        }
        for (const [goodsId, qty] of goodsAggMap) {
          await m.getRepository(GoodsEntity)
            .createQueryBuilder()
            .update()
            .set({
              sales: () => `GREATEST(sales - ${qty}, 0)`,
              stock: () => `stock + ${qty}`,
            })
            .where('id = :id', { id: goodsId })
            .execute();
        }
      }
      o.status = OrderStatus.CANCELLED;
      o.cancelReason = ctx.reason;
      o.cancelledAt = new Date();
      await m.getRepository(OrderEntity).save(o);
      await m.getRepository(OrderLogEntity).save(
        m.getRepository(OrderLogEntity).create({
          orderId: o.id,
          operatorType: ctx.operatorType,
          operatorId: ctx.operatorId,
          operatorName: ctx.operatorName,
          action: 'CANCEL',
          content: `订单取消：${ctx.reason}`,
        }),
      );
    });

    await this.stockSvc.invalidateAfterTx(goodsIds);
    await this.redis.del(CacheKey.orderDetail(o.id));
    return { id: o.id, status: o.status };
  }

  // ==================== 退款（MVP：仅记录，不实际退款）====================

  async refundByAdmin(
    adminId: number,
    adminName: string,
    orderId: number,
    dto: { reason: string; amount?: number },
  ) {
    const o = await this.orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
    if (!o) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    if (o.status === OrderStatus.PENDING_PAY) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '未支付订单无需退款');
    }
    if (o.status === OrderStatus.CANCELLED) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '已取消订单不可退款');
    }
    const reason = (dto.reason || '').trim() || '管理员发起退款';
    const amountText = dto.amount ? `￥${Number(dto.amount).toFixed(2)}` : `￥${o.payAmount}`;
    return this.cancelInternal(o, {
      reason: `退款：${amountText}（${reason}）`,
      operatorType: 2,
      operatorId: adminId,
      operatorName: adminName,
    });
  }

  // ==================== 备注（B 端）====================

  async addRemark(
    adminId: number,
    adminName: string,
    orderId: number,
    remark: string,
  ) {
    const o = await this.orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
    if (!o) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    const text = (remark || '').trim();
    if (!text) throw new BusinessException(ErrorCode.PARAM_INVALID, '备注内容不能为空');

    await this.ds.transaction(async (m) => {
      o.remark = text;
      await m.getRepository(OrderEntity).save(o);
      await m.getRepository(OrderLogEntity).save(
        m.getRepository(OrderLogEntity).create({
          orderId: o.id,
          operatorType: 2,
          operatorId: adminId,
          operatorName: adminName,
          action: 'REMARK',
          content: `修改备注：${text}`,
        }),
      );
    });

    await this.redis.del(CacheKey.orderDetail(o.id));
    return { id: o.id };
  }

  // ==================== 发货（B 端）====================

  async ship(adminId: number, adminName: string, orderId: number, dto: ShipOrderDto) {
    const o = await this.orderRepo.findOne({ where: { id: orderId, deletedAt: IsNull() } });
    if (!o) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    if (o.status !== OrderStatus.PENDING_SHIP) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '只有待发货订单可以发货');
    }
    const company = await this.companyRepo.findOne({
      where: { id: dto.logisticsCompanyId },
    });
    if (!company || company.status !== 1) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '物流公司不存在或已禁用');
    }

    await this.ds.transaction(async (m) => {
      o.status = OrderStatus.PENDING_RECEIVE;
      o.logisticsCompanyId = company.id;
      o.trackingNo = dto.trackingNo;
      o.shippedAt = new Date();
      await m.getRepository(OrderEntity).save(o);

      await m.getRepository(OrderLogEntity).save(
        m.getRepository(OrderLogEntity).create({
          orderId: o.id,
          operatorType: 2,
          operatorId: adminId,
          operatorName: adminName,
          action: 'SHIP',
          content: `已发货：${company.name} ${dto.trackingNo}`,
        }),
      );

      // 写一条初始物流轨迹
      await this.logisticsSvc.createInitialTrack(
        m,
        o.id,
        `【${company.name}】商家已揽件`,
      );
    });

    await this.redis.del(CacheKey.orderDetail(o.id));
    return { id: o.id, status: o.status, shippedAt: o.shippedAt };
  }

  // ==================== 确认收货（C 端）====================

  async confirm(userId: number, orderId: number) {
    const o = await this.assertUserOrder(userId, orderId);
    if (o.status !== OrderStatus.PENDING_RECEIVE) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, '只有待收货订单可以确认');
    }
    o.status = OrderStatus.COMPLETED;
    o.completedAt = new Date();
    await this.orderRepo.save(o);
    await this.logRepo.save(
      this.logRepo.create({
        orderId: o.id,
        operatorType: 1,
        operatorId: userId,
        operatorName: '用户',
        action: 'CONFIRM',
        content: '用户确认收货',
      }),
    );
    await this.redis.del(CacheKey.orderDetail(o.id));
    return { id: o.id, status: o.status, completedAt: o.completedAt };
  }

  // ==================== 查询（C 端 / B 端 / 详情）====================

  async listForUser(userId: number, query: OrderListUserDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.user_id = :uid', { uid: userId })
      .andWhere('o.deleted_at IS NULL');
    if (query.status !== undefined && query.status !== -1) {
      qb.andWhere('o.status = :st', { st: query.status });
    }
    qb.orderBy('o.id', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [orders, total] = await qb.getManyAndCount();
    const items = await this.loadItemsByOrderIds(orders.map((o) => o.id));
    return {
      list: orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] })),
      total,
      page,
      pageSize,
    };
  }

  async listForAdmin(query: OrderListAdminDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.deleted_at IS NULL');

    if (query.status !== undefined && query.status !== -1) {
      qb.andWhere('o.status = :st', { st: query.status });
    }
    if (query.orderNo) {
      qb.andWhere('o.order_no LIKE :no', { no: `%${query.orderNo}%` });
    }
    if (query.receiverName) {
      qb.andWhere('o.receiver_name LIKE :rn', { rn: `%${query.receiverName}%` });
    }
    if (query.receiverPhone) {
      qb.andWhere('o.receiver_phone LIKE :rp', { rp: `%${query.receiverPhone}%` });
    }
    if (query.startDate) {
      qb.andWhere('o.created_at >= :sd', { sd: `${query.startDate} 00:00:00` });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :ed', { ed: `${query.endDate} 23:59:59` });
    }

    qb.orderBy('o.id', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [orders, total] = await qb.getManyAndCount();
    const items = await this.loadItemsByOrderIds(orders.map((o) => o.id));

    // 富化：买家昵称/手机 + 物流公司名（B 端列表展示用）
    const userIds = Array.from(new Set(orders.map((o) => o.userId).filter(Boolean)));
    const companyIds = Array.from(
      new Set(orders.map((o) => o.logisticsCompanyId).filter((v): v is number => !!v)),
    );
    const [users, companies] = await Promise.all([
      userIds.length
        ? this.userRepo.find({
            where: { id: In(userIds) },
            select: ['id', 'nickname', 'phone'],
          })
        : Promise.resolve([] as UserEntity[]),
      companyIds.length
        ? this.companyRepo.find({ where: { id: In(companyIds) } })
        : Promise.resolve([] as LogisticsCompanyEntity[]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    return {
      list: orders.map((o) => {
        const u = userMap.get(o.userId);
        const c = o.logisticsCompanyId ? companyMap.get(o.logisticsCompanyId) : null;
        return {
          ...o,
          items: items.get(o.id) ?? [],
          userName: u?.nickname || u?.phone || (u ? `用户${u.id}` : ''),
          userPhone: u?.phone ?? '',
          logisticsCompanyName: c?.name ?? '',
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  /** 详情（C/B 通用，B 端不限 userId） */
  async detail(orderId: number, userId?: number) {
    // 短缓存（仅按 id 缓存，命中后用 userId 二次校验）
    const cached = await this.redis.getJson<{
      order: OrderEntity;
      items: OrderItemEntity[];
      logs: OrderLogEntity[];
    }>(CacheKey.orderDetail(orderId));
    let payload = cached;

    if (!payload) {
      const order = await this.orderRepo.findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
      const [items, logs] = await Promise.all([
        this.itemRepo.find({ where: { orderId } }),
        this.logRepo.find({ where: { orderId }, order: { id: 'DESC' } }),
      ]);
      payload = { order, items, logs };
      await this.redis.setJson(
        CacheKey.orderDetail(orderId),
        payload,
        CacheTTL.ORDER_DETAIL,
      );
    }

    if (userId !== undefined && payload.order.userId !== userId) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    }

    // 富化：买家信息 + 物流公司名（B 端详情/C 端均无害）
    const [user, company] = await Promise.all([
      payload.order.userId
        ? this.userRepo.findOne({
            where: { id: payload.order.userId },
            select: ['id', 'nickname', 'phone'],
          })
        : Promise.resolve(null),
      payload.order.logisticsCompanyId
        ? this.companyRepo.findOne({ where: { id: payload.order.logisticsCompanyId } })
        : Promise.resolve(null),
    ]);
    return {
      ...payload,
      order: {
        ...payload.order,
        userName: user?.nickname || user?.phone || (user ? `用户${user.id}` : ''),
        userPhone: user?.phone ?? '',
        logisticsCompanyName: company?.name ?? '',
      },
    };
  }

  private async loadItemsByOrderIds(orderIds: number[]) {
    const out = new Map<number, OrderItemEntity[]>();
    if (!orderIds.length) return out;
    const list = await this.itemRepo.find({
      where: { orderId: In(orderIds) },
      order: { id: 'ASC' },
    });
    for (const it of list) {
      const arr = out.get(it.orderId) ?? [];
      arr.push(it);
      out.set(it.orderId, arr);
    }
    return out;
  }

  private async assertUserOrder(userId: number, orderId: number) {
    const o = await this.orderRepo.findOne({
      where: { id: orderId, userId, deletedAt: IsNull() },
    });
    if (!o) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    return o;
  }

  // ==================== Excel 导出（B 端）====================

  /**
   * 导出 xlsx（标准 Excel 文件，用 exceljs 生成）
   * 返回 Buffer，由 controller 设置 content-type/disposition 直接 send
   */
  async exportXlsx(query: OrderListAdminDto): Promise<Buffer> {
    const { list } = await this.listForAdmin({ ...query, page: 1, pageSize: 1000 });

    const statusText: Record<number, string> = {
      0: '待付款',
      1: '待发货',
      2: '待收货',
      3: '已完成',
      4: '已取消',
      5: '退款中',
    };

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = '优选商城';
    wb.created = new Date();

    const ws = wb.addWorksheet('订单列表', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = [
      { header: '订单号', key: 'orderNo', width: 24 },
      { header: '下单时间', key: 'createdAt', width: 20 },
      { header: '状态', key: 'status', width: 10 },
      { header: '买家', key: 'userName', width: 16 },
      { header: '收货人', key: 'receiverName', width: 12 },
      { header: '手机', key: 'receiverPhone', width: 14 },
      { header: '省', key: 'receiverProvince', width: 10 },
      { header: '市', key: 'receiverCity', width: 10 },
      { header: '区', key: 'receiverDistrict', width: 10 },
      { header: '详细地址', key: 'receiverAddress', width: 30 },
      { header: '商品总额', key: 'totalAmount', width: 12 },
      { header: '运费', key: 'freightAmount', width: 10 },
      { header: '应付', key: 'payAmount', width: 12 },
      { header: '物流公司', key: 'logisticsCompanyName', width: 16 },
      { header: '物流单号', key: 'trackingNo', width: 22 },
      { header: '支付时间', key: 'paidAt', width: 20 },
      { header: '发货时间', key: 'shippedAt', width: 20 },
    ];

    // 表头样式
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 24;

    // 数据行
    for (const o of list) {
      ws.addRow({
        orderNo: o.orderNo,
        createdAt: this.formatDate(o.createdAt),
        status: statusText[o.status] ?? String(o.status),
        userName: (o as unknown as { userName?: string }).userName ?? '',
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        receiverProvince: o.receiverProvince,
        receiverCity: o.receiverCity,
        receiverDistrict: o.receiverDistrict,
        receiverAddress: o.receiverAddress,
        totalAmount: Number(o.totalAmount),
        freightAmount: Number(o.freightAmount),
        payAmount: Number(o.payAmount),
        logisticsCompanyName:
          (o as unknown as { logisticsCompanyName?: string }).logisticsCompanyName ?? '',
        trackingNo: o.trackingNo,
        paidAt: o.paidAt ? this.formatDate(o.paidAt) : '',
        shippedAt: o.shippedAt ? this.formatDate(o.shippedAt) : '',
      });
    }

    // 金额列格式
    for (const key of ['totalAmount', 'freightAmount', 'payAmount']) {
      const col = ws.getColumn(key);
      col.numFmt = '"￥"#,##0.00';
      col.alignment = { horizontal: 'right' };
    }

    // 全表加边框 + 行高
    ws.eachRow((row) => {
      row.height = Math.max(row.height ?? 18, 20);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // ==================== 定时任务用：找超时未付款订单 ====================

  /** 找出 createdAt 早于阈值且仍待付款的订单 ID 列表（最多 limit 条）*/
  async findTimeoutPendingPayIds(limit = 200): Promise<number[]> {
    const threshold = new Date(Date.now() - ORDER_TIMEOUT_SECONDS * 1000);
    const rows = await this.orderRepo.find({
      where: { status: OrderStatus.PENDING_PAY, deletedAt: IsNull() },
      select: ['id', 'createdAt'],
      take: limit,
      order: { id: 'ASC' },
    });
    return rows.filter((r) => r.createdAt <= threshold).map((r) => r.id);
  }
}
