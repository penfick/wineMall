import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('notices')
@Index('idx_status_top', ['status', 'isTop', 'publishTime'])
export class NoticeEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  /** 0=草稿 1=已发布 */
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  status: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_top' })
  isTop: number;

  @Column({ type: 'datetime', nullable: true, precision: 0, name: 'publish_time' })
  publishTime: Date | null;
}
