import { DataSource } from 'typeorm';

/**
 * 业务种子：物流公司、系统配置、商品品类（三级）+ 品类属性、运费模板
 */
export async function seedBusiness(ds: DataSource) {
  await seedLogistics(ds);
  await seedSysConfig(ds);
  await seedCategories(ds);
  await seedFreight(ds);
}

async function seedLogistics(ds: DataSource) {
  const repo = ds.getRepository('logistics_companies');
  if ((await repo.count()) > 0) {
    console.log('  [logistics_companies] 已存在，跳过');
    return;
  }
  await repo.insert([
    { name: '顺丰速运', code: 'SF', sort: 1 },
    { name: '圆通速递', code: 'YTO', sort: 2 },
    { name: '中通快递', code: 'ZTO', sort: 3 },
    { name: '韵达快递', code: 'YD', sort: 4 },
    { name: '申通快递', code: 'STO', sort: 5 },
    { name: 'EMS', code: 'EMS', sort: 6 },
    { name: '京东物流', code: 'JD', sort: 7 },
  ]);
  console.log('  [logistics_companies] 插入 7 条');
}

async function seedSysConfig(ds: DataSource) {
  const repo = ds.getRepository('sys_config');
  if ((await repo.count()) > 0) {
    console.log('  [sys_config] 已存在，跳过');
    return;
  }
  await repo.insert([
    { configKey: 'site_name', configValue: '优选商城', description: '网站名称' },
    { configKey: 'site_logo', configValue: '', description: 'Logo URL' },
    { configKey: 'service_phone', configValue: '400-888-8888', description: '客服电话' },
    { configKey: 'about_us', configValue: '', description: '关于我们（富文本）' },
    {
      configKey: 'order_timeout_minutes',
      configValue: '30',
      description: '订单超时取消时间（分钟）',
    },
    {
      configKey: 'upload_max_size_mb',
      configValue: '5',
      description: '上传文件大小限制（MB）',
    },
  ]);
  console.log('  [sys_config] 插入 6 条');
}

async function seedCategories(ds: DataSource) {
  const catRepo = ds.getRepository('categories');
  const attrRepo = ds.getRepository('category_attributes');
  if ((await catRepo.count()) > 0) {
    console.log('  [categories] 已存在，跳过');
    return;
  }

  // 一级
  const liquor: any = await catRepo.save({ parentId: 0, name: '酒类', sort: 1 });
  const phone: any = await catRepo.save({ parentId: 0, name: '二手手机', sort: 2 });
  const farm: any = await catRepo.save({ parentId: 0, name: '农产品', sort: 3 });

  // 二级
  const liquorSubs = ['白酒', '红酒', '啤酒', '洋酒'];
  const phoneSubs = ['苹果', '华为', '小米', 'OPPO', 'vivo', '三星'];
  const farmSubs = ['水果', '蔬菜', '粮油', '特产'];

  const liquorChildren = await Promise.all(
    liquorSubs.map((n, i) => catRepo.save({ parentId: liquor.id, name: n, sort: i + 1 })),
  );
  await Promise.all(
    phoneSubs.map((n, i) => catRepo.save({ parentId: phone.id, name: n, sort: i + 1 })),
  );
  const farmChildren = await Promise.all(
    farmSubs.map((n, i) => catRepo.save({ parentId: farm.id, name: n, sort: i + 1 })),
  );

  console.log('  [categories] 插入 1 级 3 条 + 2 级 14 条');

  // 品类属性挂在「酒类」「二手手机」「农产品」一级上（业务实际可在二级，这里简化）
  await attrRepo.insert([
    {
      categoryId: liquor.id,
      attrName: '酒精度',
      attrType: 'number',
      isRequired: 1,
      sort: 1,
    },
    {
      categoryId: liquor.id,
      attrName: '产地',
      attrType: 'text',
      isRequired: 1,
      sort: 2,
    },
    {
      categoryId: liquor.id,
      attrName: '年份',
      attrType: 'text',
      isRequired: 0,
      sort: 3,
    },
    {
      categoryId: liquor.id,
      attrName: '香型',
      attrType: 'select',
      isRequired: 0,
      options: JSON.stringify(['浓香型', '酱香型', '清香型', '米香型', '兼香型']),
      sort: 4,
    },
    {
      categoryId: phone.id,
      attrName: '品牌',
      attrType: 'select',
      isRequired: 1,
      options: JSON.stringify(['苹果', '华为', '小米', 'OPPO', 'vivo', '三星', '其他']),
      sort: 1,
    },
    {
      categoryId: phone.id,
      attrName: '型号',
      attrType: 'text',
      isRequired: 1,
      sort: 2,
    },
    {
      categoryId: phone.id,
      attrName: '成色',
      attrType: 'radio',
      isRequired: 1,
      options: JSON.stringify(['全新', '99新', '95新', '9成新', '8成新']),
      sort: 3,
    },
    {
      categoryId: phone.id,
      attrName: '内存',
      attrType: 'select',
      isRequired: 1,
      options: JSON.stringify(['64GB', '128GB', '256GB', '512GB', '1TB']),
      sort: 4,
    },
    {
      categoryId: phone.id,
      attrName: '颜色',
      attrType: 'text',
      isRequired: 1,
      sort: 5,
    },
    {
      categoryId: phone.id,
      attrName: '是否有保修',
      attrType: 'radio',
      isRequired: 0,
      options: JSON.stringify(['有', '无']),
      sort: 6,
    },
    {
      categoryId: farm.id,
      attrName: '产地',
      attrType: 'text',
      isRequired: 1,
      sort: 1,
    },
    {
      categoryId: farm.id,
      attrName: '重量/规格',
      attrType: 'text',
      isRequired: 1,
      sort: 2,
    },
    {
      categoryId: farm.id,
      attrName: '保质期',
      attrType: 'text',
      isRequired: 0,
      sort: 3,
    },
    {
      categoryId: farm.id,
      attrName: '存储方式',
      attrType: 'select',
      isRequired: 0,
      options: JSON.stringify(['常温', '冷藏', '冷冻']),
      sort: 4,
    },
  ]);
  console.log('  [category_attributes] 插入 14 条');

  // 引用以避免 unused 警告
  void liquorChildren;
  void farmChildren;
}

async function seedFreight(ds: DataSource) {
  const tplRepo = ds.getRepository('freight_templates');
  const ruleRepo = ds.getRepository('freight_rules');
  if ((await tplRepo.count()) > 0) {
    console.log('  [freight_templates] 已存在，跳过');
    return;
  }
  const tpl: any = await tplRepo.save({
    name: '全国统一运费',
    billingType: 1,
    isFree: 0,
    freeThreshold: '99.00',
  });
  await ruleRepo.insert({
    templateId: tpl.id,
    regionCodes: null,
    firstUnit: 1,
    firstFee: '8.00',
    continueUnit: 1,
    continueFee: '5.00',
  });
  console.log('  [freight_templates] 插入默认模板 + 规则');
}
