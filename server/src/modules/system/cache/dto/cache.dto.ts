import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CacheKeyQueryDto {
  /** 匹配 pattern；空 / 缺省时按 * 处理 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pattern?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;
}

export class CacheClearDto {
  /** 二选一：pattern 优先，否则用 prefix 自动拼成 `${prefix}*` */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  pattern?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  prefix?: string;

  /** 二次确认；必须为真值（true 或 'CONFIRM' 字符串） */
  confirm: boolean | string;
}
