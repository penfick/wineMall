import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('logistics_companies')
export class LogisticsCompanyEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Index('idx_code', { unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
