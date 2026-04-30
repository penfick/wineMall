import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { QueueName } from '@config/bull.config';
import { ImageProcessor } from './image.processor';
import { ExportProcessor } from './export.processor';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.IMAGE },
      { name: QueueName.EXPORT },
    ),
  ],
  providers: [ImageProcessor, ExportProcessor, QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
