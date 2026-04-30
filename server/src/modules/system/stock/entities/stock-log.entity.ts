import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 库存流水
 * action:
 *   1=入库（管理员手工增加）
 *   2=出库（管理员手工减少）
 *   3=订单扣减
 *   4=订单回滚（取消/超时）
 *   5=订单实际出库（发货时）
 */
@Entity('stock_logs')
@Index('idx_sku_id', ['skuId'])
@Index('idx_goods_id', ['goodsId'])
@Index('idx_order_no', ['orderNo'])
export class StockLogEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @Column({ type: 'int', unsigned: true, name: 'sku_id' })
  skuId: number;

  @Column({ type: 'tinyint', unsigned: true })
  action: number;

  /** 变化量（正数=增加，负数=减少）*/
  @Column({ type: 'int' })
  change: number;

  /** 变更后库存 */
  @Column({ type: 'int', unsigned: true, name: 'stock_after' })
  stockAfter: number;

  @Column({ type: 'varchar', length: 32, default: '', name: 'order_no' })
  orderNo: string;

  @Column({ type: 'int', unsigned: true, default: 0, name: 'operator_id' })
  operatorId: number;

  @Column({ type: 'varchar', length: 50, default: '', name: 'operator_name' })
  operatorName: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  remark: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}

export const StockAction = {
  IN: 1,
  OUT: 2,
  ORDER_DEDUCT: 3,
  ORDER_REVERT: 4,
  ORDER_SHIP: 5,
} as const;
