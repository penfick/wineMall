import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitGoods1700000000002 implements MigrationInterface {
  name = 'InitGoods1700000000002';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`categories\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`parent_id\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`name\` VARCHAR(50) NOT NULL,
        \`icon\` VARCHAR(500) NOT NULL DEFAULT '',
        \`sort\` INT NOT NULL DEFAULT 0,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_parent_id\` (\`parent_id\`),
        KEY \`idx_sort\` (\`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品品类'`);

    await q.query(`
      CREATE TABLE \`category_attributes\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`category_id\` INT UNSIGNED NOT NULL,
        \`attr_name\` VARCHAR(50) NOT NULL,
        \`attr_type\` VARCHAR(20) NOT NULL,
        \`is_required\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`options\` VARCHAR(500) NOT NULL DEFAULT '',
        \`sort\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_category_id\` (\`category_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品类属性定义'`);

    await q.query(`
      CREATE TABLE \`goods\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`goods_no\` VARCHAR(20) NOT NULL,
        \`category_id\` INT UNSIGNED NOT NULL,
        \`name\` VARCHAR(200) NOT NULL,
        \`description\` TEXT NULL,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`sort_weight\` INT NOT NULL DEFAULT 0,
        \`sales\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`freight_template_id\` INT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        UNIQUE KEY \`idx_goods_no\` (\`goods_no\`),
        KEY \`idx_category_id\` (\`category_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_sort_weight\` (\`sort_weight\`, \`created_at\`),
        FULLTEXT KEY \`idx_fulltext\` (\`name\`, \`description\`) WITH PARSER ngram
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品主表'`);

    await q.query(`
      CREATE TABLE \`goods_specs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`sku_no\` VARCHAR(20) NOT NULL,
        \`spec_name\` VARCHAR(200) NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL,
        \`original_price\` DECIMAL(10,2) NULL,
        \`stock\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`stock_warning\` INT UNSIGNED NOT NULL DEFAULT 10,
        \`weight\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        UNIQUE KEY \`idx_sku_no\` (\`sku_no\`),
        KEY \`idx_goods_id\` (\`goods_id\`),
        KEY \`idx_stock_warning\` (\`stock\`, \`stock_warning\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品规格/SKU'`);

    await q.query(`
      CREATE TABLE \`goods_images\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`image_url\` VARCHAR(500) NOT NULL,
        \`thumbnail_url\` VARCHAR(500) NOT NULL DEFAULT '',
        \`sort\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_goods_id\` (\`goods_id\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品图片'`);

    await q.query(`
      CREATE TABLE \`goods_attributes\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`attribute_id\` INT UNSIGNED NOT NULL,
        \`attr_value\` VARCHAR(500) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_goods_attr\` (\`goods_id\`, \`attribute_id\`),
        KEY \`idx_attribute_id\` (\`attribute_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品属性值'`);

    await q.query(`
      CREATE TABLE \`cart\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`sku_id\` INT UNSIGNED NOT NULL,
        \`quantity\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`selected\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_user_sku\` (\`user_id\`, \`sku_id\`),
        KEY \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车（MySQL 兜底）'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'cart',
      'goods_attributes',
      'goods_images',
      'goods_specs',
      'goods',
      'category_attributes',
      'categories',
    ]) {
      await q.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
