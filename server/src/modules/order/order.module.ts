import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';
import { GoodsSpecEntity } from '@modules/goods/entities/goods-spec.entity';
import { GoodsImageEntity } from '@modules/goods/entities/goods-image.entity';
import { LogisticsCompanyEntity } from '@modules/logistics/entities/logistics-company.entity';
import { UserEntity } from '@modules/user/entities/user.entity';

import { AddressModule } from '@modules/address/address.module';
import { CartModule } from '@modules/cart/cart.module';
import { FreightModule } from '@modules/freight/freight.module';
import { LogisticsModule } from '@modules/logistics/logistics.module';
import { StockModule } from '@modules/system/stock/stock.module';

import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderLogEntity } from './entities/order-log.entity';
import { AdminOrderController, UserOrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      OrderLogEntity,
      GoodsEntity,
      GoodsSpecEntity,
      GoodsImageEntity,
      LogisticsCompanyEntity,
      UserEntity,
    ]),
    AddressModule,
    CartModule,
    FreightModule,
    LogisticsModule,
    StockModule,
  ],
  controllers: [UserOrderController, AdminOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
