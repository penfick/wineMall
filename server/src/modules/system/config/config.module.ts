import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysConfigEntity } from '@modules/system/entities/sys-config.entity';

import {
  AdminConfigController,
  PublicConfigController,
} from './config.controller';
import { SysConfigService } from './config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysConfigEntity])],
  controllers: [AdminConfigController, PublicConfigController],
  providers: [SysConfigService],
  exports: [SysConfigService],
})
export class SysConfigModule {}
