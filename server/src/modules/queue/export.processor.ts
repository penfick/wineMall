import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

import { QueueName } from '@config/bull.config';

export interface ExportJob {
  type: 'order' | 'goods';
  /** 触发人 ID（管理员），结果文件可登记到 admin */
  operatorId: number;
  /** 查询条件（透传给业务层） */
  query: Record<string, any>;
}

/**
 * 导出大文件（>1000 行）异步处理：
 * 当前阶段仅落骨架，结果上传 MinIO 后写入 export_records 表（M11 时再做表）。
 * MVP 同步导出走 OrderService.exportCsv()，本队列预留后期切换。
 */
@Processor(QueueName.EXPORT)
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  @Process('order')
  async order(job: Job<ExportJob>) {
    this.logger.log(
      `[ExportJob#${job.id}] order export queued by admin=${job.data.operatorId} (skeleton)`,
    );
    return { ok: true, message: 'export skeleton' };
  }
}
