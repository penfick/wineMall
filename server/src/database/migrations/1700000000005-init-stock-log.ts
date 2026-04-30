import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitStockLog1700000000005 implements MigrationInterface {
  name = 'InitStockLog1700000000005';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`stock_logs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`goods_id\` INT UNSIGNED NOT NULL,
        \`sku_id\` INT UNSIGNED NOT NULL,
        \`action\` TINYINT UNSIGNED NOT NULL COMMENT '1=入库 2=出库 3=订单扣减 4=订单回滚 5=订单出库',
        \`change\` INT NOT NULL,
        \`stock_after\` INT UNSIGNED NOT NULL,
        \`order_no\` VARCHAR(32) NOT NULL DEFAULT '',
        \`operator_id\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`operator_name\` VARCHAR(50) NOT NULL DEFAULT '',
        \`remark\` VARCHAR(200) NOT NULL DEFAULT '',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_sku_id\` (\`sku_id\`),
        KEY \`idx_goods_id\` (\`goods_id\`),
        KEY \`idx_order_no\` (\`order_no\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存流水'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS `stock_logs`');
  }
}
