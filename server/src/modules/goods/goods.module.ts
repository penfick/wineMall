import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryEntity } from '@modules/category/entities/category.entity';

import { GoodsEntity } from './entities/goods.entity';
import { GoodsSpecEntity } from './entities/goods-spec.entity';
import { GoodsImageEntity } from './entities/goods-image.entity';
import { GoodsAttributeEntity } from './entities/goods-attribute.entity';

import { AdminGoodsController, PublicGoodsController } from './goods.controller';
import { GoodsService } from './goods.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoodsEntity,
      GoodsSpecEntity,
      GoodsImageEntity,
      GoodsAttributeEntity,
      CategoryEntity,
    ]),
  ],
  controllers: [AdminGoodsController, PublicGoodsController],
  providers: [GoodsService],
  exports: [GoodsService],
})
export class GoodsModule {}
