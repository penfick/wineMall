import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('favorites')
@Index('idx_user_goods', ['userId', 'goodsId'], { unique: true })
@Index('idx_goods_id', ['goodsId'])
export class FavoriteEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
