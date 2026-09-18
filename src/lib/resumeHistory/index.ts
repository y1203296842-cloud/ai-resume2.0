/**
 * 简历历史管理模块
 * 保存用户的简历历史记录
 * 
 * 迁移说明：
 * - 未来可迁移到数据库
 * - 支持用户查看和管理历史简历
 */

import type { ResumeData } from '@/lib/types';

// ============================================================================
// 类型定义
// ============================================================================

/** 简历历史记录 */
export interface ResumeHistoryItem {
  id: string;
  userId: string;
  title: string;                // 简历标题
  targetPosition?: string;      // 目标岗位
  mode: 'optimize' | 'apply' | 'explore';  // 生成模式
  templateId: string;           // 使用的模板
  resumeData: ResumeData;       // 简历数据
  qualityScore?: number;        // 质量评分
  conversationSummary?: string; // 对话摘要
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;          // 是否收藏
}

/** 修改记录 */
export interface ModificationRecord {
  id: string;
  resumeId: string;
  userId: string;
  timestamp: number;
  type: 'create' | 'update' | 'template_change' | 'content_edit';
  description: string;
  beforeData?: Partial<ResumeData>;
  afterData?: Partial<ResumeData>;
}

// ============================================================================
// 简历历史管理器
// ============================================================================

class ResumeHistoryManager {
  private history: ResumeHistoryItem[] = [];
  private modifications: ModificationRecord[] = [];
  private maxHistoryPerUser = 50;  // 每用户最多保留50份简历

  /**
   * 保存简历
   */
  save(params: {
    userId: string;
    title: string;
    targetPosition?: string;
    mode: 'optimize' | 'apply' | 'explore';
    templateId: string;
    resumeData: ResumeData;
    qualityScore?: number;
    conversationSummary?: string;
  }): ResumeHistoryItem {
    const now = Date.now();
    const item: ResumeHistoryItem = {
      id: this.generateId(),
      userId: params.userId,
      title: params.title,
      targetPosition: params.targetPosition,
      mode: params.mode,
      templateId: params.templateId,
      resumeData: params.resumeData,
      qualityScore: params.qualityScore,
      conversationSummary: params.conversationSummary,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };

    this.history.push(item);

    // 记录创建操作
    this.recordModification({
      resumeId: item.id,
      userId: params.userId,
      type: 'create',
      description: '创建简历',
      afterData: params.resumeData,
    });

    // 限制每用户历史数量
    this.limitUserHistory(params.userId);

    return item;
  }

  /**
   * 更新简历
   */
  update(resumeId: string, updates: Partial<ResumeHistoryItem>): ResumeHistoryItem | null {
    const index = this.history.findIndex(h => h.id === resumeId);
    if (index === -1) return null;

    const beforeData = { ...this.history[index].resumeData };
    this.history[index] = {
      ...this.history[index],
      ...updates,
      updatedAt: Date.now(),
    };

    // 记录修改操作
    if (updates.resumeData) {
      this.recordModification({
        resumeId,
        userId: this.history[index].userId,
        type: 'update',
        description: '更新简历内容',
        beforeData,
        afterData: updates.resumeData,
      });
    }

    return this.history[index];
  }

  /**
   * 获取用户历史列表
   */
  getUserHistory(userId: string): ResumeHistoryItem[] {
    return this.history
      .filter(h => h.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 获取单个简历
   */
  getResume(resumeId: string): ResumeHistoryItem | null {
    return this.history.find(h => h.id === resumeId) || null;
  }

  /**
   * 删除简历
   */
  delete(resumeId: string): boolean {
    const index = this.history.findIndex(h => h.id === resumeId);
    if (index === -1) return false;

    this.history.splice(index, 1);
    return true;
  }

  /**
   * 收藏/取消收藏
   */
  toggleFavorite(resumeId: string): boolean {
    const item = this.history.find(h => h.id === resumeId);
    if (!item) return false;

    item.isFavorite = !item.isFavorite;
    item.updatedAt = Date.now();
    return true;
  }

  /**
   * 获取收藏列表
   */
  getFavorites(userId: string): ResumeHistoryItem[] {
    return this.history
      .filter(h => h.userId === userId && h.isFavorite)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 获取修改记录
   */
  getModifications(resumeId: string): ModificationRecord[] {
    return this.modifications
      .filter(m => m.resumeId === resumeId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 搜索简历
   */
  search(userId: string, query: string): ResumeHistoryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.history
      .filter(h => {
        if (h.userId !== userId) return false;
        if (h.title.toLowerCase().includes(lowerQuery)) return true;
        if (h.targetPosition?.toLowerCase().includes(lowerQuery)) return true;
        if (h.resumeData.personalInfo.name.toLowerCase().includes(lowerQuery)) return true;
        return false;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 获取统计信息
   */
  getStats(userId: string): {
    totalResumes: number;
    favoriteCount: number;
    avgQualityScore: number;
    lastCreatedAt: number;
  } {
    const userHistory = this.getUserHistory(userId);
    const scores = userHistory
      .filter(h => h.qualityScore !== undefined)
      .map(h => h.qualityScore as number);

    return {
      totalResumes: userHistory.length,
      favoriteCount: userHistory.filter(h => h.isFavorite).length,
      avgQualityScore: scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0,
      lastCreatedAt: userHistory.length > 0 ? userHistory[0].createdAt : 0,
    };
  }

  /**
   * 记录修改操作
   */
  private recordModification(params: {
    resumeId: string;
    userId: string;
    type: ModificationRecord['type'];
    description: string;
    beforeData?: Partial<ResumeData>;
    afterData?: Partial<ResumeData>;
  }): void {
    const record: ModificationRecord = {
      id: this.generateId(),
      resumeId: params.resumeId,
      userId: params.userId,
      timestamp: Date.now(),
      type: params.type,
      description: params.description,
      beforeData: params.beforeData,
      afterData: params.afterData,
    };

    this.modifications.push(record);
  }

  /**
   * 限制每用户历史数量
   */
  private limitUserHistory(userId: string): void {
    const userHistory = this.history
      .filter(h => h.userId === userId)
      .sort((a, b) => a.updatedAt - b.updatedAt);

    if (userHistory.length > this.maxHistoryPerUser) {
      const toRemove = userHistory.slice(0, userHistory.length - this.maxHistoryPerUser);
      for (const item of toRemove) {
        if (!item.isFavorite) {  // 不删除收藏的
          const index = this.history.findIndex(h => h.id === item.id);
          if (index !== -1) {
            this.history.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const resumeHistoryManager = new ResumeHistoryManager();

// 导出类型
export type { ResumeHistoryManager };
