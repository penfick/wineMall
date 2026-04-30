import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logistics_tracks')
@Index('idx_order_id', ['orderId', 'trackTime'])
export class LogisticsTrackEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'order_id' })
  orderId: number;

  @Column({ type: 'datetime', precision: 0, name: 'track_time' })
  trackTime: Date;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
