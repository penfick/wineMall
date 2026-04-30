import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { FreightTemplateEntity } from './entities/freight-template.entity';
import { FreightRuleEntity } from './entities/freight-rule.entity';
import {
  CreateFreightTemplateDto,
  FreightCalcDto,
  FreightRuleItemDto,
  UpdateFreightTemplateDto,
} from './dto/freight.dto';

interface MatchedRule {
  templateId: number;
  isFree: boolean;
  freeThreshold: number; // 元
  billingType: number; // 1=件 2=克
  firstUnit: number;
  firstFee: number; // 元
  continueUnit: number;
  continueFee: number; // 元
}

interface CalcGoodsItem {
  goodsId: number;
  skuId: number;
  qty: number;
  weight: number;
  price: number;
  freightTemplateId: number | null;
}

@Injectable()
export class FreightService {
  constructor(
    @InjectRepository(FreightTemplateEntity)
    private readonly tplRepo: Repository<FreightTemplateEntity>,
    @InjectRepository(FreightRuleEntity)
    private readonly ruleRepo: Repository<FreightRuleEntity>,
    @InjectRepository(GoodsEntity)
    private readonly goodsRepo: Repository<GoodsEntity>,
    @InjectRepository(GoodsSpecEntity)
    private readonly skuRepo: Repository<GoodsSpecEntity>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ==================== 模板 CRUD ====================

  async page(query: { page?: number; pageSize?: number; keyword?: string; status?: number }) {
    const all = await this.list();
    let filtered = all;
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter((t: any) => (t.name || '').toLowerCase().includes(kw));
    }
    if (typeof query.status === 'number') {
      filtered = filtered.filter((t: any) => t.status === query.status);
    }
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const total = filtered.length;
    const list = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { list, total, page, pageSize };
  }

  async setDefault(id: number) {
    const tpl = await this.tplRepo.findOne({ where: { id } });
    if (!tpl) throw new BusinessException(ErrorCode.FREIGHT_TEMPLATE_INVALID);
    await this.ds.transaction(async (m) => {
      await m.getRepository(FreightTemplateEntity).update({}, { isDefault: 0 });
      await m.getRepository(FreightTemplateEntity).update(id, { isDefault: 1 });
    });
    return { ok: true };
  }

  async list() {
    const tpls = await this.tplRepo.find({ order: { id: 'DESC' } });
    if (!tpls.length) return [];
    const rules = await this.ruleRepo.find({
      where: { templateId: In(tpls.map((t) => t.id)) },
      order: { id: 'ASC' },
    });
    const ruleMap = new Map<number, FreightRuleEntity[]>();
    for (const r of rules) {
      const arr = ruleMap.get(r.templateId) ?? [];
      arr.push(r);
      ruleMap.set(r.templateId, arr);
    }
    return tpls.map((t) => ({
      ...t,
      rules: (ruleMap.get(t.id) ?? []).map((r) => ({
        ...r,
        regionCodes: r.regionCodes ? (JSON.parse(r.regionCodes) as string[]) : null,
      })),
    }));
  }

  async detail(id: number) {
    const tpl = await this.tplRepo.findOne({ where: { id } });
    if (!tpl) throw new BusinessException(ErrorCode.FREIGHT_TEMPLATE_INVALID);
    const rules = await this.ruleRepo.find({
      where: { templateId: id },
      order: { id: 'ASC' },
    });
    return {
      ...tpl,
      rules: rules.map((r) => ({
        ...r,
        regionCodes: r.regionCodes ? (JSON.parse(r.regionCodes) as string[]) : null,
      })),
    };
  }

  async create(dto: CreateFreightTemplateDto) {
    this.assertRules(dto.rules);
    return this.ds.transaction(async (m) => {
      const tpl = await m.getRepository(FreightTemplateEntity).save(
        m.getRepository(FreightTemplateEntity).create({
          name: dto.name,
          billingType: dto.billingType,
          isFree: dto.isFree,
          freeThreshold: dto.freeThreshold ?? null,
        }),
      );
      await m.getRepository(FreightRuleEntity).save(
        dto.rules.map((r) =>
          m.getRepository(FreightRuleEntity).create({
            templateId: tpl.id,
            regionCodes: r.regionCodes && r.regionCodes.length
              ? JSON.stringify(r.regionCodes)
              : null,
            firstUnit: r.firstUnit,
            firstFee: r.firstFee,
            continueUnit: r.continueUnit,
            continueFee: r.continueFee,
          }),
        ),
      );
      return { id: tpl.id };
    });
  }

  async update(id: number, dto: UpdateFreightTemplateDto) {
    this.assertRules(dto.rules);
    const tpl = await this.tplRepo.findOne({ where: { id } });
    if (!tpl) throw new BusinessException(ErrorCode.FREIGHT_TEMPLATE_INVALID);
    return this.ds.transaction(async (m) => {
      Object.assign(tpl, {
        name: dto.name,
        billingType: dto.billingType,
        isFree: dto.isFree,
        freeThreshold: dto.freeThreshold ?? null,
      });
      await m.getRepository(FreightTemplateEntity).save(tpl);
      await m.getRepository(FreightRuleEntity).delete({ templateId: id });
      await m.getRepository(FreightRuleEntity).save(
        dto.rules.map((r) =>
          m.getRepository(FreightRuleEntity).create({
            templateId: id,
            regionCodes: r.regionCodes && r.regionCodes.length
              ? JSON.stringify(r.regionCodes)
              : null,
            firstUnit: r.firstUnit,
            firstFee: r.firstFee,
            continueUnit: r.continueUnit,
            continueFee: r.continueFee,
          }),
        ),
      );
      return { id };
    });
  }

  async remove(id: number) {
    const tpl = await this.tplRepo.findOne({ where: { id } });
    if (!tpl) throw new BusinessException(ErrorCode.FREIGHT_TEMPLATE_INVALID);
    // 引用校验：被任何 goods 引用则禁止删除
    const usedBy = await this.goodsRepo.count({
      where: { freightTemplateId: id, deletedAt: IsNull() },
    });
    if (usedBy > 0) {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        `还有 ${usedBy} 个商品在使用该运费模板`,
      );
    }
    await this.ds.transaction(async (m) => {
      await m.getRepository(FreightRuleEntity).delete({ templateId: id });
      await m.getRepository(FreightTemplateEntity).delete(id);
    });
    return { id };
  }

  private assertRules(rules: FreightRuleItemDto[]) {
    let defaults = 0;
    const seen = new Set<string>();
    for (const r of rules) {
      if (!r.regionCodes || r.regionCodes.length === 0) {
        defaults += 1;
        continue;
      }
      for (const c of r.regionCodes) {
        if (seen.has(c)) {
          throw new BusinessException(
            ErrorCode.PARAM_INVALID,
            `区域 ${c} 在多条规则中重复`,
          );
        }
        seen.add(c);
      }
    }
    if (defaults > 1) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '兜底规则只能有一条');
    }
  }

  // ==================== 运费计算（公开 API + 内部 API）====================

  /** 给定 SKU+数量+收货省份 -> 总运费 */
  async calc(dto: FreightCalcDto) {
    const items = await this.loadCalcItems(dto.items);
    return this.calcInternal(items, dto.provinceCode);
  }

  /** 内部 API：从已加载的 items 计算（订单服务用） */
  async calcInternal(
    items: CalcGoodsItem[],
    provinceCode: string,
  ): Promise<{ amount: string; details: Array<{ templateId: number; amount: string; reason: string }> }> {
    if (!items.length) {
      return { amount: '0.00', details: [] };
    }
    // 按 templateId 分组（无模板 -> 视为统一兜底「不收运费」组 0）
    const grouped = new Map<number, CalcGoodsItem[]>();
    for (const it of items) {
      const tid = it.freightTemplateId ?? 0;
      const arr = grouped.get(tid) ?? [];
      arr.push(it);
      grouped.set(tid, arr);
    }

    const tplIds = Array.from(grouped.keys()).filter((id) => id > 0);
    const [tpls, rules] = await Promise.all([
      tplIds.length
        ? this.tplRepo.find({ where: { id: In(tplIds) } })
        : Promise.resolve([] as FreightTemplateEntity[]),
      tplIds.length
        ? this.ruleRepo.find({ where: { templateId: In(tplIds) } })
        : Promise.resolve([] as FreightRuleEntity[]),
    ]);
    const tplMap = new Map(tpls.map((t) => [t.id, t]));
    const rulesByTpl = new Map<number, FreightRuleEntity[]>();
    for (const r of rules) {
      const arr = rulesByTpl.get(r.templateId) ?? [];
      arr.push(r);
      rulesByTpl.set(r.templateId, arr);
    }

    let totalCents = 0;
    const details: Array<{ templateId: number; amount: string; reason: string }> = [];

    for (const [tid, group] of grouped) {
      if (tid === 0) {
        details.push({ templateId: 0, amount: '0.00', reason: '商品未配置运费模板，按免运费处理' });
        continue;
      }
      const tpl = tplMap.get(tid);
      if (!tpl) {
        details.push({ templateId: tid, amount: '0.00', reason: '运费模板已删除，按免运费处理' });
        continue;
      }
      if (tpl.isFree === 1) {
        details.push({ templateId: tid, amount: '0.00', reason: '该模板设置全场包邮' });
        continue;
      }

      const groupAmountCents = group.reduce(
        (s, x) => s + Math.round(x.price * 100) * x.qty,
        0,
      );
      const threshold = tpl.freeThreshold ? parseFloat(tpl.freeThreshold) : 0;
      if (threshold > 0 && groupAmountCents >= Math.round(threshold * 100)) {
        details.push({
          templateId: tid,
          amount: '0.00',
          reason: `订单金额已达 ${threshold} 元包邮门槛`,
        });
        continue;
      }

      const matched = this.matchRule(rulesByTpl.get(tid) ?? [], provinceCode, tpl);
      if (!matched) {
        details.push({
          templateId: tid,
          amount: '0.00',
          reason: '未匹配到运费规则，按免运费处理',
        });
        continue;
      }

      // 计算单位（件 or 克）
      const totalUnit =
        tpl.billingType === 1
          ? group.reduce((s, x) => s + x.qty, 0)
          : group.reduce((s, x) => s + x.weight * x.qty, 0);

      let feeCents = 0;
      if (totalUnit <= matched.firstUnit) {
        feeCents = Math.round(matched.firstFee * 100);
      } else {
        const extra = totalUnit - matched.firstUnit;
        const steps = Math.ceil(extra / Math.max(1, matched.continueUnit));
        feeCents = Math.round(matched.firstFee * 100) + steps * Math.round(matched.continueFee * 100);
      }
      totalCents += feeCents;
      details.push({
        templateId: tid,
        amount: (feeCents / 100).toFixed(2),
        reason: `按${tpl.billingType === 1 ? '件' : '重量'}计费，${totalUnit}${tpl.billingType === 1 ? '件' : 'g'}`,
      });
    }

    return { amount: (totalCents / 100).toFixed(2), details };
  }

  /** 把 [{skuId,qty}] 加载成完整的计算项（带价格/重量/运费模板） */
  async loadCalcItems(
    items: Array<{ skuId: number; quantity: number }>,
  ): Promise<CalcGoodsItem[]> {
    const skuIds = items.map((i) => i.skuId);
    const skus = await this.skuRepo.find({
      where: { id: In(skuIds), deletedAt: IsNull() },
    });
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const goodsIds = Array.from(new Set(skus.map((s) => s.goodsId)));
    const goods = goodsIds.length
      ? await this.goodsRepo.find({
          where: { id: In(goodsIds), deletedAt: IsNull() },
        })
      : [];
    const goodsMap = new Map(goods.map((g) => [g.id, g]));

    const out: CalcGoodsItem[] = [];
    for (const it of items) {
      const sku = skuMap.get(it.skuId);
      if (!sku) continue;
      const g = goodsMap.get(sku.goodsId);
      if (!g) continue;
      out.push({
        goodsId: sku.goodsId,
        skuId: sku.id,
        qty: it.quantity,
        weight: sku.weight,
        price: parseFloat(sku.price),
        freightTemplateId: g.freightTemplateId,
      });
    }
    return out;
  }

  private matchRule(
    rules: FreightRuleEntity[],
    provinceCode: string,
    tpl: FreightTemplateEntity,
  ): MatchedRule | null {
    let fallback: FreightRuleEntity | null = null;
    for (const r of rules) {
      if (!r.regionCodes) {
        fallback = r;
        continue;
      }
      try {
        const codes = JSON.parse(r.regionCodes) as string[];
        if (codes.includes(provinceCode)) {
          return this.toMatched(r, tpl);
        }
      } catch {
        // 忽略坏数据
      }
    }
    return fallback ? this.toMatched(fallback, tpl) : null;
  }

  private toMatched(r: FreightRuleEntity, tpl: FreightTemplateEntity): MatchedRule {
    return {
      templateId: r.templateId,
      isFree: tpl.isFree === 1,
      freeThreshold: tpl.freeThreshold ? parseFloat(tpl.freeThreshold) : 0,
      billingType: tpl.billingType,
      firstUnit: r.firstUnit,
      firstFee: parseFloat(r.firstFee),
      continueUnit: r.continueUnit,
      continueFee: parseFloat(r.continueFee),
    };
  }
}
