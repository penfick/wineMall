import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('goods_images')
@Index('idx_goods_id', ['goodsId', 'sort'])
export class GoodsImageEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 500, default: '', name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
