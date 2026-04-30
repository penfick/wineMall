import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('banners')
@Index('idx_status_sort', ['status', 'sort'])
export class BannerEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, default: '' })
  title: string;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl: string;

  /** 0=无 1=商品详情 2=品类列表 3=外链 */
  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'link_type' })
  linkType: number;

  @Column({ type: 'varchar', length: 500, default: '', name: 'link_value' })
  linkValue: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;
}
