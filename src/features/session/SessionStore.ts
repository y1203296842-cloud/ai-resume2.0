/**
 * Session Store — 统一存储接口
 *
 * 当前实现：BrowserSessionStore（localStorage）
 * 未来替换：DatabaseSessionStore（服务端数据库）
 *
 * 业务代码只依赖此接口，不直接依赖 localStorage 或数据库 SDK。
 * 切换存储后端时只需实现此接口，无需修改业务逻辑。
 */

import type { SessionData } from './types';

export interface SessionStore {
  /** 加载会话，不存在返回 null */
  load(): SessionData | null;

  /** 保存或更新会话（createdAt 自动保留） */
  save(session: SessionData): void;

  /** 更新部分字段 */
  update(partial: Partial<SessionData>): void;

  /** 清除会话 */
  clear(): void;
}
