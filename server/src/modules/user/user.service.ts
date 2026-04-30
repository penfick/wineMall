import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { AddressEntity } from '@modules/address/entities/address.entity';
import { OrderEntity } from '@modules/order/entities/order.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AddressEntity) private readonly addressRepo: Repository<AddressEntity>,
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async page(query: UserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (query.keyword) {
      qb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw OR u.openid LIKE :kw)', {
        kw: `%${query.keyword}%`,
      });
    }
    if (typeof query.status === 'number') {
      qb.andWhere('u.status = :status', { status: query.status });
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('u.createdAt BETWEEN :s AND :e', {
        s: `${query.startDate} 00:00:00`,
        e: `${query.endDate} 23:59:59`,
      });
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // 聚合订单统计
    const userIds = list.map((u) => u.id);
    const stats = userIds.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('o.userId', 'userId')
          .addSelect('COUNT(o.id)', 'totalOrders')
          .addSelect('COALESCE(SUM(o.payAmount), 0)', 'totalAmount')
          .where('o.userId IN (:...ids)', { ids: userIds })
          .andWhere('o.status IN (:...statuses)', { statuses: [1, 2, 3] })
          .groupBy('o.userId')
          .getRawMany()
      : [];
    const statsMap = new Map<number, { totalOrders: number; totalAmount: number }>();
    for (const s of stats) {
      statsMap.set(Number(s.userId), {
        totalOrders: Number(s.totalOrders),
        totalAmount: Number(s.totalAmount),
      });
    }

    return {
      list: list.map((u) => this.format(u, statsMap.get(u.id))),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    const stat = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(o.payAmount), 0)', 'totalAmount')
      .where('o.userId = :id', { id })
      .andWhere('o.status IN (:...statuses)', { statuses: [1, 2, 3] })
      .getRawOne();
    return this.format(user, {
      totalOrders: Number(stat?.totalOrders ?? 0),
      totalAmount: Number(stat?.totalAmount ?? 0),
    });
  }

  async toggleStatus(id: number, status: 0 | 1) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    user.status = status;
    await this.userRepo.save(user);
  }

  async addresses(userId: number) {
    const list = await this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', id: 'DESC' },
    });
    return list.map((a) => ({
      id: a.id,
      name: a.receiverName,
      phone: a.receiverPhone,
      province: a.provinceName,
      city: a.cityName,
      district: a.districtName,
      detail: a.detailAddress,
      isDefault: a.isDefault,
    }));
  }

  async orders(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.orderRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      list: list.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        totalAmount: Number(o.payAmount),
        status: o.status,
        createdAt: o.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private format(u: UserEntity, stat?: { totalOrders: number; totalAmount: number }) {
    return {
      id: u.id,
      openid: u.openid,
      nickname: u.nickname,
      avatar: u.avatar,
      phone: u.phone,
      gender: 0,
      status: u.status,
      totalOrders: stat?.totalOrders ?? 0,
      totalAmount: stat?.totalAmount ?? 0,
      registeredAt: u.createdAt,
      lastLoginAt: null,
    };
  }
}
