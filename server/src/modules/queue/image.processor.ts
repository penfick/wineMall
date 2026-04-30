import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import sharp from 'sharp';
import * as path from 'node:path';

import { MinioService } from '@shared/minio/minio.service';

import { QueueName } from '@config/bull.config';

export interface ImageThumbJob {
  /** 原图 objectName（minio 内路径，例如 goods/2026/04/uuid.jpg） */
  objectName: string;
  /** 需要生成的尺寸（缺省：thumb=200, medium=600） */
  sizes?: Array<{ name: 'thumb' | 'medium' | string; width: number }>;
  /** 输出格式（默认 webp） */
  format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_SIZES: NonNullable<ImageThumbJob['sizes']> = [
  { name: 'thumb', width: 200 },
  { name: 'medium', width: 600 },
];

@Processor(QueueName.IMAGE)
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(private readonly minio: MinioService) {}

  @Process('thumbnail')
  async thumbnail(job: Job<ImageThumbJob>) {
    const { objectName, sizes = DEFAULT_SIZES, format = 'webp' } = job.data;
    if (!objectName) return { skipped: true };
    if (!(await this.minio.exists(objectName))) {
      this.logger.warn(`原图不存在，跳过缩略图：${objectName}`);
      return { skipped: true };
    }

    const buffer = await this.minio.download(objectName);
    const outs: Array<{ name: string; objectName: string; url: string }> = [];

    for (const s of sizes) {
      const variantName = this.buildVariantName(objectName, s.name, format);
      let pipeline = sharp(buffer).resize({
        width: s.width,
        withoutEnlargement: true,
        fit: 'inside',
      });
      if (format === 'webp') pipeline = pipeline.webp({ quality: 80 });
      else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 82 });
      else if (format === 'png') pipeline = pipeline.png({ compressionLevel: 8 });
      const out = await pipeline.toBuffer();
      const contentType = `image/${format === 'jpeg' ? 'jpeg' : format}`;
      const url = await this.minio.upload(
        variantName,
        out,
        out.length,
        contentType,
      );
      outs.push({ name: s.name, objectName: variantName, url });
    }
    return { ok: true, variants: outs };
  }

  /** goods/2026/04/uuid.jpg → goods/2026/04/uuid.thumb.webp */
  private buildVariantName(
    objectName: string,
    variant: string,
    format: string,
  ): string {
    const dir = path.dirname(objectName);
    const ext = path.extname(objectName);
    const base = path.basename(objectName, ext);
    return `${dir}/${base}.${variant}.${format}`;
  }
}
