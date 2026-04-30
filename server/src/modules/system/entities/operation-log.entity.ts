import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('operation_logs')
export class OperationLogEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Index('idx_admin_id')
  @Column({ type: 'int', unsigned: true, name: 'admin_id' })
  adminId: number;

  @Column({ type: 'varchar', length: 50, name: 'admin_name' })
  adminName: string;

  @Index('idx_module')
  @Column({ type: 'varchar', length: 50 })
  module: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  target: string;

  @Column({ type: 'json', nullable: true })
  detail: any;

  @Column({ type: 'varchar', length: 50 })
  ip: string;

  @Index('idx_created_at')
  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
