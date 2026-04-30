import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('dict_items')
@Index('idx_dict_type_id', ['dictTypeId', 'sort'])
@Index('idx_type_value', ['dictTypeId', 'value'], { unique: true })
export class DictItemEntity extends BaseEntity {
  @Column({ type: 'int', unsigned: true, name: 'dict_type_id' })
  dictTypeId: number;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 100 })
  value: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;
}
