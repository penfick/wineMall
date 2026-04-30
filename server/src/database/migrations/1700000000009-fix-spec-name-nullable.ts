import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 旧列 goods_specs.spec_name 在 1700000000007 中保留未删，但仍为 NOT NULL 无默认值。
 * 新代码已改用 attr_text，不再写入 spec_name，导致 INSERT 报错：
 *   Field 'spec_name' doesn't have a default value
 *
 * 本迁移把 spec_name 改成可空 + 默认 NULL，等历史数据彻底迁完后再 DROP。
 */
export class FixSpecNameNullable1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`goods_specs\` MODIFY COLUMN \`spec_name\` VARCHAR(200) NULL DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`goods_specs\` MODIFY COLUMN \`spec_name\` VARCHAR(200) NOT NULL`,
    );
  }
}
