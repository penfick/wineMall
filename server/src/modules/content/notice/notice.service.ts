import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { NoticeEntity } from '../entities/notice.entity';
import {
  CreateNoticeDto,
  NoticeQueryDto,
  PublicNoticeListDto,
  UpdateNoticeDto,
} from './dto/notice.dto';

interface NoticeListItem {
  id: number;
  title: string;
  status: number;
  isTop: number;
  publishTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NoticeDetail extends NoticeListItem {
  content: string | null;
}

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(NoticeEntity)
    private readonly repo: Repository<NoticeEntity>,
  ) {}

  // ==================== B 端 ====================

  async pageAdmin(query: NoticeQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = {};
    if (query.keyword) where.title = Like(`%${query.keyword}%`);
    if (query.status !== undefined) where.status = query.status;

    const [list, total] = await this.repo.findAndCount({
      where,
      select: [
        'id',
        'title',
        'status',
        'isTop',
        'publishTime',
        'createdAt',
        'updatedAt',
      ],
      order: { isTop: 'DESC', publishTime: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async detailAdmin(id: number): Promise<NoticeDetail> {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return n;
  }

  async create(dto: CreateNoticeDto): Promise<NoticeDetail> {
    const status = dto.status ?? 0;
    const ent = this.repo.create({
      title: dto.title,
      content: dto.content ?? null,
      status,
      isTop: dto.isTop ?? 0,
      publishTime: status === 1 ? new Date() : null,
    });
    return this.repo.save(ent);
  }

  async update(id: number, dto: UpdateNoticeDto): Promise<NoticeDetail> {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);

    const nextStatus = dto.status ?? n.status;
    // 草稿→发布：盖发布时间；其他保持
    if (n.status !== 1 && nextStatus === 1) {
      n.publishTime = new Date();
    }

    Object.assign(n, {
      title: dto.title ?? n.title,
      content: dto.content !== undefined ? dto.content : n.content,
      status: nextStatus,
      isTop: dto.isTop ?? n.isTop,
    });
    return this.repo.save(n);
  }

  async toggleStatus(id: number, status: number): Promise<void> {
    if (![0, 1].includes(status)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, 'status 仅支持 0/1');
    }
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    if (n.status !== 1 && status === 1) {
      n.publishTime = new Date();
    }
    n.status = status;
    await this.repo.save(n);
  }

  async toggleTop(id: number, isTop: number): Promise<void> {
    if (![0, 1].includes(isTop)) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, 'isTop 仅支持 0/1');
    }
    await this.repo.update(id, { isTop });
  }

  async remove(id: number): Promise<void> {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    await this.repo.delete(id);
  }

  // ==================== C 端 ====================

  async pagePublic(query: PublicNoticeListDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [list, total] = await this.repo.findAndCount({
      where: { status: 1 },
      select: [
        'id',
        'title',
        'isTop',
        'publishTime',
      ],
      order: { isTop: 'DESC', publishTime: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async detailPublic(id: number): Promise<NoticeDetail> {
    const n = await this.repo.findOne({ where: { id, status: 1 } });
    if (!n) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return n;
  }
}
