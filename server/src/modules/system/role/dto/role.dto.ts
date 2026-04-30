import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  /** 关联菜单 ID（含按钮 ID）；可空 */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  menuIds?: number[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  menuIds?: number[];
}

export class RoleQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class AssignMenuDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  menuIds!: number[];
}
