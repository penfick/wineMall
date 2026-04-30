import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NoticeEntity } from '../entities/notice.entity';
import {
  AdminNoticeController,
  PublicNoticeController,
} from './notice.controller';
import { NoticeService } from './notice.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoticeEntity])],
  controllers: [AdminNoticeController, PublicNoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
