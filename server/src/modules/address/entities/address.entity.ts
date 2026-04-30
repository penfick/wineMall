import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '@common/entities/base.entity';

@Entity('addresses')
@Index('idx_user_id', ['userId'])
@Index('idx_user_default', ['userId', 'isDefault'])
export class AddressEntity extends SoftDeleteEntity {
  @Column({ type: 'int', unsigned: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 50, name: 'receiver_name' })
  receiverName: string;

  @Column({ type: 'varchar', length: 20, name: 'receiver_phone' })
  receiverPhone: string;

  @Column({ type: 'varchar', length: 10, name: 'province_code' })
  provinceCode: string;

  @Column({ type: 'varchar', length: 10, name: 'city_code' })
  cityCode: string;

  @Column({ type: 'varchar', length: 10, name: 'district_code' })
  districtCode: string;

  @Column({ type: 'varchar', length: 50, name: 'province_name' })
  provinceName: string;

  @Column({ type: 'varchar', length: 50, name: 'city_name' })
  cityName: string;

  @Column({ type: 'varchar', length: 50, name: 'district_name' })
  districtName: string;

  @Column({ type: 'varchar', length: 200, name: 'detail_address' })
  detailAddress: string;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_default' })
  isDefault: number;
}
