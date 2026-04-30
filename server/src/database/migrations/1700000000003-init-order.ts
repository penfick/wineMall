import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrder1700000000003 implements MigrationInterface {
  name = 'InitOrder1700000000003';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`orders\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`order_no\` VARCHAR(20) NOT NULL,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=待付款 1=待发货 2=待收货 3=已完成 4=已取消',
        \`total_amount\` DECIMAL(10,2) NOT NULL,
        \`freight_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`pay_amount\` DECIMAL(10,2) NOT NULL,
        \`receiver_name\` VARCHAR(50) NOT NULL,
        \`receiver_phone\` VARCHAR(20) NOT NULL,
        \`receiver_province_code\` VARCHAR(10) NOT NULL,
        \`receiver_city_code\` VARCHAR(10) NOT NULL,
        \`receiver_district_code\` VARCHAR(10) NOT NULL,
        \`receiver_province\` VARCHAR(50) NOT NULL,
        \`receiver_city\` VARCHAR(50) NOT NULL,
        \`receiver_district\` VARCHAR(50) NOT NULL,
        \`receiver_address\` VARCHAR(200) NOT NULL,
        \`remark\` VARCHAR(500) NOT NULL DEFAULT '',
        \`cancel_reason\` VARCHAR(200) NOT NULL DEFAULT '',
        \`logistics_company_id\` INT UNSIGNED NULL,
        \`tracking_no\` VARCHAR(50) NOT NULL DEFAULT '',
        \`paid_at\` DATETIME NULL,
        \`shipped_at\` DATETIME NULL,
        \`completed_at\` DATETIME NULL,
        \`cancelled_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        UNIQUE KEY \`idx_order_no\` (\`order_no\`),
        KEY \`idx_user_id\` (\`user_id\`, \`status\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_created_at\` (\`created_at\`),
        KEY \`idx_timeout\` (\`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单'`);

    await q.query(`
      CREATE TABLE \`order_items\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` INT UNSIGNED NOT NULL,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`sku_id\` INT UNSIGNED NOT NULL,
        \`goods_name\` VARCHAR(200) NOT NULL,
        \`spec_name\` VARCHAR(200) NOT NULL,
        \`image_url\` VARCHAR(500) NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL,
        \`quantity\` INT UNSIGNED NOT NULL,
        \`subtotal\` DECIMAL(10,2) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        KEY \`idx_order_id\` (\`order_id\`),
        KEY \`idx_goods_id\` (\`goods_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单商品明细'`);

    await q.query(`
      CREATE TABLE \`order_logs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` INT UNSIGNED NOT NULL,
        \`operator_type\` TINYINT UNSIGNED NOT NULL COMMENT '1=用户 2=管理员 3=系统',
        \`operator_id\` INT UNSIGNED NULL,
        \`operator_name\` VARCHAR(50) NOT NULL DEFAULT '',
        \`action\` VARCHAR(50) NOT NULL,
        \`content\` VARCHAR(1000) NOT NULL DEFAULT '',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_order_id\` (\`order_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单操作日志'`);

    await q.query(`
      CREATE TABLE \`freight_templates\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`billing_type\` TINYINT UNSIGNED NOT NULL COMMENT '1=按件 2=按重量',
        \`is_free\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`free_threshold\` DECIMAL(10,2) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运费模板'`);

    await q.query(`
      CREATE TABLE \`freight_rules\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`template_id\` INT UNSIGNED NOT NULL,
        \`region_codes\` TEXT NULL,
        \`first_unit\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`first_fee\` DECIMAL(10,2) NOT NULL,
        \`continue_unit\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`continue_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_template_id\` (\`template_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运费规则'`);

    await q.query(`
      CREATE TABLE \`logistics_companies\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(50) NOT NULL,
        \`code\` VARCHAR(30) NOT NULL,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流公司'`);

    await q.query(`
      CREATE TABLE \`logistics_tracks\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` INT UNSIGNED NOT NULL,
        \`track_time\` DATETIME NOT NULL,
        \`status\` VARCHAR(50) NOT NULL,
        \`description\` VARCHAR(500) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_order_id\` (\`order_id\`, \`track_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流轨迹'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'logistics_tracks',
      'logistics_companies',
      'freight_rules',
      'freight_templates',
      'order_logs',
      'order_items',
      'orders',
    ]) {
      await q.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
