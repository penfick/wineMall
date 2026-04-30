import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('regions')
export class RegionEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Index('idx_code', { unique: true })
  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Index('idx_parent_code')
  @Column({ type: 'varchar', length: 10, default: '0', name: 'parent_code' })
  parentCode: string;

  /** 1=省 2=市 3=区 */
  @Column({ type: 'tinyint', unsigned: true })
  level: number;
}
