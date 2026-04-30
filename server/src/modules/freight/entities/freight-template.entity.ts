import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('freight_templates')
export class FreightTemplateEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 1=按件 2=按重量 */
  @Column({ type: 'tinyint', unsigned: true, name: 'billing_type' })
  billingType: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_free' })
  isFree: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_default' })
  isDefault: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'free_threshold' })
  freeThreshold: string | null;
}
