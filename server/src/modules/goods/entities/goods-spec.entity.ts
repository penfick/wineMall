import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

@Entity('goods_specs')
@Index('idx_stock_warning', ['stock', 'stockWarning'])
export class GoodsSpecEntity extends SoftDeleteEntity {
  @Index('idx_goods_id')
  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @Index('idx_sku_no', { unique: true })
  @Column({ type: 'varchar', length: 20, name: 'sku_no' })
  skuNo: string;

  @Column({ type: 'varchar', length: 200, default: '', name: 'attr_text' })
  attrText: string;

  @Column({ type: 'varchar', length: 100, default: '', name: 'sku_code' })
  skuCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'market_price' })
  marketPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'cost_price' })
  costPrice: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  image: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  @Column({ type: 'int', unsigned: true, default: 10, name: 'stock_warning' })
  stockWarning: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  weight: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number; // 1=有效 0=失效
}
