import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartEntity } from '@modules/cart/entities/cart.entity';
import { OperationLogEntity } from '@modules/system/entities/operation-log.entity';
import { OrderModule } from '@modules/order/order.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';

import { TaskService } from './task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity, OperationLogEntity]),
    OrderModule,
    DashboardModule,
  ],
  providers: [TaskService],
})
export class TaskModule {}
