import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('cart')
@Index('idx_user_sku', ['userId', 'skuId'], { unique: true })
@Index('idx_user_id', ['userId'])
export class CartEntity extends BaseEntity {
  @Column({ type: 'int', unsigned: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'int', unsigned: true, name: 'sku_id' })
  skuId: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  selected: number;
}
