import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export const ATTR_TYPES = ['text', 'number', 'select', 'radio'] as const;
export type AttrType = (typeof ATTR_TYPES)[number];

export class CategoryAttrQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;
}

export class CreateCategoryAttrDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  @Length(1, 50)
  attrName: string;

  @IsIn(ATTR_TYPES as unknown as string[])
  attrType: AttrType;

  @IsOptional()
  @IsInt()
  isRequired?: number;

  /** select/radio 时必填 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;
}

export class UpdateCategoryAttrDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  attrName?: string;

  @IsOptional()
  @IsIn(ATTR_TYPES as unknown as string[])
  attrType?: AttrType;

  @IsOptional()
  @IsInt()
  isRequired?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;
}
