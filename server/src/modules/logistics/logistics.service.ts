import { Injectable } from '@nestjs/common';
import { EntityManager, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { OrderEntity } from '@modules/order/entities/order.entity';

import { LogisticsCompanyEntity } from './entities/logistics-company.entity';
import { LogisticsTrackEntity } from './entities/logistics-track.entity';
import {
  CreateLogisticsCompanyDto,
  UpdateLogisticsCompanyDto,
} from './dto/logistics.dto';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectRepository(LogisticsCompanyEntity)
    private readonly companyRepo: Repository<LogisticsCompanyEntity>,
    @InjectRepository(LogisticsTrackEntity)
    private readonly trackRepo: Repository<LogisticsTrackEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  // ==================== 物流公司 CRUD ====================

  async listCompanies(onlyEnabled = false) {
    const where = onlyEnabled ? { status: 1 } : {};
    return this.companyRepo.find({
      where,
      order: { sort: 'DESC', id: 'ASC' },
    });
  }

  async pageCompanies(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.keyword) where.name = Like(`%${query.keyword}%`);
    if (query.status !== undefined && query.status !== null && (query.status as any) !== '') {
      where.status = Number(query.status);
    }
    const [list, total] = await this.companyRepo.findAndCount({
      where,
      order: { sort: 'DESC', id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ==================== 发货记录 ====================

  async pageShipments(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    companyCode?: string;
    status?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoin(
        LogisticsCompanyEntity,
        'c',
        'c.id = o.logistics_company_id',
      )
      .where('o.shipped_at IS NOT NULL');

    if (query.keyword) {
      qb.andWhere(
        '(o.order_no LIKE :kw OR o.tracking_no LIKE :kw OR o.receiver_name LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.companyCode) {
      qb.andWhere('c.code = :code', { code: query.companyCode });
    }
    if (query.status !== undefined && query.status !== null && (query.status as any) !== '') {
      qb.andWhere('o.status = :st', { st: Number(query.status) });
    }
    if (query.startDate) {
      qb.andWhere('o.shipped_at >= :sd', { sd: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.shipped_at <= :ed', { ed: query.endDate + ' 23:59:59' });
    }

    const total = await qb.getCount();
    const rows = await qb
      .select([
        'o.id AS id',
        'o.id AS orderId',
        'o.order_no AS orderNo',
        'c.code AS companyCode',
        'c.name AS companyName',
        'o.tracking_no AS trackingNo',
        'o.status AS status',
        'o.shipped_at AS shippedAt',
        'o.completed_at AS receivedAt',
      ])
      .orderBy('o.shipped_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return { list: rows, total, page, pageSize };
  }

  async detailShipment(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order || !order.shippedAt) {
      throw new BusinessException(ErrorCode.DATA_NOT_FOUND, '发货记录不存在');
    }
    const company = order.logisticsCompanyId
      ? await this.companyRepo.findOne({ where: { id: order.logisticsCompanyId } })
      : null;
    return {
      id: order.id,
      orderId: order.id,
      orderNo: order.orderNo,
      companyCode: company?.code ?? '',
      companyName: company?.name ?? '',
      trackingNo: order.trackingNo,
      status: order.status,
      shippedAt: order.shippedAt,
      receivedAt: order.completedAt,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: `${order.receiverProvince}${order.receiverCity}${order.receiverDistrict}${order.receiverAddress}`,
    };
  }

  async traceShipment(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const tracks = await this.getOrderTracks(order.id);
    return tracks.map((t: any) => ({
      time: t.trackTime,
      description: t.description,
    }));
  }

  async detailCompany(id: number) {
    const c = await this.companyRepo.findOne({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return c;
  }

  async createCompany(dto: CreateLogisticsCompanyDto) {
    const exists = await this.companyRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new BusinessException(ErrorCode.DATA_CONFLICT, '物流公司编码已存在');
    }
    return this.companyRepo.save(
      this.companyRepo.create({
        name: dto.name,
        code: dto.code,
        status: dto.status ?? 1,
        sort: dto.sort ?? 0,
      }),
    );
  }

  async updateCompany(id: number, dto: UpdateLogisticsCompanyDto) {
    const c = await this.detailCompany(id);
    if (dto.code !== c.code) {
      const dup = await this.companyRepo.findOne({ where: { code: dto.code } });
      if (dup) {
        throw new BusinessException(ErrorCode.DATA_CONFLICT, '物流公司编码已存在');
      }
    }
    Object.assign(c, dto);
    return this.companyRepo.save(c);
  }

  async removeCompany(id: number) {
    await this.detailCompany(id);
    await this.companyRepo.delete(id);
    return { id };
  }

  // ==================== 轨迹（mock 实现）====================

  /**
   * 内部 API：订单发货时创建初始轨迹
   * 注意：在 Order 事务内调用，传入 EntityManager
   */
  async createInitialTrack(
    m: EntityManager,
    orderId: number,
    description = '商家已揽件',
  ) {
    await m.getRepository(LogisticsTrackEntity).save(
      m.getRepository(LogisticsTrackEntity).create({
        orderId,
        trackTime: new Date(),
        status: '已揽件',
        description,
      }),
    );
  }

  /**
   * C 端查询订单轨迹
   * MVP：真实数据库轨迹 + Mock 补足 3 条假数据
   * 后期接快递 100 等真实接口时只改这里
   */
  async getOrderTracks(orderId: number) {
    const real = await this.trackRepo.find({
      where: { orderId },
      order: { trackTime: 'DESC', id: 'DESC' },
    });
    if (real.length >= 3) return real;

    // Mock 补足
    const now = Date.now();
    const mocks: Array<{ trackTime: Date; status: string; description: string }> = [];
    if (real.length === 0) {
      mocks.push({
        trackTime: new Date(now - 1000 * 60 * 60 * 24 * 2),
        status: '已揽件',
        description: '【上海中转中心】商家已揽件',
      });
    }
    mocks.push({
      trackTime: new Date(now - 1000 * 60 * 60 * 12),
      status: '运输中',
      description: '【上海转运中心】快件已发往【目的地】',
    });
    mocks.push({
      trackTime: new Date(now - 1000 * 60 * 30),
      status: '派送中',
      description: '【目的地网点】快件正在派送，请保持手机畅通',
    });
    return [...real, ...mocks].sort(
      (a, b) => b.trackTime.getTime() - a.trackTime.getTime(),
    );
  }
}
