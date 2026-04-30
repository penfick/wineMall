import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 仅含 id + 时间戳 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', precision: 0 })
  updatedAt: Date;
}

/** 含软删除字段 */
export abstract class SoftDeleteEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', precision: 0, nullable: true })
  deletedAt: Date | null;
}
