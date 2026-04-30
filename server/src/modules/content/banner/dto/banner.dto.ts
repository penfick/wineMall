import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** 0=无跳转 1=商品详情 2=品类列表 3=外链 */
export const LINK_TYPES = [0, 1, 2, 3] as const;

export class BannerQueryDto {
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
  @Length(0, 100)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  title?: string;

  @IsString()
  @Length(1, 500)
  imageUrl: string;

  @IsOptional()
  @IsInt()
  @IsIn(LINK_TYPES as unknown as number[])
  linkType?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  linkValue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @IsIn(LINK_TYPES as unknown as number[])
  linkType?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  linkValue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

class SortItem {
  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(0)
  @Max(99999)
  sort: number;
}

export class BannerSortDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SortItem)
  items: SortItem[];
}
