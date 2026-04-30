import { Injectable } from '@nestjs/common';

import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/constants/error-code';
import { RedisService } from '@shared/redis/redis.service';

interface OverviewView {
  connected: boolean;
  dbSize: number;
  usedMemoryHuman: string;
  uptimeSeconds: number;
  redisVersion: string;
  totalConnections: number;
  totalCommands: number;
}

interface CacheKeyInfo {
  key: string;
  type: string;
  ttl: number;
  size: number | null;
}

/** 禁止全量清除的危险 pattern */
const DANGEROUS_PATTERNS = new Set(['*', '**', '?', '?*']);

/** 不允许通过缓存管理接口删除的 key 前缀（认证/锁/幂等等关键运行时数据）*/
const PROTECTED_PREFIXES = [
  'admin:token:',
  'user:token:',
  'admin:ability:',
  'admin:menu:',
  'login:fail:',
  'lock:',
  'idem:',
  'rate:',
];

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async overview(): Promise<OverviewView> {
    const connected = await this.redis.ping();
    const dbSize = await this.redis.dbsize().catch(() => 0);
    const info = connected ? await this.redis.info().catch(() => '') : '';
    const map = parseInfo(info);
    return {
      connected,
      dbSize,
      usedMemoryHuman: map['used_memory_human'] ?? '-',
      uptimeSeconds: Number(map['uptime_in_seconds'] ?? 0),
      redisVersion: map['redis_version'] ?? '-',
      totalConnections: Number(map['total_connections_received'] ?? 0),
      totalCommands: Number(map['total_commands_processed'] ?? 0),
    };
  }

  async listKeys(
    pattern: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: CacheKeyInfo[]; total: number; page: number; pageSize: number }> {
    const safe = pattern || '*';
    const all = await this.redis.scanKeys(safe);
    const start = (page - 1) * pageSize;
    const sliced = all.slice(start, start + pageSize);
    const list: CacheKeyInfo[] = await Promise.all(
      sliced.map(async (key) => {
        const [type, ttl] = await Promise.all([
          this.redis.raw.type(key).catch(() => 'unknown'),
          this.redis.ttl(key).catch(() => -2),
        ]);
        let size: number | null = null;
        if (type === 'string') size = (await this.redis.raw.strlen(key).catch(() => 0)) as number;
        else if (type === 'hash') size = await this.redis.raw.hlen(key).catch(() => 0);
        else if (type === 'list') size = await this.redis.raw.llen(key).catch(() => 0);
        else if (type === 'set') size = await this.redis.raw.scard(key).catch(() => 0);
        else if (type === 'zset') size = await this.redis.raw.zcard(key).catch(() => 0);
        return { key, type, ttl, size };
      }),
    );
    return { list, total: all.length, page, pageSize };
  }

  async getValue(key: string): Promise<{ key: string; type: string; ttl: number; value: any }> {
    const exists = await this.redis.exists(key);
    if (!exists) throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
    const type = (await this.redis.raw.type(key)) as string;
    const ttl = await this.redis.ttl(key);
    let value: any;
    if (type === 'string') {
      const raw = await this.redis.get(key);
      try {
        value = raw ? JSON.parse(raw) : null;
      } catch {
        value = raw;
      }
    } else if (type === 'hash') {
      value = await this.redis.hgetall(key);
    } else if (type === 'set') {
      value = await this.redis.smembers(key);
    } else if (type === 'list') {
      value = await this.redis.raw.lrange(key, 0, 99);
    } else if (type === 'zset') {
      value = await this.redis.raw.zrange(key, 0, 99, 'WITHSCORES');
    } else {
      value = null;
    }
    return { key, type, ttl, value };
  }

  async deleteKey(key: string): Promise<void> {
    this.assertNotProtected(key);
    await this.redis.del(key);
  }

  async clearByPattern(pattern: string, confirm: boolean): Promise<{ deleted: number }> {
    if (!confirm) {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '需要二次确认',
      );
    }
    if (DANGEROUS_PATTERNS.has(pattern.trim())) {
      throw new BusinessException(
        ErrorCode.OPERATION_NOT_ALLOWED,
        '禁止使用过宽 pattern；请使用具体的业务前缀',
      );
    }
    // 拒绝清除受保护前缀
    for (const p of PROTECTED_PREFIXES) {
      if (pattern.startsWith(p) || pattern === `${p}*`) {
        throw new BusinessException(
          ErrorCode.OPERATION_NOT_ALLOWED,
          `禁止清除受保护的 key 前缀: ${p}`,
        );
      }
    }
    const deleted = await this.redis.deleteByPattern(pattern);
    return { deleted };
  }

  private assertNotProtected(key: string) {
    for (const p of PROTECTED_PREFIXES) {
      if (key.startsWith(p)) {
        throw new BusinessException(
          ErrorCode.OPERATION_NOT_ALLOWED,
          `禁止删除受保护的 key: ${p}*`,
        );
      }
    }
  }
}

function parseInfo(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}
