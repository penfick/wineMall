import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 修正菜单 path：去掉 /list /template 后缀，跟前端代码保持一致
 *
 * 旧 path → 新 path
 *  /goods/list       → /goods
 *  /order/list       → /order
 *  /freight/template → /freight
 *  /user/list        → /user
 */
export class FixMenuPaths1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE menus SET path = '/goods'   WHERE path = '/goods/list'`);
    await queryRunner.query(`UPDATE menus SET path = '/order'   WHERE path = '/order/list'`);
    await queryRunner.query(`UPDATE menus SET path = '/freight' WHERE path = '/freight/template'`);
    await queryRunner.query(`UPDATE menus SET path = '/user'    WHERE path = '/user/list'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE menus SET path = '/goods/list'       WHERE path = '/goods'`);
    await queryRunner.query(`UPDATE menus SET path = '/order/list'       WHERE path = '/order'`);
    await queryRunner.query(`UPDATE menus SET path = '/freight/template' WHERE path = '/freight'`);
    await queryRunner.query(`UPDATE menus SET path = '/user/list'        WHERE path = '/user'`);
  }
}
