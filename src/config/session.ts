/**
 * 会话配置
 *
 * 所有会话相关的参数集中在此，业务代码只读取配置。
 * 未来接数据库时，TTL 可由服务端控制。
 */

export const SESSION_CONFIG = {
  /** localStorage 键名 */
  storageKey: 'ganlin_session',

  /** 会话过期时间（毫秒）— 3 天 */
  ttl: 3 * 24 * 60 * 60 * 1000,
} as const;

/** 会话状态 */
export type SessionStatus = 'collecting' | 'confirming' | 'generating' | 'completed' | 'error';

/** 初始化状态 — 用于幂等控制 */
export type InitStatus = 'idle' | 'loading' | 'success' | 'failed';
