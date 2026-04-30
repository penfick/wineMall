import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from '@modules/system/entities/role.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';
import { AdminRoleEntity } from '@modules/system/entities/admin-role.entity';
import { MenuEntity } from '@modules/system/entities/menu.entity';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, RoleMenuEntity, AdminRoleEntity, MenuEntity]),
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
