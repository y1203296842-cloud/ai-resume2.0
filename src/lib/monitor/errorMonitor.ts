/**
 * Error Monitor - 错误监控系统
 * 
 * 记录所有AI输出处理过程中的错误
 * 支持未来扩展为email/webhook通知
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

import type { ResumeMode } from '../types';

// ============================================
// 类型定义
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorStage =
  | 'llm_response'
  | 'json_extraction'
  | 'json_normalization'
  | 'json_parsing'
  | 'schema_validation'
  | 'quality_check'
  | 'auto_enhancement'
  | 'ai_repair'
  | 'regeneration'
  | 'template_render'
  | 'export';

export type ErrorType =
  | 'json_parse_error'
  | 'json_truncated'
  | 'schema_mismatch'
  | 'quality_insufficient'
  | 'llm_timeout'
  | 'llm_empty_response'
  | 'template_error'
  | 'export_error'
  | 'input_too_long'
  | 'prompt_injection'
  | 'unknown';

export interface ErrorRecord {
  requestId: string;
  timestamp: number;
  mode: ResumeMode;
  targetPosition?: string;
  errorType: ErrorType;
  stage: ErrorStage;
  severity: ErrorSeverity;
  message: string;
  rawOutput?: string;
  fixAttempts: FixAttempt[];
  finalResult: 'success' | 'failed' | 'degraded';
  suggestions: string[];
}

export interface FixAttempt {
  stage: string;
  method: string;
  success: boolean;
  details?: string;
  timestamp: number;
}

// ============================================
// 错误记录存储（内存存储，未来可替换为数据库）
// ============================================

const MAX_RECORDS = 100;
const errorRecords: ErrorRecord[] = [];

// ============================================
// 核心API
// ============================================

/**
 * 创建错误记录
 */
export function createErrorRecord(params: {
  mode: ResumeMode;
  targetPosition?: string;
  errorType: ErrorType;
  stage: ErrorStage;
  severity: ErrorSeverity;
  message: string;
  rawOutput?: string;
}): ErrorRecord {
  const record: ErrorRecord = {
    requestId: generateRequestId(),
    timestamp: Date.now(),
    mode: params.mode,
    targetPosition: params.targetPosition,
    errorType: params.errorType,
    stage: params.stage,
    severity: params.severity,
    message: params.message,
    rawOutput: params.rawOutput?.substring(0, 2000), // 限制长度
    fixAttempts: [],
    finalResult: 'failed',
    suggestions: [],
  };

  // 存储记录
  errorRecords.unshift(record);
  if (errorRecords.length > MAX_RECORDS) {
    errorRecords.pop();
  }

  // 控制台输出
  console.error(`[Monitor] ${record.severity.toUpperCase()} | ${record.stage} | ${record.errorType}: ${record.message}`);

  return record;
}

/**
 * 添加修复尝试记录
 */
export function addFixAttempt(recordId: string, attempt: Omit<FixAttempt, 'timestamp'>): void {
  const record = errorRecords.find(r => r.requestId === recordId);
  if (record) {
    record.fixAttempts.push({ ...attempt, timestamp: Date.now() });
  }
}

/**
 * 更新最终结果
 */
export function updateFinalResult(
  requestId: string,
  result: 'success' | 'failed' | 'degraded',
  suggestions: string[] = []
): void {
  const record = errorRecords.find(r => r.requestId === requestId);
  if (record) {
    record.finalResult = result;
    record.suggestions = suggestions;
  }
}

/**
 * 获取最近的错误记录
 */
export function getRecentErrors(limit = 10): ErrorRecord[] {
  return errorRecords.slice(0, limit);
}

/**
 * 获取错误统计
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byType: Record<string, number>;
  byStage: Record<string, number>;
  fixSuccessRate: number;
} {
  const bySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byType: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  let totalFixAttempts = 0;
  let successfulFixes = 0;

  for (const record of errorRecords) {
    bySeverity[record.severity]++;
    byType[record.errorType] = (byType[record.errorType] || 0) + 1;
    byStage[record.stage] = (byStage[record.stage] || 0) + 1;
    
    for (const attempt of record.fixAttempts) {
      totalFixAttempts++;
      if (attempt.success) successfulFixes++;
    }
  }

  return {
    total: errorRecords.length,
    bySeverity,
    byType,
    byStage,
    fixSuccessRate: totalFixAttempts > 0 ? successfulFixes / totalFixAttempts : 1,
  };
}

/**
 * 生成错误报告
 */
export function generateErrorReport(recordId: string): string {
  const record = errorRecords.find(r => r.requestId === recordId);
  if (!record) return '未找到错误记录';

  const lines = [
    '═══════════════════════════════════════',
    '甘霖 AI Resume Agent 异常报告',
    '═══════════════════════════════════════',
    '',
    `请求ID: ${record.requestId}`,
    `时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}`,
    `用户模式: ${record.mode}`,
    `目标岗位: ${record.targetPosition || '未指定'}`,
    `错误类型: ${record.errorType}`,
    `发生阶段: ${record.stage}`,
    `严重程度: ${record.severity}`,
    `错误描述: ${record.message}`,
    '',
    '--- 原始输出 ---',
    record.rawOutput ? record.rawOutput.substring(0, 500) + '...' : '(无)',
    '',
    '--- 修复过程 ---',
  ];

  if (record.fixAttempts.length === 0) {
    lines.push('(未尝试修复)');
  } else {
    record.fixAttempts.forEach((attempt, i) => {
      lines.push(`${i + 1}. [${attempt.stage}] ${attempt.method}: ${attempt.success ? '成功' : '失败'}`);
      if (attempt.details) lines.push(`   ${attempt.details}`);
    });
  }

  lines.push('');
  lines.push(`--- 最终结果: ${record.finalResult} ---`);
  
  if (record.suggestions.length > 0) {
    lines.push('');
    lines.push('--- 建议优化方向 ---');
    record.suggestions.forEach(s => lines.push(`- ${s}`));
  }

  return lines.join('\n');
}

// ============================================
// 工具函数
// ============================================

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * 根据错误类型推断严重程度
 */
export function inferSeverity(errorType: ErrorType, stage: ErrorStage): ErrorSeverity {
  if (errorType === 'llm_timeout' || errorType === 'llm_empty_response') return 'high';
  if (errorType === 'json_truncated') return 'medium';
  if (errorType === 'quality_insufficient') return 'medium';
  if (stage === 'export') return 'high';
  if (stage === 'template_render') return 'high';
  return 'medium';
}
