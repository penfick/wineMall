import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDictTypeDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'code 只能是小写字母/数字/下划线，且字母开头' })
  code!: string;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateDictTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class DictTypeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 20;
}

export class CreateDictItemDto {
  @IsInt()
  @Min(1)
  dictTypeId!: number;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsString()
  @MaxLength(100)
  value!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateDictItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  value?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}
