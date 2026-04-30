import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFreightIsDefault1700000000006 implements MigrationInterface {
  name = 'AddFreightIsDefault1700000000006';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE `freight_templates` ADD COLUMN `is_default` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '1=默认模板' AFTER `is_free`",
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE `freight_templates` DROP COLUMN `is_default`');
  }
}
