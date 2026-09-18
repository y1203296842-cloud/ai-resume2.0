/**
 * Token 成本监控模块
 * 记录每次 LLM 调用的 token 消耗和成本
 * 
 * 迁移说明：
 * - 未来可迁移到数据库
 * - 支持导出报表
 */

import { TaskType, getModelForTask, estimateCost } from '@/config/system';

// ============================================================================
// 类型定义
// ============================================================================

/** 成本记录 */
export interface CostRecord {
  id: string;
  userId: string;
  taskId: string;
  taskType: TaskType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;               // 成本（元）
  timestamp: number;
  duration: number;           // 耗时（毫秒）
  success: boolean;
  errorMessage?: string;
}

/** 成本统计 */
export interface CostStats {
  totalRecords: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  averageCostPerRequest: number;
  byTaskType: Record<TaskType, {
    count: number;
    cost: number;
    tokens: number;
  }>;
}

/** 用户成本统计 */
export interface UserCostStats {
  userId: string;
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  lastRequestTime: number;
}

// ============================================================================
// 成本监控器
// ============================================================================

class CostMonitor {
  private records: CostRecord[] = [];
  private maxRecords = 10000;   // 最多保留10000条记录

  /**
   * 记录成本
   */
  record(params: {
    userId: string;
    taskId: string;
    taskType: TaskType;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
  }): CostRecord {
    const model = getModelForTask(params.taskType);
    const cost = estimateCost(params.taskType, params.inputTokens, params.outputTokens);

    const record: CostRecord = {
      id: this.generateId(),
      userId: params.userId,
      taskId: params.taskId,
      taskType: params.taskType,
      modelId: model.id,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      cost,
      timestamp: Date.now(),
      duration: params.duration,
      success: params.success,
      errorMessage: params.errorMessage,
    };

    this.records.push(record);

    // 限制记录数量
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    return record;
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): CostRecord[] {
    return [...this.records];
  }

  /**
   * 获取用户记录
   */
  getUserRecords(userId: string): CostRecord[] {
    return this.records.filter(r => r.userId === userId);
  }

  /**
   * 获取最近记录
   */
  getRecentRecords(limit: number = 100): CostRecord[] {
    return this.records.slice(-limit).reverse();
  }

  /**
   * 获取总体统计
   */
  getStats(): CostStats {
    const stats: CostStats = {
      totalRecords: this.records.length,
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      averageCostPerRequest: 0,
      byTaskType: {
        chat: { count: 0, cost: 0, tokens: 0 },
        career_analysis: { count: 0, cost: 0, tokens: 0 },
        resume_optimize: { count: 0, cost: 0, tokens: 0 },
        resume_generate: { count: 0, cost: 0, tokens: 0 },
        quality_check: { count: 0, cost: 0, tokens: 0 },
        json_repair: { count: 0, cost: 0, tokens: 0 },
      },
    };

    for (const record of this.records) {
      stats.totalCost += record.cost;
      stats.totalInputTokens += record.inputTokens;
      stats.totalOutputTokens += record.outputTokens;
      stats.totalTokens += record.totalTokens;

      const taskStats = stats.byTaskType[record.taskType];
      taskStats.count++;
      taskStats.cost += record.cost;
      taskStats.tokens += record.totalTokens;
    }

    stats.averageCostPerRequest = stats.totalRecords > 0
      ? stats.totalCost / stats.totalRecords
      : 0;

    return stats;
  }

  /**
   * 获取用户统计
   */
  getUserStats(userId: string): UserCostStats {
    const userRecords = this.getUserRecords(userId);
    
    let totalCost = 0;
    let totalTokens = 0;
    let lastRequestTime = 0;

    for (const record of userRecords) {
      totalCost += record.cost;
      totalTokens += record.totalTokens;
      if (record.timestamp > lastRequestTime) {
        lastRequestTime = record.timestamp;
      }
    }

    return {
      userId,
      totalCost,
      totalRequests: userRecords.length,
      totalTokens,
      lastRequestTime,
    };
  }

  /**
   * 按日期统计
   */
  getStatsByDate(days: number = 7): { date: string; cost: number; requests: number }[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const result: { date: string; cost: number; requests: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;
      const date = new Date(dayEnd).toISOString().split('T')[0];

      const dayRecords = this.records.filter(
        r => r.timestamp >= dayStart && r.timestamp < dayEnd
      );

      result.push({
        date,
        cost: dayRecords.reduce((sum, r) => sum + r.cost, 0),
        requests: dayRecords.length,
      });
    }

    return result;
  }

  /**
   * 清空记录（测试用）
   */
  clear(): void {
    this.records = [];
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const costMonitor = new CostMonitor();

// 导出类型
export type { CostMonitor };
