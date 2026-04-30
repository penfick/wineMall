import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_roles')
@Index('idx_admin_role', ['adminId', 'roleId'], { unique: true })
@Index('idx_role_id', ['roleId'])
export class AdminRoleEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'admin_id' })
  adminId: number;

  @Column({ type: 'int', unsigned: true, name: 'role_id' })
  roleId: number;
}
