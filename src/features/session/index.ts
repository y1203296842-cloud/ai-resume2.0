/**
 * Session Feature — 模块入口
 *
 * 使用方式：
 *   import { useSession, sessionStore, type SessionData } from '@/features/session';
 */

export { useSession } from './useSession';
export { sessionStore, BrowserSessionStore } from './BrowserSessionStore';
export type { SessionStore } from './SessionStore';
export type { SessionData } from './types';
export { generateSessionId, isSessionExpired } from './types';
