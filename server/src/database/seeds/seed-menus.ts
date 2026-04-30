import { DataSource } from 'typeorm';

/**
 * 菜单种子（按 04-数据库设计.md 4.2 节）
 * 类型：1=目录 2=菜单 3=按钮
 * 树形结构通过 parentId 关联，靠 id 顺序保证（根据插入顺序，自增 id）
 */

interface MenuNode {
  name: string;
  type: 1 | 2 | 3;
  path?: string;
  component?: string;
  permission?: string;
  icon?: string;
  sort?: number;
  children?: MenuNode[];
}

const MENU_TREE: MenuNode[] = [
  {
    name: '仪表盘',
    type: 1,
    icon: 'dashboard',
    sort: 1,
    children: [
      {
        name: '首页仪表盘',
        type: 2,
        path: '/dashboard',
        component: 'dashboard/index',
        permission: 'dashboard:view',
      },
    ],
  },
  {
    name: '商品管理',
    type: 1,
    icon: 'goods',
    sort: 2,
    children: [
      {
        name: '商品列表',
        type: 2,
        path: '/goods',
        component: 'goods/index',
        children: [
          { name: '新增商品', type: 3, permission: 'goods:create' },
          { name: '编辑商品', type: 3, permission: 'goods:update' },
          { name: '删除商品', type: 3, permission: 'goods:delete' },
          { name: '上架/下架', type: 3, permission: 'goods:onoff' },
        ],
      },
      {
        name: '品类管理',
        type: 2,
        path: '/goods/category',
        component: 'category/index',
        children: [
          { name: '新增品类', type: 3, permission: 'category:create' },
          { name: '编辑品类', type: 3, permission: 'category:update' },
          { name: '删除品类', type: 3, permission: 'category:delete' },
        ],
      },
      {
        name: '品类属性',
        type: 2,
        path: '/goods/category-attr',
        component: 'category/attr',
        children: [
          { name: '新增属性', type: 3, permission: 'category-attr:create' },
          { name: '编辑属性', type: 3, permission: 'category-attr:update' },
          { name: '删除属性', type: 3, permission: 'category-attr:delete' },
        ],
      },
    ],
  },
  {
    name: '订单管理',
    type: 1,
    icon: 'order',
    sort: 3,
    children: [
      {
        name: '订单列表',
        type: 2,
        path: '/order',
        component: 'order/index',
        children: [
          { name: '订单详情', type: 3, permission: 'order:detail' },
          { name: '发货', type: 3, permission: 'order:ship' },
          { name: '修改价格', type: 3, permission: 'order:price' },
          { name: '修改地址', type: 3, permission: 'order:address' },
          { name: '关闭订单', type: 3, permission: 'order:close' },
          { name: '添加备注', type: 3, permission: 'order:remark' },
          { name: '导出订单', type: 3, permission: 'order:export' },
        ],
      },
    ],
  },
  {
    name: '运费管理',
    type: 1,
    icon: 'freight',
    sort: 4,
    children: [
      {
        name: '运费模板',
        type: 2,
        path: '/freight',
        component: 'freight/index',
        children: [
          { name: '新增模板', type: 3, permission: 'freight:create' },
          { name: '编辑模板', type: 3, permission: 'freight:update' },
          { name: '删除模板', type: 3, permission: 'freight:delete' },
        ],
      },
    ],
  },
  {
    name: '物流管理',
    type: 1,
    icon: 'logistics',
    sort: 5,
    children: [
      {
        name: '物流公司',
        type: 2,
        path: '/logistics/company',
        component: 'logistics/company',
        permission: 'logistics:company',
      },
      {
        name: '发货记录',
        type: 2,
        path: '/logistics/record',
        component: 'logistics/shipment',
        children: [{ name: '更新物流节点', type: 3, permission: 'logistics:track' }],
      },
    ],
  },
  {
    name: '用户管理',
    type: 1,
    icon: 'user',
    sort: 6,
    children: [
      {
        name: '用户列表',
        type: 2,
        path: '/user',
        component: 'user/index',
        children: [
          { name: '用户详情', type: 3, permission: 'user:detail' },
          { name: '启用/禁用', type: 3, permission: 'user:status' },
        ],
      },
    ],
  },
  {
    name: '内容管理',
    type: 1,
    icon: 'content',
    sort: 7,
    children: [
      {
        name: '轮播图管理',
        type: 2,
        path: '/content/banner',
        component: 'banner/index',
        children: [
          { name: '新增轮播图', type: 3, permission: 'banner:create' },
          { name: '编辑轮播图', type: 3, permission: 'banner:update' },
          { name: '删除轮播图', type: 3, permission: 'banner:delete' },
        ],
      },
      {
        name: '公告管理',
        type: 2,
        path: '/content/notice',
        component: 'notice/index',
        children: [
          { name: '新增公告', type: 3, permission: 'notice:create' },
          { name: '编辑公告', type: 3, permission: 'notice:update' },
          { name: '删除公告', type: 3, permission: 'notice:delete' },
        ],
      },
    ],
  },
  {
    name: '系统管理',
    type: 1,
    icon: 'system',
    sort: 8,
    children: [
      {
        name: '管理员管理',
        type: 2,
        path: '/system/admin',
        component: 'system/admin',
        children: [
          { name: '新增管理员', type: 3, permission: 'admin:create' },
          { name: '编辑管理员', type: 3, permission: 'admin:update' },
          { name: '删除管理员', type: 3, permission: 'admin:delete' },
          { name: '踢下线', type: 3, permission: 'admin:kick' },
        ],
      },
      {
        name: '角色管理',
        type: 2,
        path: '/system/role',
        component: 'system/role',
        children: [
          { name: '新增角色', type: 3, permission: 'role:create' },
          { name: '编辑角色', type: 3, permission: 'role:update' },
          { name: '删除角色', type: 3, permission: 'role:delete' },
        ],
      },
      {
        name: '菜单管理',
        type: 2,
        path: '/system/menu',
        component: 'system/menu',
        children: [
          { name: '新增菜单', type: 3, permission: 'menu:create' },
          { name: '编辑菜单', type: 3, permission: 'menu:update' },
          { name: '删除菜单', type: 3, permission: 'menu:delete' },
        ],
      },
      {
        name: '数据字典',
        type: 2,
        path: '/system/dict',
        component: 'system/dict',
        children: [
          { name: '新增字典', type: 3, permission: 'dict:create' },
          { name: '编辑字典', type: 3, permission: 'dict:update' },
          { name: '删除字典', type: 3, permission: 'dict:delete' },
        ],
      },
      {
        name: '系统配置',
        type: 2,
        path: '/system/config',
        component: 'system/config',
        children: [{ name: '修改配置', type: 3, permission: 'config:update' }],
      },
      {
        name: '缓存管理',
        type: 2,
        path: '/system/cache',
        component: 'system/cache',
        permission: 'cache:refresh',
      },
      {
        name: '库存同步',
        type: 2,
        path: '/system/stock-sync',
        component: 'system/stock/index',
        permission: 'stock:sync',
      },
      {
        name: '操作日志',
        type: 2,
        path: '/system/log/operation',
        component: 'system/operation-log/index',
        permission: 'log:operation',
      },
    ],
  },
];

export async function seedMenus(ds: DataSource): Promise<{ menuIds: number[] }> {
  const repo = ds.getRepository('menus');
  const exists = await repo.count();
  if (exists > 0) {
    console.log(`  [menus] 已存在 ${exists} 条，跳过`);
    const all = await repo.find();
    return { menuIds: all.map((m: any) => m.id) };
  }

  const allIds: number[] = [];
  let sortCounter = 0;
  async function insertNode(node: MenuNode, parentId: number) {
    sortCounter++;
    const saved: any = await repo.save({
      parentId,
      name: node.name,
      type: node.type,
      path: node.path || '',
      component: node.component || '',
      permission: node.permission || '',
      icon: node.icon || '',
      sort: node.sort ?? sortCounter,
      status: 1,
    });
    allIds.push(saved.id);
    if (node.children) {
      for (const child of node.children) {
        await insertNode(child, saved.id);
      }
    }
  }

  for (const root of MENU_TREE) {
    await insertNode(root, 0);
  }
  console.log(`  [menus] 插入 ${allIds.length} 条`);
  return { menuIds: allIds };
}
