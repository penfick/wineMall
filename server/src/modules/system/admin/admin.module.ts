import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminEntity } from '@modules/system/entities/admin.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { RoleEntity } from '@modules/system/entities/role.entity';
import { AuthModule } from '@modules/auth/auth.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminEntity, AdminRoleEntity, RoleEntity]),
    AuthModule, // 复用 AuthService.kickAdmin
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
