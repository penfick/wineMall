import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 扩展 goods / goods_specs 字段以匹配前端表单
 *
 * goods 加：sub_title / main_image / unit / price / market_price / cost_price /
 *           stock / stock_warning / detail / sort
 * goods_specs 加：attr_text / sku_code / market_price / cost_price / image / status
 *
 * 兼容策略：spec_name 旧列保留不删，等下个版本迁完数据再清；
 * 新代码统一用 attr_text，老数据可以靠手工复制 spec_name → attr_text。
 */
export class ExtendGoodsFields1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE goods
        ADD COLUMN sub_title VARCHAR(200) NOT NULL DEFAULT '' AFTER name,
        ADD COLUMN main_image VARCHAR(500) NOT NULL DEFAULT '' AFTER sub_title,
        ADD COLUMN unit VARCHAR(50) NOT NULL DEFAULT '件' AFTER main_image,
        ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER unit,
        ADD COLUMN market_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price,
        ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER market_price,
        ADD COLUMN stock INT UNSIGNED NOT NULL DEFAULT 0 AFTER cost_price,
        ADD COLUMN stock_warning INT UNSIGNED NOT NULL DEFAULT 10 AFTER stock,
        ADD COLUMN detail MEDIUMTEXT NULL AFTER stock_warning,
        ADD COLUMN sort INT NOT NULL DEFAULT 0 AFTER status
    `);

    await queryRunner.query(`
      ALTER TABLE goods_specs
        ADD COLUMN attr_text VARCHAR(200) NOT NULL DEFAULT '' AFTER sku_no,
        ADD COLUMN sku_code VARCHAR(100) NOT NULL DEFAULT '' AFTER attr_text,
        ADD COLUMN market_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price,
        ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER market_price,
        ADD COLUMN image VARCHAR(500) NOT NULL DEFAULT '' AFTER cost_price,
        ADD COLUMN status TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER weight
    `);

    // 历史数据：把 spec_name 复制到 attr_text，让前端展示不空
    await queryRunner.query(`
      UPDATE goods_specs SET attr_text = spec_name WHERE attr_text = '' AND spec_name IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE goods_specs
        DROP COLUMN attr_text,
        DROP COLUMN sku_code,
        DROP COLUMN market_price,
        DROP COLUMN cost_price,
        DROP COLUMN image,
        DROP COLUMN status
    `);

    await queryRunner.query(`
      ALTER TABLE goods
        DROP COLUMN sub_title,
        DROP COLUMN main_image,
        DROP COLUMN unit,
        DROP COLUMN price,
        DROP COLUMN market_price,
        DROP COLUMN cost_price,
        DROP COLUMN stock,
        DROP COLUMN stock_warning,
        DROP COLUMN detail,
        DROP COLUMN sort
    `);
  }
}
