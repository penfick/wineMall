import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('menus')
export class MenuEntity extends BaseEntity {
  @Index('idx_parent_id')
  @Column({ type: 'int', unsigned: true, default: 0, name: 'parent_id' })
  parentId: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  /** 1=目录 2=菜单 3=按钮 */
  @Column({ type: 'tinyint', unsigned: true })
  type: number;

  @Column({ type: 'varchar', length: 200, default: '' })
  path: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  component: string;

  @Index('idx_permission')
  @Column({ type: 'varchar', length: 100, default: '' })
  permission: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;
}
