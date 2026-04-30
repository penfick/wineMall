import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('sys_config')
export class SysConfigEntity extends BaseEntity {
  @Index('idx_config_key', { unique: true })
  @Column({ type: 'varchar', length: 50, name: 'config_key' })
  configKey: string;

  @Column({ type: 'text', name: 'config_value', default: '' })
  configValue: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  description: string;
}
