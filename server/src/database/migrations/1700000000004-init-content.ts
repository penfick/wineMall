import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitContent1700000000004 implements MigrationInterface {
  name = 'InitContent1700000000004';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`banners\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(100) NOT NULL DEFAULT '',
        \`image_url\` VARCHAR(500) NOT NULL,
        \`link_type\` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=无 1=商品 2=品类 3=外链',
        \`link_value\` VARCHAR(500) NOT NULL DEFAULT '',
        \`sort\` INT NOT NULL DEFAULT 0,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_status_sort\` (\`status\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轮播图'`);

    await q.query(`
      CREATE TABLE \`notices\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(200) NOT NULL,
        \`content\` TEXT NULL,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=草稿 1=已发布',
        \`is_top\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`publish_time\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_status_top\` (\`status\`, \`is_top\`, \`publish_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS `notices`');
    await q.query('DROP TABLE IF EXISTS `banners`');
  }
}
