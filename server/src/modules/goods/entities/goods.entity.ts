import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

@Entity('goods')
@Index('idx_sort_weight', ['sortWeight', 'createdAt'])
export class GoodsEntity extends SoftDeleteEntity {
  @Index('idx_goods_no', { unique: true })
  @Column({ type: 'varchar', length: 20, name: 'goods_no' })
  goodsNo: string;

  @Index('idx_category_id')
  @Column({ type: 'int', unsigned: true, name: 'category_id' })
  categoryId: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, default: '', name: 'sub_title' })
  subTitle: string;

  @Column({ type: 'varchar', length: 500, default: '', name: 'main_image' })
  mainImage: string;

  @Column({ type: 'varchar', length: 50, default: '件' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'market_price' })
  marketPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'cost_price' })
  costPrice: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  @Column({ type: 'int', unsigned: true, default: 10, name: 'stock_warning' })
  stockWarning: number;

  @Column({ type: 'mediumtext', nullable: true })
  detail: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index('idx_status')
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  status: number; // 1=上架 0=下架

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'int', default: 0, name: 'sort_weight' })
  sortWeight: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sales: number;

  @Column({ type: 'int', unsigned: true, nullable: true, name: 'freight_template_id' })
  freightTemplateId: number | null;
}
