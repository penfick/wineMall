import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CategoryQueryDto {
  /** 仅查某父节点下子级；不传则返回全树 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  /** 1=启用 0=禁用 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  keyword?: string;
}

export class CreateCategoryDto {
  @IsInt()
  @Min(0)
  parentId: number;

  @IsString()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  sort?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  parentId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  icon?: string;

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

export class BatchSortDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SortItem)
  items: SortItem[];
}
