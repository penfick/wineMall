import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';

import { RegionService } from '@modules/region/region.service';

import { AddressEntity } from './entities/address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

const MAX_ADDRESS_PER_USER = 20;

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly repo: Repository<AddressEntity>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly region: RegionService,
  ) {}

  async list(userId: number) {
    return this.repo.find({
      where: { userId, deletedAt: IsNull() },
      order: { isDefault: 'DESC', updatedAt: 'DESC' },
    });
  }

  async detail(userId: number, id: number) {
    const a = await this.repo.findOne({
      where: { id, userId, deletedAt: IsNull() },
    });
    if (!a) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    return a;
  }

  /** 获取用户默认地址（结算页用） */
  async getDefault(userId: number) {
    return this.repo.findOne({
      where: { userId, isDefault: 1, deletedAt: IsNull() },
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    const count = await this.repo.count({ where: { userId, deletedAt: IsNull() } });
    if (count >= MAX_ADDRESS_PER_USER) {
      throw new BusinessException(ErrorCode.ADDRESS_LIMIT_EXCEEDED);
    }
    const { province, city, district } = await this.region.validateChain(
      dto.provinceCode,
      dto.cityCode,
      dto.districtCode,
    );

    const shouldBeDefault = count === 0 || dto.isDefault === 1;

    return this.ds.transaction(async (m) => {
      if (shouldBeDefault) {
        await m
          .getRepository(AddressEntity)
          .update({ userId, deletedAt: IsNull() }, { isDefault: 0 });
      }
      const entity = m.getRepository(AddressEntity).create({
        userId,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        provinceCode: dto.provinceCode,
        cityCode: dto.cityCode,
        districtCode: dto.districtCode,
        provinceName: province.name,
        cityName: city.name,
        districtName: district.name,
        detailAddress: dto.detailAddress,
        isDefault: shouldBeDefault ? 1 : 0,
      });
      return m.getRepository(AddressEntity).save(entity);
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    const a = await this.detail(userId, id);
    const { province, city, district } = await this.region.validateChain(
      dto.provinceCode,
      dto.cityCode,
      dto.districtCode,
    );

    return this.ds.transaction(async (m) => {
      if (dto.isDefault === 1 && a.isDefault !== 1) {
        await m
          .getRepository(AddressEntity)
          .update(
            { userId, deletedAt: IsNull(), id: Not(id) },
            { isDefault: 0 },
          );
      }
      Object.assign(a, {
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        provinceCode: dto.provinceCode,
        cityCode: dto.cityCode,
        districtCode: dto.districtCode,
        provinceName: province.name,
        cityName: city.name,
        districtName: district.name,
        detailAddress: dto.detailAddress,
        isDefault: dto.isDefault === 1 ? 1 : a.isDefault,
      });
      return m.getRepository(AddressEntity).save(a);
    });
  }

  async setDefault(userId: number, id: number) {
    await this.detail(userId, id); // 校验存在
    return this.ds.transaction(async (m) => {
      await m
        .getRepository(AddressEntity)
        .update({ userId, deletedAt: IsNull() }, { isDefault: 0 });
      await m
        .getRepository(AddressEntity)
        .update({ id, userId, deletedAt: IsNull() }, { isDefault: 1 });
      return { id, isDefault: 1 };
    });
  }

  async remove(userId: number, id: number) {
    const a = await this.detail(userId, id);
    await this.repo.softRemove(a);

    // 如果删的是默认地址，自动把最近更新的另一条置为默认
    if (a.isDefault === 1) {
      const next = await this.repo.findOne({
        where: { userId, deletedAt: IsNull() },
        order: { updatedAt: 'DESC' },
      });
      if (next) {
        next.isDefault = 1;
        await this.repo.save(next);
      }
    }
    return { id };
  }
}
