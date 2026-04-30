import 'reflect-metadata';
import dataSource from '../data-source';
import { seedRegions } from './seed-regions';
import { seedDicts } from './seed-dicts';
import { seedMenus } from './seed-menus';
import { seedRolesAdmins } from './seed-roles-admins';
import { seedBusiness } from './seed-business';

/**
 * 种子总入口
 * 顺序：regions / dicts / menus → roles+admins（依赖菜单 ID） / business
 * 全部子任务幂等（已存在则跳过），可重复执行
 */
async function main() {
  console.log('🌱 开始种子初始化...');
  await dataSource.initialize();
  try {
    console.log('▶ 区域数据');
    await seedRegions(dataSource);

    console.log('▶ 字典数据');
    await seedDicts(dataSource);

    console.log('▶ 菜单数据');
    const { menuIds } = await seedMenus(dataSource);

    console.log('▶ 角色与超管');
    await seedRolesAdmins(dataSource, menuIds);

    console.log('▶ 业务数据（物流/配置/品类/运费）');
    await seedBusiness(dataSource);

    console.log('✅ 种子初始化完成');
  } catch (err) {
    console.error('❌ 种子初始化失败:', err);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

main();
