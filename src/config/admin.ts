/**
 * Admin Configuration
 * 
 * 管理员配置 - 错误通知、监控等
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 * 未来可替换为数据库配置
 */

// ============================================
// 通知配置
// ============================================

export interface AdminConfig {
  /** 错误通知方式 */
  notifications: {
    /** 邮箱通知 */
    email?: {
      enabled: boolean;
      recipients: string[];
      /** 只通知high/critical级别 */
      minSeverity: 'low' | 'medium' | 'high' | 'critical';
    };
    /** Webhook通知 */
    webhook?: {
      enabled: boolean;
      url: string;
      /** 通知模板 */
      template?: string;
    };
  };
  /** 质量阈值 */
  qualityThresholds: {
    /** 通过分数 */
    passScore: number;
    /** 优秀分数 */
    excellentScore: number;
  };
  /** 恢复策略 */
  recovery: {
    /** 最大恢复次数 */
    maxAttempts: number;
    /** 是否启用AI修复 */
    enableAiRepair: boolean;
    /** 是否启用重新生成 */
    enableRegeneration: boolean;
  };
  /** 输入限制 */
  inputLimits: {
    /** 单次输入最大字符数 */
    maxSingleInput: number;
    /** 总对话最大字符数 */
    maxTotalInput: number;
    /** 最大对话轮次 */
    maxConversationTurns: number;
  };
}

// ============================================
// 默认配置
// ============================================

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  notifications: {
    email: {
      enabled: false,
      recipients: [],
      minSeverity: 'high',
    },
    webhook: {
      enabled: false,
      url: '',
    },
  },
  qualityThresholds: {
    passScore: 85,
    excellentScore: 95,
  },
  recovery: {
    maxAttempts: 3,
    enableAiRepair: true,
    enableRegeneration: true,
  },
  inputLimits: {
    maxSingleInput: 5000,
    maxTotalInput: 30000,
    maxConversationTurns: 30,
  },
};

/**
 * 获取管理员配置
 * 未来可从环境变量/数据库读取
 */
export function getAdminConfig(): AdminConfig {
  // 未来可从环境变量读取
  // if (process.env.ADMIN_CONFIG) { ... }
  return DEFAULT_ADMIN_CONFIG;
}
