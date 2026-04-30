import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('dict_types')
export class DictTypeEntity extends BaseEntity {
  @Index('idx_code', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  description: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;
}
