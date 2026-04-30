import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminEntity } from '@modules/system/entities/admin.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { RoleEntity } from '@modules/system/entities/role.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';
import { MenuEntity } from '@modules/system/entities/menu.entity';
import { LoginLogEntity } from '@modules/system/entities/login-log.entity';
import { UserEntity } from '@modules/user/entities/user.entity';

import { AuthService } from './auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { UserAuthController } from './user-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminEntity,
      AdminRoleEntity,
      RoleEntity,
      RoleMenuEntity,
      MenuEntity,
      LoginLogEntity,
      UserEntity,
    ]),
  ],
  controllers: [AdminAuthController, UserAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
