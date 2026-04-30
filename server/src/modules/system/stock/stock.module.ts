import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';

import { StockLogEntity } from './entities/stock-log.entity';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockLogEntity, GoodsEntity, GoodsSpecEntity]),
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
