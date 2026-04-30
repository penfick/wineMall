import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MenuEntity } from '@modules/system/entities/menu.entity';
import { RoleMenuEntity } from '@modules/system/entities/role-menu.entity';

import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, RoleMenuEntity])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
