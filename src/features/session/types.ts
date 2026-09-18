/**
 * Session Feature — 类型定义
 *
 * 会话数据的结构化定义，不依赖任何具体存储实现。
 */

import type { ChatMessage, ResumeMode } from '@/lib/types';
import type { SessionStatus, InitStatus } from '@/config/session';

export interface SessionData {
  sessionId: string;
  messages: ChatMessage[];
  mode: ResumeMode;
  resumeText: string;
  status: SessionStatus;
  initStatus: InitStatus;
  createdAt: number;
  updatedAt: number;
}

/** 生成唯一 sessionId */
export function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 检查会话是否过期 */
export function isSessionExpired(session: SessionData, ttl: number): boolean {
  return Date.now() - session.updatedAt > ttl;
}
