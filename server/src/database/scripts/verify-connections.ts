/**
 * 验证 MySQL / Redis / MinIO 连通性 + 列出关键状态
 * 用法：npm run verify:local
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createConnection } from 'mysql2/promise';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';

const envFile = process.env.DOTENV_FILE || '.env';
const envPath = join(process.cwd(), envFile);
if (existsSync(envPath)) loadEnv({ path: envPath });
else loadEnv();

function tag(ok: boolean) {
  return ok ? '[OK]  ' : '[FAIL]';
}

async function checkMysql(): Promise<boolean> {
  try {
    const conn = await createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    const [rows] = (await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?`,
      [process.env.DB_NAME],
    )) as any;
    console.log(
      `${tag(true)} MySQL ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME} - 当前表数=${rows[0].cnt}`,
    );
    await conn.end();
    return true;
  } catch (e: any) {
    console.log(`${tag(false)} MySQL ${process.env.DB_HOST}:${process.env.DB_PORT} - ${e.message}`);
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  const mode = (process.env.REDIS_MODE || 'single').toLowerCase();
  try {
    if (mode === 'cluster') {
      const nodes = (process.env.REDIS_CLUSTER_NODES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [host, port] = s.split(':');
          return { host, port: parseInt(port, 10) };
        });
      const cluster = new Redis.Cluster(nodes, {
        redisOptions: {
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 3,
        },
      });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 8000);
        cluster.once('ready', () => {
          clearTimeout(t);
          resolve();
        });
        cluster.once('error', (e) => {
          clearTimeout(t);
          reject(e);
        });
      });
      const pong = await cluster.ping();
      const masters = cluster.nodes('master').length;
      const slaves = cluster.nodes('slave').length;
      console.log(
        `${tag(true)} Redis Cluster - ${nodes.length} nodes input, masters=${masters}, slaves=${slaves}, ping=${pong}`,
      );
      // 写读测试
      const k = '__winemall_verify__';
      await cluster.set(k, '1', 'EX', 10);
      const v = await cluster.get(k);
      await cluster.del(k);
      console.log(`        rw test: set/get/del ok (got=${v})`);
      cluster.disconnect();
      return true;
    } else {
      const r = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: 3,
        connectTimeout: 8000,
      });
      const pong = await r.ping();
      console.log(
        `${tag(true)} Redis single ${process.env.REDIS_HOST}:${process.env.REDIS_PORT} - ping=${pong}`,
      );
      r.disconnect();
      return true;
    }
  } catch (e: any) {
    console.log(`${tag(false)} Redis (${mode}) - ${e.message}`);
    return false;
  }
}

async function checkMinio(): Promise<boolean> {
  try {
    const raw = process.env.MINIO_ENDPOINT || '127.0.0.1';
    let host = raw;
    let port = parseInt(process.env.MINIO_PORT || '9000', 10);
    let useSSL = process.env.MINIO_USE_SSL === 'true';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      host = u.hostname;
      port = u.port ? parseInt(u.port, 10) : u.protocol === 'https:' ? 443 : 80;
      useSSL = u.protocol === 'https:';
    }
    const client = new MinioClient({
      endPoint: host,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
    const pubBucket = process.env.MINIO_PUBLIC_BUCKET || 'public';
    const priBucket = process.env.MINIO_PRIVATE_BUCKET || 'filedata';
    const pubOk = await client.bucketExists(pubBucket);
    const priOk = await client.bucketExists(priBucket);
    console.log(
      `${tag(pubOk && priOk)} MinIO ${host}:${port} - public[${pubBucket}]=${pubOk}, private[${priBucket}]=${priOk}`,
    );
    return pubOk && priOk;
  } catch (e: any) {
    console.log(`${tag(false)} MinIO - ${e.message}`);
    return false;
  }
}

(async () => {
  console.log(`\n=== 验证连接（env=${envFile}）===\n`);
  const a = await checkMysql();
  const b = await checkRedis();
  const c = await checkMinio();
  console.log(`\n=== 结果：MySQL=${a} Redis=${b} MinIO=${c} ===\n`);
  process.exit(a && b && c ? 0 : 1);
})();
