import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([GoodsEntity, GoodsSpecEntity, GoodsImageEntity])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
