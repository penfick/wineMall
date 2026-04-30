import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';

@Entity('category_attributes')
export class CategoryAttributeEntity extends BaseEntity {
  @Index('idx_category_id')
  @Column({ type: 'int', unsigned: true, name: 'category_id' })
  categoryId: number;

  @Column({ type: 'varchar', length: 50, name: 'attr_name' })
  attrName: string;

  /** text/number/select/radio */
  @Column({ type: 'varchar', length: 20, name: 'attr_type' })
  attrType: string;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'is_required' })
  isRequired: number;

  /** JSON 数组字符串 */
  @Column({ type: 'varchar', length: 500, default: '' })
  options: string;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
