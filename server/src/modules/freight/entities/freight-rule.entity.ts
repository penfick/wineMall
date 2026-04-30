import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('freight_rules')
export class FreightRuleEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Index('idx_template_id')
  @Column({ type: 'int', unsigned: true, name: 'template_id' })
  templateId: number;

  /** JSON 数组省份编码字符串，NULL=兜底默认 */
  @Column({ type: 'text', nullable: true, name: 'region_codes' })
  regionCodes: string | null;

  @Column({ type: 'int', unsigned: true, default: 1, name: 'first_unit' })
  firstUnit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'first_fee' })
  firstFee: string;

  @Column({ type: 'int', unsigned: true, default: 1, name: 'continue_unit' })
  continueUnit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'continue_fee' })
  continueFee: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
