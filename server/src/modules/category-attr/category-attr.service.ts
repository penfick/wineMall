import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';

import { CategoryEntity } from '@modules/category/entities/category.entity';
import { GoodsAttributeEntity } from '@modules/goods/entities/goods-attribute.entity';

import { CategoryAttributeEntity } from './entities/category-attribute.entity';
import {
  CreateCategoryAttrDto,
  UpdateCategoryAttrDto,
} from './dto/category-attr.dto';

interface AttrValueView {
  id: number;
  attrId: number;
  value: string;
  sort: number;
}

interface AttrView {
  id: number;
  categoryId: number;
  attrName: string;
  attrType: string;
  isRequired: number;
  options: string[];
  values: AttrValueView[];
  // 前端兼容字段
  name: string;
  type: 'sku' | 'normal';
  inputType: 'select' | 'input';
  required: number;
  sort: number;
}

const NEED_OPTIONS_TYPES = new Set(['select', 'radio']);

@Injectable()
export class CategoryAttrService {
  constructor(
    @InjectRepository(CategoryAttributeEntity)
    private readonly repo: Repository<CategoryAttributeEntity>,
    @InjectRepository(CategoryEntity)
    private readonly catRepo: Repository<CategoryEntity>,
    @InjectRepository(GoodsAttributeEntity)
    private readonly goodsAttrRepo: Repository<GoodsAttributeEntity>,
  ) {}

  /** 列表（按分类） */
  async listByCategory(categoryId: number): Promise<AttrView[]> {
    const list = await this.repo.find({
      where: { categoryId },
      order: { sort: 'ASC', id: 'ASC' },
    });
    return list.map((a) => this.toView(a));
  }

  async detail(id: number): Promise<AttrView> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');
    return this.toView(a);
  }

  async create(dto: CreateCategoryAttrDto) {
    await this.assertCategoryExists(dto.categoryId);
    this.assertOptionsByType(dto.attrType, dto.options);

    const exist = await this.repo.findOne({
      where: { categoryId: dto.categoryId, attrName: dto.attrName },
    });
    if (exist) {
      throw new BusinessException(ErrorCode.DATA_CONFLICT, '同分类下属性名称重复');
    }

    const saved = await this.repo.save(
      this.repo.create({
        categoryId: dto.categoryId,
        attrName: dto.attrName,
        attrType: dto.attrType,
        isRequired: dto.isRequired ?? 0,
        options: this.optionsToString(dto.options),
        sort: dto.sort ?? 0,
      }),
    );
    return this.toView(saved);
  }

  async update(id: number, dto: UpdateCategoryAttrDto) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');

    // 类型变更后须按新类型校验 options
    const targetType = dto.attrType ?? a.attrType;
    const targetOptions =
      dto.options !== undefined ? dto.options : this.parseOptions(a.options);
    this.assertOptionsByType(targetType, targetOptions);

    if (dto.attrName && dto.attrName !== a.attrName) {
      const dup = await this.repo.findOne({
        where: { categoryId: a.categoryId, attrName: dto.attrName },
      });
      if (dup && dup.id !== id) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '同分类下属性名称重复');
      }
    }

    await this.repo.update(id, {
      ...(dto.attrName !== undefined && { attrName: dto.attrName }),
      ...(dto.attrType !== undefined && { attrType: dto.attrType }),
      ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
      ...(dto.options !== undefined && { options: this.optionsToString(dto.options) }),
      ...(dto.sort !== undefined && { sort: dto.sort }),
    });
    return { ok: true };
  }

  async remove(id: number) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');

    const used = await this.goodsAttrRepo.count({ where: { attributeId: id } });
    if (used > 0) {
      throw new BusinessException(ErrorCode.ATTR_HAS_REFERENCE);
    }
    await this.repo.delete(id);
    return { ok: true };
  }

  // ==================== 工具 ====================

  private async assertCategoryExists(categoryId: number) {
    const c = await this.catRepo.findOne({ where: { id: categoryId } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '分类不存在');
  }

  private assertOptionsByType(attrType: string, options?: string[]) {
    if (NEED_OPTIONS_TYPES.has(attrType)) {
      if (!options || options.length === 0) {
        throw new BusinessException(
          ErrorCode.PARAM_INVALID,
          'select/radio 类型必须提供 options',
        );
      }
      const set = new Set(options.map((s) => s.trim()));
      if (set.size !== options.length) {
        throw new BusinessException(ErrorCode.PARAM_INVALID, 'options 不能重复');
      }
    }
  }

  private optionsToString(options?: string[]): string {
    if (!options || options.length === 0) return '';
    return JSON.stringify(options.map((s) => s.trim()).filter(Boolean));
  }

  private parseOptions(raw: string): string[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }

  private toView(a: CategoryAttributeEntity): AttrView {
    const opts = this.parseOptions(a.options);
    const values: AttrValueView[] = opts.map((v, i) => ({
      id: this.encodeValueId(a.id, i),
      attrId: a.id,
      value: v,
      sort: i,
    }));
    // 类型转换给前端：attrType 是后端枚举（select/radio/input/...）
    // 前端期望 type: 'sku'|'normal' + inputType: 'select'|'input'
    // 兼容：若 attrType 包含 'sku' 视为 sku，否则 normal；inputType 简化为 select/input
    const type: 'sku' | 'normal' = (a.attrType || '').toLowerCase().includes('sku')
      ? 'sku'
      : 'normal';
    const inputType: 'select' | 'input' = (a.attrType || '').toLowerCase().includes('input')
      ? 'input'
      : 'select';
    return {
      id: a.id,
      categoryId: a.categoryId,
      attrName: a.attrName,
      attrType: a.attrType,
      isRequired: a.isRequired,
      options: opts,
      values,
      name: a.attrName,
      type,
      inputType,
      required: a.isRequired,
      sort: a.sort,
    };
  }

  // ==================== 属性可选值（基于 options 数组的合成 API）====================

  private encodeValueId(attrId: number, index: number): number {
    // attrId * 10000 + index，假设单个属性的 options 不超过 10000 项
    return attrId * 10000 + index;
  }

  private decodeValueId(valueId: number): { attrId: number; index: number } {
    return { attrId: Math.floor(valueId / 10000), index: valueId % 10000 };
  }

  async createValue(dto: { attrId: number; value: string; sort?: number }) {
    const a = await this.repo.findOne({ where: { id: dto.attrId } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');
    const opts = this.parseOptions(a.options);
    const trimmed = (dto.value || '').trim();
    if (!trimmed) throw new BusinessException(ErrorCode.PARAM_INVALID, '值不能为空');
    if (opts.includes(trimmed)) {
      throw new BusinessException(ErrorCode.DATA_CONFLICT, '该值已存在');
    }
    opts.push(trimmed);
    a.options = this.optionsToString(opts);
    await this.repo.save(a);
    return { id: this.encodeValueId(a.id, opts.length - 1), attrId: a.id, value: trimmed };
  }

  async updateValue(valueId: number, dto: { value?: string; sort?: number }) {
    const { attrId, index } = this.decodeValueId(valueId);
    const a = await this.repo.findOne({ where: { id: attrId } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');
    const opts = this.parseOptions(a.options);
    if (index < 0 || index >= opts.length) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '可选值不存在');
    }
    if (dto.value !== undefined) {
      const trimmed = dto.value.trim();
      if (!trimmed) throw new BusinessException(ErrorCode.PARAM_INVALID, '值不能为空');
      const dupAt = opts.indexOf(trimmed);
      if (dupAt !== -1 && dupAt !== index) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '该值已存在');
      }
      opts[index] = trimmed;
    }
    a.options = this.optionsToString(opts);
    await this.repo.save(a);
    return { ok: true };
  }

  async removeValue(valueId: number) {
    const { attrId, index } = this.decodeValueId(valueId);
    const a = await this.repo.findOne({ where: { id: attrId } });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '属性不存在');
    const opts = this.parseOptions(a.options);
    if (index < 0 || index >= opts.length) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '可选值不存在');
    }
    opts.splice(index, 1);
    a.options = this.optionsToString(opts);
    await this.repo.save(a);
    return { ok: true };
  }
}
