import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 基础设施表：地区、字典、系统配置、菜单、角色、管理员、关联表、操作日志、登录日志
 */
export class InitBase1700000000000 implements MigrationInterface {
  name = 'InitBase1700000000000';

  public async up(q: QueryRunner): Promise<void> {
    // regions
    await q.query(`
      CREATE TABLE \`regions\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(10) NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`parent_code\` VARCHAR(10) NOT NULL DEFAULT '0',
        \`level\` TINYINT UNSIGNED NOT NULL,
        UNIQUE KEY \`idx_code\` (\`code\`),
        KEY \`idx_parent_code\` (\`parent_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='省市区三级数据'`);

    // dict_types
    await q.query(`
      CREATE TABLE \`dict_types\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`description\` VARCHAR(200) NOT NULL DEFAULT '',
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型'`);

    // dict_items
    await q.query(`
      CREATE TABLE \`dict_items\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`dict_type_id\` INT UNSIGNED NOT NULL,
        \`label\` VARCHAR(100) NOT NULL,
        \`value\` VARCHAR(100) NOT NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_dict_type_id\` (\`dict_type_id\`, \`sort\`),
        UNIQUE KEY \`idx_type_value\` (\`dict_type_id\`, \`value\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项'`);

    // sys_config
    await q.query(`
      CREATE TABLE \`sys_config\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`config_key\` VARCHAR(50) NOT NULL,
        \`config_value\` TEXT NOT NULL,
        \`description\` VARCHAR(200) NOT NULL DEFAULT '',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_config_key\` (\`config_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置'`);

    // menus
    await q.query(`
      CREATE TABLE \`menus\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`parent_id\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`name\` VARCHAR(50) NOT NULL,
        \`type\` TINYINT UNSIGNED NOT NULL COMMENT '1=目录 2=菜单 3=按钮',
        \`path\` VARCHAR(200) NOT NULL DEFAULT '',
        \`component\` VARCHAR(200) NOT NULL DEFAULT '',
        \`permission\` VARCHAR(100) NOT NULL DEFAULT '',
        \`icon\` VARCHAR(100) NOT NULL DEFAULT '',
        \`sort\` INT NOT NULL DEFAULT 0,
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_parent_id\` (\`parent_id\`),
        KEY \`idx_permission\` (\`permission\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单'`);

    // roles
    await q.query(`
      CREATE TABLE \`roles\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(50) NOT NULL,
        \`description\` VARCHAR(200) NOT NULL DEFAULT '',
        \`is_system\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色'`);

    // role_menus
    await q.query(`
      CREATE TABLE \`role_menus\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`role_id\` INT UNSIGNED NOT NULL,
        \`menu_id\` INT UNSIGNED NOT NULL,
        UNIQUE KEY \`idx_role_menu\` (\`role_id\`, \`menu_id\`),
        KEY \`idx_menu_id\` (\`menu_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-菜单关联'`);

    // admins
    await q.query(`
      CREATE TABLE \`admins\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL,
        \`password\` VARCHAR(100) NOT NULL,
        \`nickname\` VARCHAR(50) NOT NULL DEFAULT '',
        \`avatar\` VARCHAR(500) NOT NULL DEFAULT '',
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`must_change_pwd\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL DEFAULT NULL,
        UNIQUE KEY \`idx_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员'`);

    // admin_roles
    await q.query(`
      CREATE TABLE \`admin_roles\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`admin_id\` INT UNSIGNED NOT NULL,
        \`role_id\` INT UNSIGNED NOT NULL,
        UNIQUE KEY \`idx_admin_role\` (\`admin_id\`, \`role_id\`),
        KEY \`idx_role_id\` (\`role_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员-角色关联'`);

    // operation_logs
    await q.query(`
      CREATE TABLE \`operation_logs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`admin_id\` INT UNSIGNED NOT NULL,
        \`admin_name\` VARCHAR(50) NOT NULL,
        \`module\` VARCHAR(50) NOT NULL,
        \`action\` VARCHAR(50) NOT NULL,
        \`target\` VARCHAR(200) NOT NULL DEFAULT '',
        \`detail\` JSON NULL,
        \`ip\` VARCHAR(50) NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_admin_id\` (\`admin_id\`),
        KEY \`idx_module\` (\`module\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志'`);

    // login_logs
    await q.query(`
      CREATE TABLE \`login_logs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL,
        \`ip\` VARCHAR(50) NOT NULL,
        \`user_agent\` VARCHAR(500) NOT NULL DEFAULT '',
        \`result\` TINYINT UNSIGNED NOT NULL,
        \`fail_reason\` VARCHAR(200) NOT NULL DEFAULT '',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_username\` (\`username\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    const tables = [
      'login_logs',
      'operation_logs',
      'admin_roles',
      'admins',
      'role_menus',
      'roles',
      'menus',
      'sys_config',
      'dict_items',
      'dict_types',
      'regions',
    ];
    for (const t of tables) {
      await q.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
