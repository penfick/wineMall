import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class NoticeQueryDto {
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

export class CreateNoticeDto {
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  /** 0=草稿 1=已发布 */
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isTop?: number;
}

export class UpdateNoticeDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isTop?: number;
}

export class PublicNoticeListDto {
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
}
