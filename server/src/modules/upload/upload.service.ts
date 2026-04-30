import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as path from 'node:path';

import { ErrorCode } from '@common/constants/error-code';
import { BusinessException } from '@common/exceptions/business.exception';
import { CacheKey, CacheTTL } from '@common/constants/cache-key';
import { MinioService } from '@shared/minio/minio.service';
import { RedisService } from '@shared/redis/redis.service';
import { QueueService } from '@modules/queue/queue.service';

const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
];

const ALLOWED_DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface UploadResult {
  url: string;
  objectName: string;
  size: number;
  width?: number;
  height?: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly maxImageMb: number;

  constructor(
    private readonly minio: MinioService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
  ) {
    this.maxImageMb = this.config.get<number>('app.uploadMaxSizeMb') || 5;
  }

  /** 上传单张图片 */
  async uploadImage(file: MulterFile, prefix = 'common'): Promise<UploadResult> {
    if (!file) throw new BusinessException(ErrorCode.PARAM_INVALID, '请选择文件');
    this.assertImage(file);

    const ext = this.getExt(file.originalname);
    let buffer = file.buffer;
    let width: number | undefined;
    let height: number | undefined;

    // 用 sharp 读取尺寸；超过 2000px 自动等比缩到 2000，并尽量转 webp
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
      if ((meta.width || 0) > 2000 || (meta.height || 0) > 2000) {
        buffer = await sharp(buffer)
          .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .toBuffer();
        const meta2 = await sharp(buffer).metadata();
        width = meta2.width;
        height = meta2.height;
      }
    } catch (err) {
      this.logger.warn('sharp 处理失败，原图直传：' + (err as Error).message);
    }

    const objectName = this.minio.generateObjectName(prefix, ext);
    const url = await this.minio.upload(objectName, buffer, buffer.length, file.mimetype);

    // 临时登记，给清理任务用（编辑器/未提交场景；正式入库后会被「商品/banner」业务清掉登记）
    await this.redis.set(
      CacheKey.uploadTemp(objectName),
      String(Date.now()),
      CacheTTL.IDEMPOTENT * 2 * 60, // 1h
    );

    // 异步生成缩略图（不阻塞主流程；失败有 3 次重试）
    this.queue.enqueueThumbnail({ objectName }).catch((err) => {
      this.logger.warn('投递缩略图任务失败：' + (err as Error).message);
    });

    return { url, objectName, size: buffer.length, width, height };
  }

  /** 批量上传图片 */
  async uploadImages(files: MulterFile[], prefix = 'common'): Promise<UploadResult[]> {
    if (!files?.length) throw new BusinessException(ErrorCode.PARAM_INVALID, '请选择文件');
    if (files.length > 9) {
      throw new BusinessException(ErrorCode.PARAM_INVALID, '单次最多上传 9 张图片');
    }
    return Promise.all(files.map((f) => this.uploadImage(f, prefix)));
  }

  /** 上传文档（订单导出回放、富文本附件） */
  async uploadDoc(file: MulterFile, prefix = 'doc'): Promise<UploadResult> {
    if (!file) throw new BusinessException(ErrorCode.PARAM_INVALID, '请选择文件');
    const ext = this.getExt(file.originalname);
    if (
      !ALLOWED_DOC_EXTS.includes(ext) ||
      !ALLOWED_DOC_MIMES.includes(file.mimetype)
    ) {
      throw new BusinessException(ErrorCode.FILE_TYPE_INVALID);
    }
    const maxBytes = this.maxImageMb * 4 * 1024 * 1024; // 文档上限放大到 4 倍
    if (file.size > maxBytes) {
      throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
    }

    const objectName = this.minio.generateObjectName(prefix, ext);
    const url = await this.minio.upload(objectName, file.buffer, file.size, file.mimetype);
    return { url, objectName, size: file.size };
  }

  /** 删除（B 端或业务回收时调用） */
  async remove(objectName: string) {
    await this.minio.remove(objectName);
    await this.redis.del(CacheKey.uploadTemp(objectName));
    return { ok: true };
  }

  /** 标记某个临时文件已被业务认领（不再清理） */
  async markUsed(objectNames: string[]) {
    if (!objectNames?.length) return { ok: true };
    const keys = objectNames.map((n) => CacheKey.uploadTemp(n));
    await this.redis.del(...keys);
    return { ok: true };
  }

  // ==================== 工具 ====================

  private assertImage(file: MulterFile) {
    const ext = this.getExt(file.originalname);
    if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
      throw new BusinessException(ErrorCode.FILE_TYPE_INVALID, `不支持的图片格式：${ext}`);
    }
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BusinessException(ErrorCode.FILE_TYPE_INVALID, `不支持的 MIME：${file.mimetype}`);
    }
    const maxBytes = this.maxImageMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BusinessException(
        ErrorCode.FILE_TOO_LARGE,
        `图片大小不能超过 ${this.maxImageMb}MB`,
      );
    }
  }

  private getExt(filename: string): string {
    return path.extname(filename || '').replace(/^\./, '').toLowerCase();
  }
}
