import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RegionEntity } from './entities/region.entity';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegionEntity])],
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {}
