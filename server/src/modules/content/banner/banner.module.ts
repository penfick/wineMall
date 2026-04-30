import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BannerEntity } from '../entities/banner.entity';
import {
  AdminBannerController,
  PublicBannerController,
} from './banner.controller';
import { BannerService } from './banner.service';

@Module({
  imports: [TypeOrmModule.forFeature([BannerEntity])],
  controllers: [AdminBannerController, PublicBannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
