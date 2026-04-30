import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { FavoriteEntity } from './entities/favorite.entity';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FavoriteEntity,
      GoodsEntity,
      GoodsImageEntity,
      GoodsSpecEntity,
    ]),
  ],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
