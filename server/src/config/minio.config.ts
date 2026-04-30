import { registerAs } from '@nestjs/config';

/**
 * MinIO 配置
 * 支持 endpoint 写完整 URL（含 scheme），如 http://172.20.200.51:9000
 * 或拆分 host + port + ssl
 *
 * 双 bucket：
 * - publicBucket: 默认上传目标，公开读，商品图/轮播/头像/富文本图
 * - privateBucket: 私密文件，签名 URL 访问，发票/导出 Excel 等
 */
export interface MinioAppConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  publicBucket: string;
  privateBucket: string;
  /** 外部访问基址，如 http://172.20.200.51:9000 或 https://cdn.example.com */
  publicUrl: string;
}

function parseEndpoint(raw: string): { host: string; port: number; ssl: boolean } {
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : u.protocol === 'https:' ? 443 : 80,
      ssl: u.protocol === 'https:',
    };
  }
  return { host: raw, port: 9000, ssl: false };
}

export default registerAs('minio', (): MinioAppConfig => {
  const rawEndpoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
  const parsed = parseEndpoint(rawEndpoint);
  const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : parsed.port;
  const useSSL =
    process.env.MINIO_USE_SSL !== undefined ? process.env.MINIO_USE_SSL === 'true' : parsed.ssl;

  // 默认 publicUrl：拼当前 endpoint
  const defaultPublicUrl = `${useSSL ? 'https' : 'http'}://${parsed.host}:${port}`;

  return {
    endPoint: parsed.host,
    port,
    useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    publicBucket: process.env.MINIO_PUBLIC_BUCKET || process.env.MINIO_BUCKET || 'public',
    privateBucket: process.env.MINIO_PRIVATE_BUCKET || 'filedata',
    publicUrl: process.env.MINIO_PUBLIC_URL || defaultPublicUrl,
  };
});
