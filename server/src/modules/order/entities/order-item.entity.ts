import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_items')
@Index('idx_order_id', ['orderId'])
@Index('idx_goods_id', ['goodsId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'order_id' })
  orderId: number;

  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @Column({ type: 'int', unsigned: true, name: 'sku_id' })
  skuId: number;

  @Column({ type: 'varchar', length: 200, name: 'goods_name' })
  goodsName: string;

  @Column({ type: 'varchar', length: 200, name: 'spec_name' })
  specName: string;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', precision: 0, nullable: true })
  deletedAt: Date | null;
}
