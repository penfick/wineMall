import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../constants/permission';

export const PERMISSION_KEY = 'permission';

/**
 * 声明接口需要的按钮级权限
 * @example @CheckPermission('goods:create')
 *          @CheckPermission(['goods:update', 'goods:publish'])  // 满足任意一个
 */
export const CheckPermission = (...keys: (PermissionKey | string)[]) =>
  SetMetadata(PERMISSION_KEY, keys);
