import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Index('idx_parent_id')
  @Column({ type: 'int', unsigned: true, default: 0, name: 'parent_id' })
  parentId: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  icon: string;

  @Index('idx_sort')
  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;
}
