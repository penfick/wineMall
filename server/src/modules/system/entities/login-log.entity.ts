import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('login_logs')
export class LoginLogEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Index('idx_username')
  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 50 })
  ip: string;

  @Column({ type: 'varchar', length: 500, default: '', name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'tinyint', unsigned: true })
  result: number;

  @Column({ type: 'varchar', length: 200, default: '', name: 'fail_reason' })
  failReason: string;

  @Index('idx_created_at')
  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
