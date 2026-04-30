import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** 通用分页参数 DTO */
export class PageQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 构建分页结果 */
export function pageResult<T>(
  list: T[],
  total: number,
  page = 1,
  pageSize = 20,
): PageResult<T> {
  return { list, total, page, pageSize };
}

/** 计算 TypeORM skip / take */
export function pageOffset(query: PageQueryDto): { skip: number; take: number } {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  return { skip: (page - 1) * pageSize, take: pageSize };
}
