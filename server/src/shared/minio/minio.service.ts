import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import type { MinioAppConfig } from '@/config/minio.config';

export type BucketKind = 'public' | 'private';

/**
 * MinIO 服务（S3 兼容的对象存储）
 * - 双 bucket：public（默认，公开读）+ private（签名 URL 访问）
 * - 启动时**仅校验** bucket 存在，不再自动创建/改 policy（生产环境的 bucket 由运维管控）
 * - 提供上传 / 删除 / 生成预签名 URL 的能力
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: MinioClient;
  private publicBucket!: string;
  private privateBucket!: string;
  private publicUrl!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const opts = this.config.get<MinioAppConfig>('minio')!;
    this.publicBucket = opts.publicBucket;
    this.privateBucket = opts.privateBucket;
    this.publicUrl = opts.publicUrl.replace(/\/$/, '');
    this.client = new MinioClient({
      endPoint: opts.endPoint,
      port: opts.port,
      useSSL: opts.useSSL,
      accessKey: opts.accessKey,
      secretKey: opts.secretKey,
    });
    await this.checkBuckets();
  }

  private async checkBuckets() {
    for (const [kind, bucket] of [
      ['public', this.publicBucket],
      ['private', this.privateBucket],
    ] as const) {
      try {
        const ok = await this.client.bucketExists(bucket);
        if (ok) {
          this.logger.log(`MinIO ${kind} bucket OK: ${bucket}`);
        } else {
          this.logger.warn(`MinIO ${kind} bucket 不存在: ${bucket}（请联系运维创建）`);
        }
      } catch (e: any) {
        this.logger.warn(`MinIO ${kind} bucket 检查失败: ${e.message}`);
      }
    }
  }

  private bucketOf(kind: BucketKind): string {
    return kind === 'private' ? this.privateBucket : this.publicBucket;
  }

  /**
   * 生成对象名（按业务分目录）
   * @example generateObjectName('goods', 'jpg') → 'goods/2026/04/uuid.jpg'
   */
  generateObjectName(prefix: string, ext: string): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const id = randomUUID().replace(/-/g, '');
    const safeExt = ext.replace(/^\./, '').toLowerCase() || 'bin';
    return `${prefix}/${yyyy}/${mm}/${id}.${safeExt}`;
  }

  /**
   * 上传 Buffer 或 Stream
   * @returns public bucket 返回完整 URL；private bucket 返回 objectName（用 presignedGetUrl 取下载链接）
   */
  async upload(
    objectName: string,
    data: Buffer | Readable,
    size: number,
    contentType = 'application/octet-stream',
    kind: BucketKind = 'public',
  ): Promise<string> {
    const bucket = this.bucketOf(kind);
    await this.client.putObject(bucket, objectName, data, size, {
      'Content-Type': contentType,
    });
    return kind === 'public' ? this.getPublicUrl(objectName) : objectName;
  }

  /**
   * 上传文件（自动生成 objectName）
   * @param prefix 业务前缀，如 'goods' / 'avatar' / 'banner' / 'editor'
   */
  async uploadFile(
    prefix: string,
    fileBuffer: Buffer,
    originalName: string,
    contentType?: string,
    kind: BucketKind = 'public',
  ): Promise<{ url: string; objectName: string; bucket: string }> {
    const ext = path.extname(originalName);
    const objectName = this.generateObjectName(prefix, ext);
    const url = await this.upload(objectName, fileBuffer, fileBuffer.length, contentType, kind);
    return { url, objectName, bucket: this.bucketOf(kind) };
  }

  async remove(objectName: string, kind: BucketKind = 'public'): Promise<void> {
    await this.client.removeObject(this.bucketOf(kind), objectName);
  }

  async removeMany(objectNames: string[], kind: BucketKind = 'public'): Promise<void> {
    if (objectNames.length === 0) return;
    await this.client.removeObjects(this.bucketOf(kind), objectNames);
  }

  /** 私有桶预签名下载 URL */
  async presignedGetUrl(
    objectName: string,
    expiresSec = 3600,
    kind: BucketKind = 'private',
  ): Promise<string> {
    return this.client.presignedGetObject(this.bucketOf(kind), objectName, expiresSec);
  }

  /** 下载对象为 Buffer（队列任务里读原图用） */
  async download(objectName: string, kind: BucketKind = 'public'): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketOf(kind), objectName);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /** 检查对象是否存在 */
  async exists(objectName: string, kind: BucketKind = 'public'): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketOf(kind), objectName);
      return true;
    } catch {
      return false;
    }
  }

  /** 拼接公开 URL */
  getPublicUrl(objectName: string): string {
    return `${this.publicUrl}/${this.publicBucket}/${objectName}`;
  }

  /** 从完整 URL 还原 objectName（删除时用）*/
  parseObjectName(url: string): string | null {
    const prefix = `${this.publicUrl}/${this.publicBucket}/`;
    if (url.startsWith(prefix)) return url.substring(prefix.length);
    return null;
  }

  async healthy(): Promise<boolean> {
    try {
      return await this.client.bucketExists(this.publicBucket);
    } catch {
      return false;
    }
  }
}
