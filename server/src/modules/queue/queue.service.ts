import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { QueueName } from '@config/bull.config';
import type { ImageThumbJob } from './image.processor';
import type { ExportJob } from './export.processor';

/** 业务方注入此 Service 投递任务，避免直接耦合 BullModule API */
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QueueName.IMAGE) private readonly imageQueue: Queue,
    @InjectQueue(QueueName.EXPORT) private readonly exportQueue: Queue,
  ) {}

  enqueueThumbnail(data: ImageThumbJob) {
    return this.imageQueue.add('thumbnail', data, { jobId: data.objectName });
  }

  enqueueOrderExport(data: ExportJob) {
    return this.exportQueue.add('order', data);
  }
}
