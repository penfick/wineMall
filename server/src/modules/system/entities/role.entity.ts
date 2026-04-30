import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
  @Index('idx_name', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  description: string;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_system' })
  isSystem: number;
}
