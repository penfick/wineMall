import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** 下单/预览的商品项（来自购物车或立即购买）*/
export class OrderItemInputDto {
  @IsInt()
  @Min(1)
  skuId: number;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

/**
 * source 归一化：
 *   'cart' / 1 → 1（购物车结算）
 *   'goods' / 2 → 2（立即购买）
 *
 * 注：必须从 obj 取原始值——全局 ValidationPipe 开了 enableImplicitConversion，
 * 会按 ts 字段类型 number 提前把 'cart' 强转成 NaN，传到 value 里就丢了。
 */
function normalizeSource(obj: Record<string, unknown>): number | unknown {
  const v = obj.source;
  if (v === 'cart' || v === 1 || v === '1') return 1;
  if (v === 'goods' || v === 2 || v === '2') return 2;
  return v;
}

/**
 * items 归一化：兼容前端两种格式
 *   1) items: [{skuId, quantity}]                （已是后端格式）
 *   2) skuId + qty                              （立即购买）
 *   3) cartIds: number[]                        （购物车结算，cartIds 实际就是 skuId 数组）
 *
 * 注意：购物车以 skuId 作为 Hash field，前端 cartIds 传入的就是 skuId 列表。
 * 若来自购物车（source=1），quantity 由后端从购物车实际数据补齐。
 */
/**
 * 把 obj.cartIds / obj.skuId+qty 归一化进 obj.items（就地修改 obj）。
 * 必须在 source 字段的 @Transform 里调用——@Transform 只在字段存在时触发，
 * items 缺失时挂在 items 上的 transform 永远不跑。
 */
function ensureItemsOnObj(obj: Record<string, unknown>): void {
  if (Array.isArray(obj.items) && obj.items.length) return;
  const cartIds = obj.cartIds;
  if (Array.isArray(cartIds) && cartIds.length) {
    obj.items = cartIds.map((skuId: unknown) => ({
      skuId: Number(skuId),
      quantity: 1,
    }));
    return;
  }
  const skuId = obj.skuId;
  const qty = obj.qty ?? obj.quantity;
  if (skuId !== undefined && qty !== undefined) {
    obj.items = [{ skuId: Number(skuId), quantity: Number(qty) }];
  }
}

function normalizeItems(obj: Record<string, unknown>): Array<{ skuId: number; quantity: number }> | unknown {
  if (Array.isArray(obj.items) && obj.items.length) return obj.items;

  const cartIds = obj.cartIds;
  if (Array.isArray(cartIds) && cartIds.length) {
    // qty 为占位，service 会按 source=1 时从购物车里取实际数量
    return cartIds.map((skuId: unknown) => ({
      skuId: Number(skuId),
      quantity: 1,
    }));
  }

  const skuId = obj.skuId;
  const qty = obj.qty ?? obj.quantity;
  if (skuId !== undefined && qty !== undefined) {
    return [{ skuId: Number(skuId), quantity: Number(qty) }];
  }

  return obj.items;
}

/** 1=购物车结算 2=立即购买 */
export class OrderPreviewDto {
  @Transform(({ obj }) => {
    ensureItemsOnObj(obj);
    return normalizeSource(obj);
  })
  @IsInt()
  @IsIn([1, 2])
  source: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  /** 兼容前端旧字段：购物车 skuId 数组（被 ensureItemsOnObj 转为 items）*/
  @IsOptional()
  @IsArray()
  cartIds?: number[];

  /** 兼容前端旧字段：立即购买 skuId */
  @IsOptional()
  @IsInt()
  skuId?: number;

  /** 兼容前端旧字段：立即购买数量 */
  @IsOptional()
  @IsInt()
  qty?: number;

  /** 收货地址 ID（可选，用于试算运费）*/
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;
}

export class CreateOrderDto {
  @Transform(({ obj }) => {
    ensureItemsOnObj(obj);
    return normalizeSource(obj);
  })
  @IsInt()
  @IsIn([1, 2])
  source: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsOptional()
  @IsArray()
  cartIds?: number[];

  @IsOptional()
  @IsInt()
  skuId?: number;

  @IsOptional()
  @IsInt()
  qty?: number;

  @IsInt()
  @Min(1)
  addressId: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;

  /** 下单幂等 key（前端 UUID）*/
  @IsOptional()
  @IsString()
  @Length(0, 64)
  clientNo?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

export class ShipOrderDto {
  @IsInt()
  @Min(1)
  logisticsCompanyId: number;

  @IsString()
  @Length(1, 50)
  trackingNo: string;
}

export class OrderListUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  /** -1=全部 0=待付款 1=待发货 2=待收货 3=已完成 4=已取消 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([-1, 0, 1, 2, 3, 4])
  status?: number;
}

export class OrderListAdminDto extends OrderListUserDto {
  @IsOptional()
  @IsString()
  @Length(0, 30)
  orderNo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
