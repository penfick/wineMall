import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DictTypeEntity } from '@modules/system/entities/dict-type.entity';
import { DictItemEntity } from '@modules/system/entities/dict-item.entity';

import {
  AdminDictController,
  PublicDictController,
} from './dict.controller';
import { DictService } from './dict.service';

@Module({
  imports: [TypeOrmModule.forFeature([DictTypeEntity, DictItemEntity])],
  controllers: [AdminDictController, PublicDictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
