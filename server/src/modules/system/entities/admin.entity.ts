import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

@Entity('admins')
export class AdminEntity extends SoftDeleteEntity {
  @Index('idx_username', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 100, select: false })
  password: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  nickname: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  avatar: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  status: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'must_change_pwd' })
  mustChangePwd: number;
}
