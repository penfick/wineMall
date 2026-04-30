import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_menus')
@Index('idx_role_menu', ['roleId', 'menuId'], { unique: true })
@Index('idx_menu_id', ['menuId'])
export class RoleMenuEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'role_id' })
  roleId: number;

  @Column({ type: 'int', unsigned: true, name: 'menu_id' })
  menuId: number;
}
