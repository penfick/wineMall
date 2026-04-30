import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUser1700000000001 implements MigrationInterface {
  name = 'InitUser1700000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`users\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`openid\` VARCHAR(64) NOT NULL,
        \`nickname\` VARCHAR(50) NOT NULL DEFAULT '',
        \`avatar\` VARCHAR(500) NOT NULL DEFAULT '',
        \`phone\` VARCHAR(20) NULL DEFAULT NULL,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        UNIQUE KEY \`idx_openid\` (\`openid\`),
        KEY \`idx_phone\` (\`phone\`),
        KEY \`idx_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小程序用户'`);

    await q.query(`
      CREATE TABLE \`addresses\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`receiver_name\` VARCHAR(50) NOT NULL,
        \`receiver_phone\` VARCHAR(20) NOT NULL,
        \`province_code\` VARCHAR(10) NOT NULL,
        \`city_code\` VARCHAR(10) NOT NULL,
        \`district_code\` VARCHAR(10) NOT NULL,
        \`province_name\` VARCHAR(50) NOT NULL,
        \`city_name\` VARCHAR(50) NOT NULL,
        \`district_name\` VARCHAR(50) NOT NULL,
        \`detail_address\` VARCHAR(200) NOT NULL,
        \`is_default\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_user_default\` (\`user_id\`, \`is_default\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收货地址'`);

    await q.query(`
      CREATE TABLE \`favorites\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_user_goods\` (\`user_id\`, \`goods_id\`),
        KEY \`idx_goods_id\` (\`goods_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏'`);

    await q.query(`
      CREATE TABLE \`search_history\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`keyword\` VARCHAR(100) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_user_id\` (\`user_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['search_history', 'favorites', 'addresses', 'users']) {
      await q.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
