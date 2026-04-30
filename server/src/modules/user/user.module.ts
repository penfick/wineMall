import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { AddressEntity } from '@modules/address/entities/address.entity';
import { OrderEntity } from '@modules/order/entities/order.entity';
import { UserService } from './user.service';
import { AdminUserController } from './admin-user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AddressEntity, OrderEntity])],
  controllers: [AdminUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
