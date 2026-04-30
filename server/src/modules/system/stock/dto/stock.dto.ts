import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { StockAction } from '../entities/stock-log.entity';

/**
 * 兼容前端两种入参：
 *   1) {skuId, action: 1|2, change: number > 0, remark}                  （后端原生）
 *   2) {skuId, changeQty: ±number, remark}                              （前端旧用法）
 *      changeQty > 0 → action=1（入库），change=changeQty
 *      changeQty < 0 → action=2（出库），change=|changeQty|
 */
export class StockAdjustDto {
  @IsInt()
  @Min(1)
  skuId: number;

  /** 1=入库（正数 change） 2=出库（正数 change，内部转负）*/
  @Transform(({ value, obj }) => {
    if (value === StockAction.IN || value === StockAction.OUT) return value;
    const cq = Number((obj as Record<string, unknown>).changeQty);
    if (Number.isFinite(cq)) return cq >= 0 ? StockAction.IN : StockAction.OUT;
    return value;
  })
  @IsInt()
  @IsIn([StockAction.IN, StockAction.OUT])
  action: number;

  /** 变更数量绝对值，必须 > 0 */
  @Transform(({ value, obj }) => {
    if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
    const cq = Number((obj as Record<string, unknown>).changeQty);
    if (Number.isFinite(cq)) return Math.abs(cq);
    return value;
  })
  @IsInt()
  @Min(1)
  @Max(1000000)
  change: number;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  remark?: string;
}

export class StockWarningDto {
  @IsInt()
  @Min(1)
  skuId: number;

  @IsInt()
  @Min(0)
  @Max(1000000)
  stockWarning: number;
}

export class StockLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  goodsId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skuId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  action?: number;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  orderNo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  keyword?: string;

  /** in / out / adjust / order / cancel */
  @IsOptional()
  @IsString()
  @IsIn(['in', 'out', 'adjust', 'order', 'cancel'])
  type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
