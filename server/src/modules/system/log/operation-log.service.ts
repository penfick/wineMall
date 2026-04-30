import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { OperationLogEntity } from '@modules/system/entities/operation-log.entity';

interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  username?: string;
  module?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class OperationLogService {
  constructor(
    @InjectRepository(OperationLogEntity)
    private readonly repo: Repository<OperationLogEntity>,
  ) {}

  async page(query: PageQuery) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    const qb = this.repo.createQueryBuilder('l');
    if (query.keyword) {
      qb.andWhere(
        '(l.action LIKE :kw OR l.target LIKE :kw OR l.module LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.username) {
      qb.andWhere('l.admin_name LIKE :un', { un: `%${query.username}%` });
    }
    if (query.module) {
      qb.andWhere('l.module = :m', { m: query.module });
    }
    if (query.startDate) {
      qb.andWhere('l.created_at >= :sd', { sd: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('l.created_at <= :ed', { ed: query.endDate + ' 23:59:59' });
    }
    qb.orderBy('l.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const list = rows.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      username: r.adminName,
      module: r.module,
      action: r.action,
      description: r.target,
      method: '',
      path: '',
      ip: r.ip,
      status: 'success',
      durationMs: 0,
      detail: r.detail,
      createdAt: r.createdAt,
    }));
    return { list, total, page, pageSize };
  }

  async detail(id: number) {
    const log = await this.repo.findOne({ where: { id } });
    if (!log) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return log;
  }

  async clear(beforeDate: string, confirm: string) {
    if (confirm !== 'CONFIRM') {
      throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, '需要二次确认');
    }
    if (!beforeDate) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '必须指定 beforeDate');
    }
    const cutoff = new Date(beforeDate);
    if (isNaN(cutoff.getTime())) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, 'beforeDate 格式错误');
    }
    const r = await this.repo.delete({ createdAt: LessThan(cutoff) });
    return { removed: r.affected ?? 0 };
  }
}
