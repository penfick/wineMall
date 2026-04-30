import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryEntity } from '@modules/category/entities/category.entity';
import { GoodsAttributeEntity } from '@modules/goods/entities/goods-attribute.entity';

import { CategoryAttributeEntity } from './entities/category-attribute.entity';
import { AdminCategoryAttrController } from './category-attr.controller';
import { CategoryAttrService } from './category-attr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryAttributeEntity,
      CategoryEntity,
      GoodsAttributeEntity,
    ]),
  ],
  controllers: [AdminCategoryAttrController],
  providers: [CategoryAttrService],
  exports: [CategoryAttrService],
})
export class CategoryAttrModule {}
