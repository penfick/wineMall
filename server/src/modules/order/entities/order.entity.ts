import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

export enum OrderStatus {
  PENDING_PAY = 0,
  PENDING_SHIP = 1,
  PENDING_RECEIVE = 2,
  COMPLETED = 3,
  CANCELLED = 4,
}

@Entity('orders')
@Index('idx_order_no', ['orderNo'], { unique: true })
@Index('idx_user_id', ['userId', 'status'])
@Index('idx_status', ['status'])
@Index('idx_created_at', ['createdAt'])
@Index('idx_timeout', ['status', 'createdAt'])
export class OrderEntity extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 20, name: 'order_no' })
  orderNo: string;

  @Column({ type: 'int', unsigned: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  status: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'freight_amount' })
  freightAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'pay_amount' })
  payAmount: string;

  @Column({ type: 'varchar', length: 50, name: 'receiver_name' })
  receiverName: string;

  @Column({ type: 'varchar', length: 20, name: 'receiver_phone' })
  receiverPhone: string;

  @Column({ type: 'varchar', length: 10, name: 'receiver_province_code' })
  receiverProvinceCode: string;

  @Column({ type: 'varchar', length: 10, name: 'receiver_city_code' })
  receiverCityCode: string;

  @Column({ type: 'varchar', length: 10, name: 'receiver_district_code' })
  receiverDistrictCode: string;

  @Column({ type: 'varchar', length: 50, name: 'receiver_province' })
  receiverProvince: string;

  @Column({ type: 'varchar', length: 50, name: 'receiver_city' })
  receiverCity: string;

  @Column({ type: 'varchar', length: 50, name: 'receiver_district' })
  receiverDistrict: string;

  @Column({ type: 'varchar', length: 200, name: 'receiver_address' })
  receiverAddress: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  remark: string;

  @Column({ type: 'varchar', length: 200, default: '', name: 'cancel_reason' })
  cancelReason: string;

  @Column({ type: 'int', unsigned: true, nullable: true, name: 'logistics_company_id' })
  logisticsCompanyId: number | null;

  @Column({ type: 'varchar', length: 50, default: '', name: 'tracking_no' })
  trackingNo: string;

  @Column({ type: 'datetime', nullable: true, precision: 0, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'datetime', nullable: true, precision: 0, name: 'shipped_at' })
  shippedAt: Date | null;

  @Column({ type: 'datetime', nullable: true, precision: 0, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'datetime', nullable: true, precision: 0, name: 'cancelled_at' })
  cancelledAt: Date | null;
}
