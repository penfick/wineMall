import { Injectable, Logger } from '@nestjs/common';

/**
 * 雪花 ID 生成器（简化版）
 * 64 位：1 符号 + 41 时间戳(ms) + 10 机器位 + 12 序列号
 * - 单进程内严格自增
 * - 多进程部署需为每个实例配置不同 workerId（v1 暂用环境变量 WORKER_ID，默认 1）
 *
 * 同时提供「订单号」生成器：YYYYMMDDHHmmss + 雪花尾 6 位（更友好可读）
 */
@Injectable()
export class IdGeneratorService {
  private readonly logger = new Logger(IdGeneratorService.name);
  private readonly epoch = 1704067200000n; // 2024-01-01 00:00:00 UTC
  private readonly workerIdBits = 10n;
  private readonly sequenceBits = 12n;
  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits); // 1023
  private readonly maxSequence = -1n ^ (-1n << this.sequenceBits); // 4095
  private readonly workerIdShift = this.sequenceBits;
  private readonly timestampShift = this.sequenceBits + this.workerIdBits;

  private readonly workerId: bigint;
  private sequence = 0n;
  private lastTimestamp = -1n;

  constructor() {
    const wid = BigInt(parseInt(process.env.WORKER_ID || '1', 10));
    if (wid < 0n || wid > this.maxWorkerId) {
      this.logger.warn(`WORKER_ID 越界，已重置为 1`);
      this.workerId = 1n;
    } else {
      this.workerId = wid;
    }
  }

  /** 生成雪花 ID（返回字符串，避免 JS Number 精度问题）*/
  nextId(): string {
    let now = BigInt(Date.now());
    if (now < this.lastTimestamp) {
      // 时钟回拨保护：等待
      now = this.lastTimestamp;
    }
    if (now === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        // 序列号用完，等到下一毫秒
        while (now <= this.lastTimestamp) now = BigInt(Date.now());
      }
    } else {
      this.sequence = 0n;
    }
    this.lastTimestamp = now;
    const id =
      ((now - this.epoch) << this.timestampShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence;
    return id.toString();
  }

  /**
   * 生成订单号（人类友好）
   * 格式：YYYYMMDDHHmmss + 6 位随机
   * 示例：20260422093045123456
   */
  nextOrderNo(): string {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const SS = String(d.getSeconds()).padStart(2, '0');
    const tail = this.nextId().slice(-6);
    return `${yy}${mm}${dd}${HH}${MM}${SS}${tail}`;
  }
}
