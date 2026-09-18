/**
 * Feedback Service — 反馈服务接口
 *
 * 当前实现：LocalFeedbackStore（localStorage 暂存）
 * 未来迁移：替换为 DatabaseFeedbackStore / AdminFeedbackStore，业务 UI 不改。
 *
 * 迁移步骤：
 * 1. 实现 FeedbackStore 接口的新 Store（如 DatabaseFeedbackStore）
 * 2. 替换下方 feedbackStore 的实例化
 * 3. UI 层零修改
 */

export type FeedbackStatus = 'pending' | 'processing' | 'resolved';

export interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  contact?: string;
  createdAt: string;
  userAgent?: string;
  /** 反馈来源页面，如 '/'、'/result'、'/interview' */
  page?: string;
  /** 功能入口标识，如 'landing'、'result'、'interview_optimize' */
  featureId?: string;
  /** 反馈来源，如 'web'、'mobile'、'admin' */
  source?: string;
  /** 处理状态 */
  status: FeedbackStatus;
  /** 用户/会话标识（如果当前存在） */
  sessionId?: string;
}

export interface FeedbackStore {
  createFeedback(feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): Promise<FeedbackItem>;
  getFeedbackList(): Promise<FeedbackItem[]>;
  getFeedbackById(id: string): Promise<FeedbackItem | null>;
  updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem | null>;
  /** @deprecated 使用 createFeedback 代替 */
  save(feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): Promise<FeedbackItem>;
  /** @deprecated 使用 getFeedbackList 代替 */
  getAll(): Promise<FeedbackItem[]>;
}

const STORAGE_KEY = 'ganlin_feedback';

class LocalFeedbackStore implements FeedbackStore {
  async createFeedback(feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): Promise<FeedbackItem> {
    const item: FeedbackItem = {
      ...feedback,
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      status: 'pending',
    };

    if (typeof window === 'undefined') return item;

    try {
      const existing = this.getAllSync();
      existing.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // localStorage 满或不可用时静默失败
    }

    return item;
  }

  async getFeedbackList(): Promise<FeedbackItem[]> {
    return this.getAllSync();
  }

  async getFeedbackById(id: string): Promise<FeedbackItem | null> {
    const items = this.getAllSync();
    return items.find((item) => item.id === id) ?? null;
  }

  async updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<FeedbackItem | null> {
    if (typeof window === 'undefined') return null;

    try {
      const items = this.getAllSync();
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return null;

      items[idx].status = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return items[idx];
    } catch {
      return null;
    }
  }

  async save(feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): Promise<FeedbackItem> {
    return this.createFeedback(feedback);
  }

  async getAll(): Promise<FeedbackItem[]> {
    return this.getFeedbackList();
  }

  private getAllSync(): FeedbackItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const feedbackStore: FeedbackStore = new LocalFeedbackStore();
