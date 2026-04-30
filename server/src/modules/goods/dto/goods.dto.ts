import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// ==================== 子结构 ====================

/** SKU 规格 */
export class GoodsSpecDto {
  /** 编辑时回填，新增不传 */
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  /** 规格描述，如 "红色|XL"。允许为空（无规格商品） */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  attrText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skuCode?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  marketPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  costPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockWarning?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  /** 1=有效 0=失效 */
  @IsOptional()
  @IsInt()
  status?: number;
}

export class GoodsAttributeDto {
  @IsInt()
  @Min(1)
  attributeId: number;

  @IsString()
  @MaxLength(500)
  attrValue: string;
}

// ==================== B 端：CRUD ====================

export class GoodsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  /** 1=只看库存预警 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warning?: number;

  /** 兼容前端：lowStock=true 等价 warning=1 */
  @IsOptional()
  lowStock?: boolean | string;
}

export class CreateGoodsDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subTitle?: string;

  @IsString()
  @MaxLength(500)
  mainImage: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  marketPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  costPrice?: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockWarning?: number;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  freightTemplateId?: number;

  /** SKU 列表，可为空数组（无规格商品按主商品 price/stock 走） */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GoodsSpecDto)
  specs?: GoodsSpecDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsAttributeDto)
  attributes?: GoodsAttributeDto[];
}

export class UpdateGoodsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mainImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  marketPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  costPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockWarning?: number;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  freightTemplateId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GoodsSpecDto)
  specs?: GoodsSpecDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsAttributeDto)
  attributes?: GoodsAttributeDto[];
}

export class BatchStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

  @IsInt()
  status: number;
}

// ==================== C 端：列表/搜索 ====================

export class PublicGoodsListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  /** sort: default | sales | price-asc | price-desc | new */
  @IsOptional()
  @IsString()
  sort?: string;
}

// 兼容旧 service 引用
export type GoodsImageDto = string;
