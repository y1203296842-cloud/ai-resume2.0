/**
 * BrowserSessionStore — 基于 localStorage 的会话存储
 *
 * 特点：
 * - SSR 安全（服务端渲染时返回 null）
 * - 自动保留 createdAt
 * - JSON 序列化/反序列化
 *
 * 未来接数据库时，实现一个 DatabaseSessionStore 替换此类即可。
 */

import type { SessionStore } from './SessionStore';
import type { SessionData } from './types';
import { SESSION_CONFIG } from '@/config/session';

export class BrowserSessionStore implements SessionStore {
  private storageKey: string;

  constructor(storageKey: string = SESSION_CONFIG.storageKey) {
    this.storageKey = storageKey;
  }

  load(): SessionData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as SessionData;
      if (!data.sessionId || !Array.isArray(data.messages)) return null;
      return data;
    } catch {
      return null;
    }
  }

  save(session: SessionData): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.load();
      const data: SessionData = {
        ...session,
        createdAt: existing?.createdAt ?? session.createdAt,
        updatedAt: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // localStorage 满或禁用，静默失败
    }
  }

  update(partial: Partial<SessionData>): void {
    const existing = this.load();
    if (!existing) return;
    this.save({ ...existing, ...partial });
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // 静默失败
    }
  }
}

/** 单例实例 */
export const sessionStore = new BrowserSessionStore();
