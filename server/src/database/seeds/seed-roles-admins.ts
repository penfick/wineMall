import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const RUNTIME_PERMS = {
  super: 'manage:all',
  operator: [
    'dashboard:view',
    'goods:list',
    'goods:create',
    'goods:update',
    'goods:delete',
    'goods:onoff',
    'category:list',
    'category:create',
    'category:update',
    'category:delete',
    'category-attr:list',
    'category-attr:create',
    'category-attr:update',
    'category-attr:delete',
    'order:list',
    'order:detail',
    'order:ship',
    'order:price',
    'order:address',
    'order:close',
    'order:remark',
    'order:export',
    'freight:list',
    'freight:create',
    'freight:update',
    'freight:delete',
    'logistics:company',
    'logistics:record',
    'logistics:track',
    'banner:list',
    'banner:create',
    'banner:update',
    'banner:delete',
    'notice:list',
    'notice:create',
    'notice:update',
    'notice:delete',
    'user:list',
    'user:detail',
  ],
  cs: [
    'dashboard:view',
    'order:list',
    'order:detail',
    'order:remark',
    'order:address',
    'user:list',
    'user:detail',
    'logistics:record',
  ],
};

export async function seedRolesAdmins(ds: DataSource, allMenuIds: number[]) {
  const roleRepo = ds.getRepository('roles');
  const adminRepo = ds.getRepository('admins');
  const adminRoleRepo = ds.getRepository('admin_roles');
  const roleMenuRepo = ds.getRepository('role_menus');
  const menuRepo = ds.getRepository('menus');

  if ((await roleRepo.count()) > 0) {
    console.log(`  [roles/admins] 已存在，跳过`);
    return;
  }

  // 三个内置角色
  const superRole: any = await roleRepo.save({
    name: '超级管理员',
    description: '拥有全部权限',
    isSystem: 1,
  });
  const opRole: any = await roleRepo.save({
    name: '运营管理员',
    description: '商品/订单/运费/物流/内容/用户查看',
    isSystem: 1,
  });
  const csRole: any = await roleRepo.save({
    name: '客服',
    description: '订单+用户查看，可改地址加备注',
    isSystem: 1,
  });
  console.log(`  [roles] 插入 3 个内置角色`);

  // 超管：分配全部菜单（含按钮）
  const superMenuRows = allMenuIds.map((menuId) => ({ roleId: superRole.id, menuId }));
  await roleMenuRepo.insert(superMenuRows);

  // 运营/客服：根据 permission 字段匹配相应菜单 + 沿父链补全目录
  await assignMenusByPermissions(menuRepo, roleMenuRepo, opRole.id, RUNTIME_PERMS.operator);
  await assignMenusByPermissions(menuRepo, roleMenuRepo, csRole.id, RUNTIME_PERMS.cs);

  // 超级管理员账号
  const username = process.env.SUPER_ADMIN_USERNAME || 'admin';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Init@123456';
  const hash = await bcrypt.hash(password, 10);
  const admin: any = await adminRepo.save({
    username,
    password: hash,
    nickname: '超级管理员',
    status: 1,
    mustChangePwd: 1,
  });
  await adminRoleRepo.insert({ adminId: admin.id, roleId: superRole.id });
  console.log(`  [admins] 插入超管账号 username=${username} (首次登录强制改密)`);
}

async function assignMenusByPermissions(
  menuRepo: any,
  roleMenuRepo: any,
  roleId: number,
  permissions: string[],
) {
  const allMenus: any[] = await menuRepo.find();
  const matched = new Set<number>();
  // 按权限标识匹配按钮
  for (const m of allMenus) {
    if (permissions.includes(m.permission)) matched.add(m.id);
    // 顺手把 permission 同名的菜单（如 category:list 隐式 → 菜单本身）也加进来
  }
  // 父链补全
  const map = new Map<number, any>(allMenus.map((m) => [m.id, m]));
  for (const id of [...matched]) {
    let cur = map.get(id);
    while (cur && cur.parentId !== 0) {
      matched.add(cur.parentId);
      cur = map.get(cur.parentId);
    }
  }
  // 对于"目录 + 菜单"类型，我们额外把所有 type=2 的菜单（path 对应 list 类的）按 perm 前缀放进去
  // 例如 permission='category:create' 在按钮上，但其菜单本身没有 permission 字段；
  // 所以再用前缀法把对应的二级菜单（type=2 path 含 /goods/category）加进去
  for (const perm of permissions) {
    const head = perm.split(':')[0];
    for (const m of allMenus) {
      if (m.type === 2 && m.path.includes(`/${head}`)) matched.add(m.id);
    }
  }
  // 父链再补
  for (const id of [...matched]) {
    let cur = map.get(id);
    while (cur && cur.parentId !== 0) {
      matched.add(cur.parentId);
      cur = map.get(cur.parentId);
    }
  }

  const rows = [...matched].map((menuId) => ({ roleId, menuId }));
  if (rows.length) await roleMenuRepo.insert(rows);
}
