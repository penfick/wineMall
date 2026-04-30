import { DataSource } from 'typeorm';

interface DictDef {
  code: string;
  name: string;
  items: Array<{ label: string; value: string }>;
}

const DICTS: DictDef[] = [
  {
    code: 'order_status',
    name: '订单状态',
    items: [
      { label: '待付款', value: '0' },
      { label: '待发货', value: '1' },
      { label: '待收货', value: '2' },
      { label: '已完成', value: '3' },
      { label: '已取消', value: '4' },
    ],
  },
  {
    code: 'goods_status',
    name: '商品状态',
    items: [
      { label: '下架', value: '0' },
      { label: '上架', value: '1' },
    ],
  },
  {
    code: 'user_status',
    name: '用户状态',
    items: [
      { label: '禁用', value: '0' },
      { label: '启用', value: '1' },
    ],
  },
  {
    code: 'admin_status',
    name: '管理员状态',
    items: [
      { label: '禁用', value: '0' },
      { label: '启用', value: '1' },
    ],
  },
  {
    code: 'phone_condition',
    name: '手机成色',
    items: [
      { label: '全新', value: 'new' },
      { label: '99新', value: '99' },
      { label: '95新', value: '95' },
      { label: '9成新', value: '90' },
      { label: '8成新', value: '80' },
    ],
  },
  {
    code: 'liquor_flavor',
    name: '白酒香型',
    items: [
      { label: '浓香型', value: 'nong' },
      { label: '酱香型', value: 'jiang' },
      { label: '清香型', value: 'qing' },
      { label: '米香型', value: 'mi' },
      { label: '兼香型', value: 'jian' },
    ],
  },
  {
    code: 'phone_brand',
    name: '手机品牌',
    items: [
      { label: '苹果', value: 'apple' },
      { label: '华为', value: 'huawei' },
      { label: '小米', value: 'xiaomi' },
      { label: 'OPPO', value: 'oppo' },
      { label: 'vivo', value: 'vivo' },
      { label: '三星', value: 'samsung' },
      { label: '其他', value: 'other' },
    ],
  },
  {
    code: 'phone_memory',
    name: '手机内存',
    items: [
      { label: '64GB', value: '64' },
      { label: '128GB', value: '128' },
      { label: '256GB', value: '256' },
      { label: '512GB', value: '512' },
      { label: '1TB', value: '1024' },
    ],
  },
  {
    code: 'storage_method',
    name: '存储方式',
    items: [
      { label: '常温', value: 'normal' },
      { label: '冷藏', value: 'fridge' },
      { label: '冷冻', value: 'freezer' },
    ],
  },
  {
    code: 'billing_type',
    name: '计费方式',
    items: [
      { label: '按件', value: '1' },
      { label: '按重量', value: '2' },
    ],
  },
  {
    code: 'banner_link_type',
    name: '轮播图跳转类型',
    items: [
      { label: '无', value: '0' },
      { label: '商品详情', value: '1' },
      { label: '品类列表', value: '2' },
      { label: '外链', value: '3' },
    ],
  },
  {
    code: 'menu_type',
    name: '菜单类型',
    items: [
      { label: '目录', value: '1' },
      { label: '菜单', value: '2' },
      { label: '按钮', value: '3' },
    ],
  },
  {
    code: 'operator_type',
    name: '操作人类型',
    items: [
      { label: '用户', value: '1' },
      { label: '管理员', value: '2' },
      { label: '系统', value: '3' },
    ],
  },
];

export async function seedDicts(ds: DataSource) {
  const typeRepo = ds.getRepository('dict_types');
  const itemRepo = ds.getRepository('dict_items');
  const exists = await typeRepo.count();
  if (exists > 0) {
    console.log(`  [dicts] 已存在 ${exists} 个类型，跳过`);
    return;
  }

  let typeCount = 0;
  let itemCount = 0;
  for (const d of DICTS) {
    const inserted: any = await typeRepo.save({ code: d.code, name: d.name });
    typeCount++;
    const items = d.items.map((it, idx) => ({
      dictTypeId: inserted.id,
      label: it.label,
      value: it.value,
      sort: idx,
    }));
    await itemRepo.insert(items);
    itemCount += items.length;
  }
  console.log(`  [dicts] 插入 ${typeCount} 类型 / ${itemCount} 项`);
}
