import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuDto {
  @IsInt()
  @Min(0)
  parentId!: number;

  @IsString()
  @MaxLength(50)
  name!: string;

  /** 1=目录 2=菜单 3=按钮 */
  @IsInt()
  @IsIn([1, 2, 3])
  type!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  component?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  permission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sort?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateMenuDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  parentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3])
  type?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  component?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  permission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sort?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class MenuQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  /** 0=禁用 1=启用 */
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}
