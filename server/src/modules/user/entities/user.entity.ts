import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

@Entity('users')
export class UserEntity extends SoftDeleteEntity {
  @Index('idx_openid', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  openid: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  nickname: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  avatar: string;

  @Index('idx_phone')
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Index('idx_status')
  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number; // 1=启用 0=禁用
}
