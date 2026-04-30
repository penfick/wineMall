import { registerAs } from '@nestjs/config';
import type { RedisOptions, ClusterOptions, ClusterNode } from 'ioredis';

export type RedisMode = 'single' | 'cluster';

export interface RedisAppConfig {
  mode: RedisMode;
  /** 单点配置 */
  single?: RedisOptions;
  /** 集群节点 */
  clusterNodes?: ClusterNode[];
  /** 集群选项 */
  clusterOptions?: ClusterOptions;
}

/**
 * Redis 配置
 * 单点：REDIS_HOST + REDIS_PORT + REDIS_PASSWORD + REDIS_DB
 * 集群：REDIS_MODE=cluster + REDIS_CLUSTER_NODES=host1:port1,host2:port2,...
 */
export default registerAs('redis', (): RedisAppConfig => {
  const mode = (process.env.REDIS_MODE || 'single').toLowerCase() as RedisMode;

  if (mode === 'cluster') {
    const raw = process.env.REDIS_CLUSTER_NODES || '';
    const nodes: ClusterNode[] = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [host, port] = s.split(':');
        return { host, port: parseInt(port, 10) };
      });
    if (!nodes.length) {
      throw new Error('REDIS_MODE=cluster 但 REDIS_CLUSTER_NODES 为空');
    }
    return {
      mode,
      clusterNodes: nodes,
      clusterOptions: {
        scaleReads: 'slave',
        redisOptions: {
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 3,
        },
        clusterRetryStrategy: (times) => Math.min(times * 200, 3000),
      },
    };
  }

  return {
    mode,
    single: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: '',
      retryStrategy: (times) => Math.min(times * 200, 3000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    },
  };
});
