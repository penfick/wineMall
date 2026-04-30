import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('goods_attributes')
@Index('idx_goods_attr', ['goodsId', 'attributeId'], { unique: true })
@Index('idx_attribute_id', ['attributeId'])
export class GoodsAttributeEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, name: 'goods_id' })
  goodsId: number;

  @Column({ type: 'int', unsigned: true, name: 'attribute_id' })
  attributeId: number;

  @Column({ type: 'varchar', length: 500, name: 'attr_value' })
  attrValue: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;
}
