/**
 * AI Output Gateway - 统一AI输出处理网关
 * 
 * 所有LLM输出必须经过此层处理
 * 禁止前端直接解析LLM原始输出
 * 
 * 处理流程：
 * 1. 输出类型判断（对话文本 / 简历JSON / 混合）
 * 2. 内容清洗（去Markdown、去说明文字）
 * 3. JSON结构恢复（标准化、修复）
 * 4. Schema标准化（字段补全、类型转换）
 * 5. 数据质量检测（5维度评分）
 * 6. 自动修复（三阶段恢复）
 * 7. 最终输出
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 * 唯一依赖：createLLMStream (用于AI修复阶段)
 */

import type { ResumeData, ResumeMode } from '../types';
import { normalizeJson } from '../jsonProcessor/jsonNormalizer';
import { extractJsonFromText } from '../jsonProcessor/jsonSanitizer';
import { validateAndNormalize } from '../schema';
import { checkResumeQuality, type QualityCheckResult } from '../resumeQuality/resumeQualityChecker';
import { analyzeAndEnhance, type EnhancementPlan } from '../resumeGeneration/autoEnhancement';
import {
  createErrorRecord,
  addFixAttempt,
  updateFinalResult,
  type ErrorRecord,
} from '../monitor';

// ============================================
// 类型定义
// ============================================

export type OutputType = 'conversation' | 'resume_json' | 'mixed' | 'unknown';

export interface GatewayInput {
  /** LLM原始输出文本 */
  rawText: string;
  /** 用户模式 */
  mode: ResumeMode;
  /** 目标岗位 */
  targetPosition?: string;
  /** 是否期望生成简历（用于类型判断辅助） */
  expectResume?: boolean;
}

export interface GatewayOutput {
  /** 输出类型 */
  type: OutputType;
  /** 对话文本（如果有） */
  conversationText?: string;
  /** 简历数据（如果有） */
  resumeData?: ResumeData;
  /** 质量检测结果（如果有简历数据） */
  qualityResult?: QualityCheckResult;
  /** 补强计划（如果质量不足） */
  enhancementPlan?: EnhancementPlan;
  /** 处理是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 处理过程中使用的修复方法 */
  fixesApplied: string[];
  /** 是否经过了修复 */
  wasRepaired: boolean;
  /** 是否被截断 */
  wasTruncated: boolean;
  /** 错误记录ID（如果有错误） */
  errorRecordId?: string;
}

export interface RecoveryOptions {
  /** 是否启用AI修复（Stage 2） */
  enableAiRepair?: boolean;
  /** AI修复回调函数（由调用方提供，避免直接依赖LLM） */
  aiRepairFn?: (brokenJson: string) => Promise<string | null>;
  /** 是否启用重新生成（Stage 3） */
  enableRegeneration?: boolean;
  /** 重新生成回调函数 */
  regenerationFn?: () => Promise<string | null>;
  /** 最大恢复次数 */
  maxRecoveryAttempts?: number;
}

// ============================================
// 常量
// ============================================

const QUALITY_PASS_THRESHOLD = 85;
const MAX_RECOVERY_ATTEMPTS = 3;

// ============================================
// 核心API
// ============================================

/**
 * AI输出网关 - 统一处理入口
 * 
 * 所有LLM输出必须经过此函数处理
 */
export async function processAIOutput(
  input: GatewayInput,
  options: RecoveryOptions = {}
): Promise<GatewayOutput> {
  const fixesApplied: string[] = [];
  let wasRepaired = false;
  let wasTruncated = false;

  // Step 1: 输出类型判断
  const outputType = detectOutputType(input.rawText, input.expectResume);

  // 如果是纯对话文本，直接返回
  if (outputType === 'conversation') {
    return {
      type: 'conversation',
      conversationText: input.rawText,
      success: true,
      fixesApplied: [],
      wasRepaired: false,
      wasTruncated: false,
    };
  }

  // Step 2: 提取JSON
  const rawJson = extractJsonFromText(input.rawText);
  if (!rawJson) {
    // 有[GENERATE_RESUME]标记但提取不到JSON
    if (input.rawText.includes('[GENERATE_RESUME]')) {
      const errorRecord = createErrorRecord({
        mode: input.mode,
        targetPosition: input.targetPosition,
        errorType: 'json_parse_error',
        stage: 'json_extraction',
        severity: 'high',
        message: '检测到生成标记但无法提取JSON',
        rawOutput: input.rawText,
      });

      // 尝试三阶段恢复
      const recoveryResult = await attemptRecovery(input, options, errorRecord);
      if (recoveryResult.success) {
        return recoveryResult;
      }

      return {
        type: 'resume_json',
        success: false,
        error: '无法从AI输出中提取简历数据',
        fixesApplied,
        wasRepaired,
        wasTruncated,
        errorRecordId: errorRecord.requestId,
      };
    }

    // 没有生成标记，当作对话处理
    return {
      type: 'conversation',
      conversationText: input.rawText,
      success: true,
      fixesApplied: [],
      wasRepaired: false,
      wasTruncated: false,
    };
  }

  // Step 3: JSON标准化（使用jsonNormalizer）
  const normalizeResult = normalizeJson(rawJson);
  fixesApplied.push(...normalizeResult.fixes);
  wasTruncated = normalizeResult.truncated;

  if (normalizeResult.fixes.length > 0) {
    wasRepaired = true;
  }

  if (!normalizeResult.success || !normalizeResult.data) {
    const errorRecord = createErrorRecord({
      mode: input.mode,
      targetPosition: input.targetPosition,
      errorType: normalizeResult.fixes.some(f => f.includes('截断')) ? 'json_truncated' : 'json_parse_error',
      stage: 'json_normalization',
      severity: 'high',
      message: `JSON标准化失败: ${normalizeResult.fixes.join('; ')}`,
      rawOutput: rawJson,
    });

    // 尝试三阶段恢复
    const recoveryResult = await attemptRecovery(input, options, errorRecord);
    if (recoveryResult.success) {
      return recoveryResult;
    }

    return {
      type: 'resume_json',
      success: false,
      error: `JSON处理失败: ${normalizeResult.fixes.join('; ')}`,
      fixesApplied,
      wasRepaired: true,
      wasTruncated,
      errorRecordId: errorRecord.requestId,
    };
  }

  // Step 4: Schema标准化
  const schemaResult = validateAndNormalize(normalizeResult.data);
  fixesApplied.push(...schemaResult.warnings);

  if (!schemaResult.normalized) {
    const errorRecord = createErrorRecord({
      mode: input.mode,
      targetPosition: input.targetPosition,
      errorType: 'schema_mismatch',
      stage: 'schema_validation',
      severity: 'high',
      message: `Schema验证失败: ${schemaResult.errors.join('; ')}`,
      rawOutput: rawJson,
    });

    return {
      type: 'resume_json',
      success: false,
      error: `Schema验证失败: ${schemaResult.errors.join('; ')}`,
      fixesApplied,
      wasRepaired,
      wasTruncated,
      errorRecordId: errorRecord.requestId,
    };
  }

  const resumeData = schemaResult.normalized;

  // Step 5: 质量检测
  const qualityResult = checkResumeQuality(resumeData, {
    targetPosition: input.targetPosition,
  });

  // Step 6: 质量不足时自动补强
  let enhancementPlan: EnhancementPlan | undefined;
  if (qualityResult.score < QUALITY_PASS_THRESHOLD) {
    enhancementPlan = analyzeAndEnhance(resumeData, qualityResult, input.targetPosition);
    
    // 使用补强后的数据（如果补强有效）
    if (enhancementPlan.enhancedData) {
      const enhancedQuality = checkResumeQuality(enhancementPlan.enhancedData, {
        targetPosition: input.targetPosition,
      });
      
      // 如果补强后质量提升，使用补强后的数据
      if (enhancedQuality.score > qualityResult.score) {
        Object.assign(resumeData, enhancementPlan.enhancedData);
        fixesApplied.push(`自动补强: 质量从${qualityResult.score}分提升到${enhancedQuality.score}分`);
        wasRepaired = true;
      }
    }
  }

  // 提取对话文本（JSON前面的部分）
  const markerIndex = input.rawText.indexOf('[GENERATE_RESUME]');
  const conversationText = markerIndex > 0 ? input.rawText.substring(0, markerIndex).trim() : undefined;

  // 记录成功
  if (wasRepaired) {
    const errorRecord = createErrorRecord({
      mode: input.mode,
      targetPosition: input.targetPosition,
      errorType: 'json_parse_error',
      stage: 'json_normalization',
      severity: 'low',
      message: 'JSON需要修复但最终成功',
      rawOutput: rawJson,
    });
    updateFinalResult(errorRecord.requestId, 'success', fixesApplied);
  }

  return {
    type: 'resume_json',
    conversationText,
    resumeData,
    qualityResult,
    enhancementPlan,
    success: true,
    fixesApplied,
    wasRepaired,
    wasTruncated,
  };
}

// ============================================
// 输出类型判断
// ============================================

function detectOutputType(text: string, expectResume?: boolean): OutputType {
  const hasGenerateMarker = text.includes('[GENERATE_RESUME]');
  const hasJsonLike = /\{[\s\S]*"[\w]+"[\s\S]*:[\s\S]*\}/.test(text);
  const hasBraces = text.includes('{') && text.includes('}');

  if (hasGenerateMarker) {
    return 'resume_json';
  }

  if (expectResume && hasJsonLike) {
    return 'resume_json';
  }

  if (hasJsonLike && hasBraces) {
    return 'mixed';
  }

  return 'conversation';
}

// ============================================
// 三阶段自动恢复
// ============================================

async function attemptRecovery(
  input: GatewayInput,
  options: RecoveryOptions,
  errorRecord: ErrorRecord
): Promise<GatewayOutput> {
  const _maxAttempts = options.maxRecoveryAttempts || MAX_RECOVERY_ATTEMPTS;
  const fixesApplied: string[] = [];

  // Stage 1: 代码层修复（已在normalizeJson中完成）
  addFixAttempt(errorRecord.requestId, {
    stage: 'Stage 1',
    method: '代码层JSON清洗与修复',
    success: false, // 如果走到这里说明Stage 1已经失败
    details: '标准化修复未能解决问题',
  });

  // Stage 2: AI修复
  if (options.enableAiRepair && options.aiRepairFn) {
    addFixAttempt(errorRecord.requestId, {
      stage: 'Stage 2',
      method: 'AI修复 - 请求模型修复JSON结构',
      success: false,
    });

    try {
      const rawJson = extractJsonFromText(input.rawText) || input.rawText;
      const repairedText = await options.aiRepairFn(rawJson);
      
      if (repairedText) {
        const normalizeResult = normalizeJson(repairedText);
        if (normalizeResult.success && normalizeResult.data) {
          const schemaResult = validateAndNormalize(normalizeResult.data);
          if (schemaResult.normalized) {
            addFixAttempt(errorRecord.requestId, {
              stage: 'Stage 2',
              method: 'AI修复',
              success: true,
              details: 'AI成功修复JSON结构',
            });
            updateFinalResult(errorRecord.requestId, 'success', ['AI修复成功']);

            const qualityResult = checkResumeQuality(schemaResult.normalized, {
              targetPosition: input.targetPosition,
            });

            return {
              type: 'resume_json',
              resumeData: schemaResult.normalized,
              qualityResult,
              success: true,
              fixesApplied: [...fixesApplied, 'AI修复(JSON结构恢复)'],
              wasRepaired: true,
              wasTruncated: false,
            };
          }
        }
      }
    } catch (e) {
      addFixAttempt(errorRecord.requestId, {
        stage: 'Stage 2',
        method: 'AI修复',
        success: false,
        details: `AI修复异常: ${(e as Error).message}`,
      });
    }
  }

  // Stage 3: 重新生成
  if (options.enableRegeneration && options.regenerationFn) {
    addFixAttempt(errorRecord.requestId, {
      stage: 'Stage 3',
      method: '重新生成 - 请求模型重新输出',
      success: false,
    });

    try {
      const newText = await options.regenerationFn();
      if (newText) {
        // 递归处理新输出（但限制递归深度）
        const newResult = await processAIOutput(
          { ...input, rawText: newText },
          { ...options, enableRegeneration: false, enableAiRepair: false }
        );
        
        if (newResult.success) {
          addFixAttempt(errorRecord.requestId, {
            stage: 'Stage 3',
            method: '重新生成',
            success: true,
            details: '重新生成成功',
          });
          updateFinalResult(errorRecord.requestId, 'success', ['重新生成成功']);
          return {
            ...newResult,
            fixesApplied: [...fixesApplied, ...newResult.fixesApplied, '重新生成'],
            wasRepaired: true,
          };
        }
      }
    } catch (e) {
      addFixAttempt(errorRecord.requestId, {
        stage: 'Stage 3',
        method: '重新生成',
        success: false,
        details: `重新生成异常: ${(e as Error).message}`,
      });
    }
  }

  // 所有恢复阶段都失败
  updateFinalResult(errorRecord.requestId, 'failed', [
    '建议用户重新提供信息',
    '检查LLM输出质量',
    '考虑调整Prompt',
  ]);

  return {
    type: 'resume_json',
    success: false,
    error: '三阶段恢复均失败',
    fixesApplied,
    wasRepaired: true,
    wasTruncated: false,
    errorRecordId: errorRecord.requestId,
  };
}

// ============================================
// 便捷函数
// ============================================

/**
 * 快速处理简历JSON（不含AI修复）
 * 适用于前端直接调用
 */
export function processResumeJsonSync(rawText: string): GatewayOutput {
  const fixesApplied: string[] = [];

  // 提取JSON
  const rawJson = extractJsonFromText(rawText);
  if (!rawJson) {
    return {
      type: rawText.includes('[GENERATE_RESUME]') ? 'resume_json' : 'conversation',
      conversationText: rawText.includes('[GENERATE_RESUME]') ? undefined : rawText,
      success: false,
      error: '无法提取JSON',
      fixesApplied: [],
      wasRepaired: false,
      wasTruncated: false,
    };
  }

  // 标准化
  const normalizeResult = normalizeJson(rawJson);
  fixesApplied.push(...normalizeResult.fixes);

  if (!normalizeResult.success || !normalizeResult.data) {
    return {
      type: 'resume_json',
      success: false,
      error: `JSON标准化失败: ${normalizeResult.fixes.join('; ')}`,
      fixesApplied,
      wasRepaired: normalizeResult.fixes.length > 0,
      wasTruncated: normalizeResult.truncated,
    };
  }

  // Schema标准化
  const schemaResult = validateAndNormalize(normalizeResult.data);
  if (!schemaResult.normalized) {
    return {
      type: 'resume_json',
      success: false,
      error: `Schema验证失败: ${schemaResult.errors.join('; ')}`,
      fixesApplied: [...fixesApplied, ...schemaResult.warnings],
      wasRepaired: true,
      wasTruncated: normalizeResult.truncated,
    };
  }

  return {
    type: 'resume_json',
    resumeData: schemaResult.normalized,
    success: true,
    fixesApplied: [...fixesApplied, ...schemaResult.warnings],
    wasRepaired: fixesApplied.length > 0,
    wasTruncated: normalizeResult.truncated,
  };
}
