import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

const SALT_ROUNDS = 10;

export const HashUtil = {
  /** bcrypt 加密密码 */
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  },

  /** bcrypt 校验密码 */
  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  },

  /** MD5 哈希（用于非密码场景，如缓存 key 计算）*/
  md5(text: string): string {
    return createHash('md5').update(text).digest('hex');
  },

  /** SHA256 哈希 */
  sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  },

  /** 对象稳定 JSON（保证 key 顺序）+ md5，用于缓存 key */
  stableHash(obj: any): string {
    const sorted = JSON.stringify(obj, Object.keys(obj || {}).sort());
    return this.md5(sorted);
  },
};
