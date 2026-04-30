import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order_logs')
@Index('idx_order_id', ['orderId', 'createdAt'])
export class OrderLogEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'order_id' })
  orderId: number;

  /** 1=用户 2=管理员 3=系统 */
  @Column({ type: 'tinyint', unsigned: true, name: 'operator_type' })
  operatorType: number;

  @Column({ type: 'int', unsigned: true, nullable: true, name: 'operator_id' })
  operatorId: number | null;

  @Column({ type: 'varchar', length: 50, default: '', name: 'operator_name' })
  operatorName: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 1000, default: '' })
  content: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
