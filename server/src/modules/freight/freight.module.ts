import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { FreightTemplateEntity } from './entities/freight-template.entity';
import { FreightRuleEntity } from './entities/freight-rule.entity';
import {
  AdminFreightController,
  UserFreightController,
} from './freight.controller';
import { FreightService } from './freight.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FreightTemplateEntity,
      FreightRuleEntity,
      GoodsEntity,
      GoodsSpecEntity,
    ]),
  ],
  controllers: [AdminFreightController, UserFreightController],
  providers: [FreightService],
  exports: [FreightService],
})
export class FreightModule {}
