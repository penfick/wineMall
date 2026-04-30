import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';
import { v4 as uuid } from 'uuid';
import type { RedisAppConfig } from '@/config/redis.config';

type RedisLike = Redis | Cluster;

/**
 * Redis 单例 + 常用工具方法
 * - 业务代码使用此 service，不直接 new Redis
 * - 提供 SET/GET/DEL/Hash/分布式锁封装
 * - 支持单点 / Cluster 两种模式（通过 config 切换）
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisLike;
  private isCluster = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const cfg = this.config.get<RedisAppConfig>('redis');
    if (!cfg) throw new Error('Redis config 未加载');

    if (cfg.mode === 'cluster') {
      this.isCluster = true;
      this.client = new Redis.Cluster(cfg.clusterNodes!, cfg.clusterOptions);
      this.logger.log(
        `Redis Cluster init with ${cfg.clusterNodes!.length} nodes: ${cfg
          .clusterNodes!.map((n: any) => `${n.host}:${n.port}`)
          .join(',')}`,
      );
    } else {
      this.client = new Redis(cfg.single!);
      this.logger.log(`Redis single init: ${cfg.single!.host}:${cfg.single!.port}`);
    }
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error: ' + err.message));
  }

  async onModuleDestroy() {
    await (this.client as any)?.quit?.();
  }

  /** 获取原生 client，需要更高级操作时使用 */
  get raw(): RedisLike {
    return this.client;
  }

  /** 是否 cluster 模式 */
  get cluster(): boolean {
    return this.isCluster;
  }

  // ==================== 字符串 ====================

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }

  /** 设置值，ttl 单位秒；不传 ttl 则永久 */
  async set(key: string, value: string | number, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, String(value), 'EX', ttl);
    } else {
      await this.client.set(key, String(value));
    }
  }

  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    // Cluster 下多个 key 可能 hash 到不同 slot，需要逐个删
    if (this.isCluster && keys.length > 1) {
      let deleted = 0;
      for (const k of keys) {
        deleted += await this.client.del(k);
      }
      return deleted;
    }
    return this.client.del(...keys);
  }

  /** 续期 */
  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async incrby(key: string, by: number): Promise<number> {
    return this.client.incrby(key, by);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async decrby(key: string, by: number): Promise<number> {
    return this.client.decrby(key, by);
  }

  // ==================== Hash ====================

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hset(key: string, field: string, value: string | number): Promise<void> {
    await this.client.hset(key, field, String(value));
  }

  async hmset(key: string, data: Record<string, string | number>): Promise<void> {
    await this.client.hset(
      key,
      Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    );
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hincrby(key: string, field: string, by: number): Promise<number> {
    return this.client.hincrby(key, field, by);
  }

  async hkeys(key: string): Promise<string[]> {
    return this.client.hkeys(key);
  }

  async hlen(key: string): Promise<number> {
    return this.client.hlen(key);
  }

  // ==================== 集合 ====================

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  // ==================== 模式删除（SCAN，避免 KEYS 阻塞）====================

  /** 拿到所有 master 节点（cluster 用）；单点直接返回 client */
  private getScanTargets(): RedisLike[] {
    if (this.isCluster) {
      return (this.client as Cluster).nodes('master');
    }
    return [this.client];
  }

  async deleteByPattern(pattern: string, batch = 200): Promise<number> {
    let deleted = 0;
    for (const node of this.getScanTargets()) {
      let cursor = '0';
      do {
        const [next, keys] = await (node as any).scan(cursor, 'MATCH', pattern, 'COUNT', batch);
        cursor = next;
        if (keys.length > 0) {
          // cluster 下跨 slot 不能批量 del，逐个删
          if (this.isCluster) {
            for (const k of keys) {
              deleted += await this.client.del(k);
            }
          } else {
            deleted += await this.client.del(...keys);
          }
        }
      } while (cursor !== '0');
    }
    return deleted;
  }

  /** 扫描匹配 pattern 的 key（不删除）*/
  async scanKeys(pattern: string, batch = 200): Promise<string[]> {
    const result: string[] = [];
    for (const node of this.getScanTargets()) {
      let cursor = '0';
      do {
        const [next, keys] = await (node as any).scan(cursor, 'MATCH', pattern, 'COUNT', batch);
        cursor = next;
        result.push(...keys);
      } while (cursor !== '0');
    }
    return result;
  }

  // ==================== 分布式锁 ====================

  /**
   * 加锁
   * @param key 锁 key（建议用 cache-key.ts 的 lock 函数）
   * @param ttl 自动释放时间（秒），防止持锁方崩溃永远不释放
   * @returns lockToken（解锁时校验，避免误删他人持有的锁）；null 表示加锁失败
   */
  async tryLock(key: string, ttl = 30): Promise<string | null> {
    const token = uuid();
    const ok = await this.client.set(key, token, 'EX', ttl, 'NX');
    return ok === 'OK' ? token : null;
  }

  /** 解锁（用 Lua 保证原子）*/
  async unlock(key: string, token: string): Promise<boolean> {
    const lua = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
    const r = (await this.client.eval(lua, 1, key, token)) as number;
    return r === 1;
  }

  /**
   * 包装函数：自动加锁/解锁/失败抛错
   */
  async withLock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const token = await this.tryLock(key, ttl);
    if (!token) {
      throw new Error(`获取分布式锁失败: ${key}`);
    }
    try {
      return await fn();
    } finally {
      await this.unlock(key, token);
    }
  }

  // ==================== 简易脚本执行 ====================

  /** 直接 eval Lua（库存扣减等场景用）*/
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }

  // ==================== 健康检查 ====================

  async ping(): Promise<boolean> {
    try {
      const r = await this.client.ping();
      return r === 'PONG';
    } catch {
      return false;
    }
  }

  /** Redis 信息（用于缓存管理页面）*/
  async info(section?: string): Promise<string> {
    return section ? this.client.info(section) : this.client.info();
  }

  async dbsize(): Promise<number> {
    if (this.isCluster) {
      const nodes = (this.client as Cluster).nodes('master');
      const sizes = await Promise.all(nodes.map((n) => n.dbsize()));
      return sizes.reduce((a, b) => a + b, 0);
    }
    return (this.client as Redis).dbsize();
  }
}
