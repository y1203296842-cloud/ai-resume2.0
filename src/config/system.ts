/**
 * 系统配置中心（开源版）
 * 管理系统级别的配置，支持后台修改
 *
 * 迁移说明：
 * - 未来可迁移到数据库
 * - 管理员后台可直接修改这些配置
 */

// ============================================================================
// 系统基础配置
// ============================================================================

export interface SystemConfig {
  /** 系统名称 */
  name: string;
  /** 系统版本 */
  version: string;
  /** 系统描述 */
  description: string;
  /** 联系邮箱 */
  contactEmail: string;
  /** 是否维护模式 */
  maintenanceMode: boolean;
  /** 维护提示消息 */
  maintenanceMessage: string;
}

/** 用户可见的品牌名称 */
export const BRAND_NAME = '果核AI';

export const SYSTEM_CONFIG: SystemConfig = {
  name: '果核AI - 开源版',
  version: '1.0.0',
  description: '开源免费的 AI 简历制作工具',
  contactEmail: '',
  maintenanceMode: false,
  maintenanceMessage: '系统维护中，请稍后再试',
};

// ============================================================================
// LLM 模型配置
// ============================================================================

/** 模型层级 */
export type ModelTier = 'basic' | 'standard' | 'premium';

/** 模型配置 */
export interface ModelConfig {
  id: string;
  name: string;
  tier: ModelTier;
  description: string;
  inputPricePer1K: number;    // 每1K输入token价格（元）
  outputPricePer1K: number;   // 每1K输出token价格（元）
  maxTokens: number;          // 最大token数
  temperature: number;        // 默认温度
}

/** 模型列表 */
export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  basic: {
    id: 'doubao-seed-2-0-lite-260215',
    name: '基础模型',
    tier: 'basic',
    description: '适合简单任务，成本低',
    inputPricePer1K: 0.0003,
    outputPricePer1K: 0.0006,
    maxTokens: 4096,
    temperature: 0.7,
  },
  standard: {
    id: 'doubao-seed-2-0-lite-260215',
    name: '标准模型',
    tier: 'standard',
    description: '平衡性能和成本',
    inputPricePer1K: 0.0003,
    outputPricePer1K: 0.0006,
    maxTokens: 8192,
    temperature: 0.7,
  },
  premium: {
    id: 'doubao-seed-2-0-lite-260215',
    name: '高级模型',
    tier: 'premium',
    description: '用于最终简历生成，质量最高',
    inputPricePer1K: 0.0003,
    outputPricePer1K: 0.0006,
    maxTokens: 16384,
    temperature: 0.5,
  },
};

// ============================================================================
// 任务类型与模型映射
// ============================================================================

/** 任务类型 */
export type TaskType = 
  | 'chat'                  // 普通对话
  | 'career_analysis'       // 职业分析
  | 'resume_optimize'       // 简历优化
  | 'resume_generate'       // 简历生成
  | 'quality_check'         // 质量检测
  | 'json_repair';          // JSON修复

/** 任务配置 */
export interface TaskConfig {
  type: TaskType;
  name: string;
  modelTier: ModelTier;     // 使用的模型层级
  maxRounds: number;        // 最大轮次（开源版 - 不限制轮次）
  timeoutMs: number;        // 超时时间（毫秒）
  retryCount: number;       // 重试次数
}

/** 任务配置列表 */
export const TASK_CONFIGS: Record<TaskType, TaskConfig> = {
  chat: {
    type: 'chat',
    name: '普通对话',
    modelTier: 'basic',
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 30000,
    retryCount: 2,
  },
  career_analysis: {
    type: 'career_analysis',
    name: '职业分析',
    modelTier: 'standard',
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 60000,
    retryCount: 2,
  },
  resume_optimize: {
    type: 'resume_optimize',
    name: '简历优化',
    modelTier: 'standard',
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 60000,
    retryCount: 3,
  },
  resume_generate: {
    type: 'resume_generate',
    name: '简历生成',
    modelTier: 'premium',     // 最终生成使用高级模型
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 90000,
    retryCount: 3,
  },
  quality_check: {
    type: 'quality_check',
    name: '质量检测',
    modelTier: 'standard',
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 30000,
    retryCount: 2,
  },
  json_repair: {
    type: 'json_repair',
    name: 'JSON修复',
    modelTier: 'basic',
    maxRounds: Infinity,    // 开源版 - 不限制轮次
    timeoutMs: 30000,
    retryCount: 3,
  },
};

// ============================================================================
// 质量检测配置
// ============================================================================

export interface QualityConfig {
  /** 通过阈值（总分100） */
  passThreshold: number;
  /** 自动修正最大轮次 */
  maxAutoFixRounds: number;
  /** 各维度权重 */
  weights: {
    jobMatch: number;         // 岗位匹配度
    contentRichness: number;  // 内容丰满度
    experienceDepth: number;  // 经历深度
    skillCoverage: number;    // 技能覆盖
    basicInfo: number;        // 基础信息
  };
}

export const QUALITY_CONFIG: QualityConfig = {
  passThreshold: 90,          // 90分以上通过
  maxAutoFixRounds: 3,        // 最多自动修正3轮
  weights: {
    jobMatch: 30,
    contentRichness: 25,
    experienceDepth: 20,
    skillCoverage: 15,
    basicInfo: 10,
  },
};

// ============================================================================
// 输入限制配置
// ============================================================================

export interface InputLimits {
  /** 单次输入最大字数 */
  maxInputLength: number;
  /** 文件上传最大大小（MB） */
  maxFileSize: number;
  /** 支持的文件类型 */
  allowedFileTypes: string[];
}

export const INPUT_LIMITS: InputLimits = {
  maxInputLength: 5000,
  maxFileSize: 10,
  allowedFileTypes: ['.pdf', '.docx', '.doc', '.txt', '.md'],
};

// ============================================================================
// 缓存配置
// ============================================================================

export interface CacheConfig {
  /** 知识库缓存时间（毫秒） */
  knowledgeCacheTTL: number;
  /** Prompt缓存时间（毫秒） */
  promptCacheTTL: number;
  /** 用户会话缓存时间（毫秒） */
  sessionCacheTTL: number;
}

export const CACHE_CONFIG: CacheConfig = {
  knowledgeCacheTTL: 3600000,     // 1小时
  promptCacheTTL: 1800000,        // 30分钟
  sessionCacheTTL: 86400000,      // 24小时
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取任务对应的模型配置
 */
export function getModelForTask(taskType: TaskType): ModelConfig {
  const taskConfig = TASK_CONFIGS[taskType];
  return MODEL_CONFIGS[taskConfig.modelTier];
}

/**
 * 计算预估成本
 */
export function estimateCost(
  taskType: TaskType,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelForTask(taskType);
  const inputCost = (inputTokens / 1000) * model.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * model.outputPricePer1K;
  return inputCost + outputCost;
}

/**
 * 检查是否超过输入限制
 */
export function checkInputLimit(input: string): { valid: boolean; error?: string } {
  if (input.length > INPUT_LIMITS.maxInputLength) {
    return {
      valid: false,
      error: `输入内容过长，最多 ${INPUT_LIMITS.maxInputLength} 字`,
    };
  }
  return { valid: true };
}
