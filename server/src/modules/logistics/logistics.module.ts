import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderEntity } from '@modules/order/entities/order.entity';

import { LogisticsCompanyEntity } from './entities/logistics-company.entity';
import { LogisticsTrackEntity } from './entities/logistics-track.entity';
import {
  AdminLogisticsController,
  UserLogisticsController,
} from './logistics.controller';
import { LogisticsService } from './logistics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LogisticsCompanyEntity, LogisticsTrackEntity, OrderEntity]),
  ],
  controllers: [AdminLogisticsController, UserLogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
