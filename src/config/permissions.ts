/**
 * 开源版 - 配置保留用于类型兼容，全角色全权限
 *
 * 本文件保留角色与权限相关类型结构，以兼容现有代码导入。
 * 所有角色拥有全部功能权限，无使用限制，无角色差异。
 * canAccessAdmin 保持 false（开源版无管理后台）。
 */

export type UserRole = 'admin' | 'vip' | 'user';

export interface UserPermission {
  role: UserRole;
  /** 每日免费使用次数 */
  dailyLimit: number;
  /** 是否可以使用高级模板 */
  canUsePremiumTemplates: boolean;
  /** 是否可以导出无水印版本 */
  canExportClean: boolean;
}

/**
 * 开源版角色权限配置表 - 所有角色拥有全部权限
 */
export const ROLE_PERMISSIONS: Record<UserRole, UserPermission> = {
  admin: {
    role: 'admin',
    dailyLimit: Infinity,
    canUsePremiumTemplates: true,
    canExportClean: true,
  },
  vip: {
    role: 'vip',
    dailyLimit: Infinity,
    canUsePremiumTemplates: true,
    canExportClean: true,
  },
  user: {
    role: 'user',
    dailyLimit: Infinity,
    canUsePremiumTemplates: true,
    canExportClean: true,
  },
};

/**
 * 获取用户权限（开源版所有用户均拥有全部权限）
 */
export function getUserPermissions(_userId?: string): UserPermission {
  return ROLE_PERMISSIONS.user;
}
