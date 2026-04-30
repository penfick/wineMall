import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsEntity } from '@modules/goods/entities/goods.entity';

import { CategoryEntity } from './entities/category.entity';
import {
  AdminCategoryController,
  PublicCategoryController,
} from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, GoodsEntity])],
  controllers: [AdminCategoryController, PublicCategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
