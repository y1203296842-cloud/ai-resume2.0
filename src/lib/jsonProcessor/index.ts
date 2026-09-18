/**
 * JSON Processor Module
 * 
 * 模型输出JSON处理层
 * 提供清洗、修复、验证、标准化的完整链路
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

export {
  sanitizeJsonString,
  safeJsonParse,
  isValidJson,
  extractJsonFromText,
  validateResumeJsonSchema,
} from './jsonSanitizer';

export {
  repairJson,
  repairAndParseJson,
} from './repairJson';

export {
  normalizeJson,
  type NormalizeResult,
} from './jsonNormalizer';

/**
 * 完整的JSON处理链路
 * sanitize → parse → validate
 * 
 * 返回解析后的对象和可能的错误信息
 */
import { sanitizeJsonString, validateResumeJsonSchema } from './jsonSanitizer';
import { repairJson } from './repairJson';

export interface JsonProcessResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  repaired: boolean;
}

/**
 * 处理模型输出的JSON
 * 完整链路：清洗 → 解析 → 验证
 * 失败时尝试修复
 */
export function processResumeJson<T = unknown>(rawJson: string): JsonProcessResult<T> {
  // Step 1: 清洗
  const cleaned = sanitizeJsonString(rawJson);
  if (!cleaned) {
    return { success: false, data: null, error: 'JSON内容为空', repaired: false };
  }

  // Step 2: 尝试解析
  try {
    const data = JSON.parse(cleaned) as T;
    
    // Step 3: 验证schema
    const validation = validateResumeJsonSchema(data);
    if (!validation.valid) {
      return {
        success: false,
        data,
        error: `JSON结构验证失败: ${validation.errors.join(', ')}`,
        repaired: false,
      };
    }

    return { success: true, data, repaired: false };
  } catch (parseError) {
    // Step 4: 尝试修复
    const repaired = repairJson(cleaned);
    if (!repaired) {
      return {
        success: false,
        data: null,
        error: `JSON解析失败且无法修复: ${(parseError as Error).message}`,
        repaired: false,
      };
    }

    // Step 5: 尝试解析修复后的JSON
    try {
      const data = JSON.parse(repaired) as T;
      
      // 验证修复后的schema
      const validation = validateResumeJsonSchema(data);
      if (!validation.valid) {
        return {
          success: false,
          data,
          error: `修复后JSON结构验证失败: ${validation.errors.join(', ')}`,
          repaired: true,
        };
      }

      return { success: true, data, repaired: true };
    } catch (repairParseError) {
      return {
        success: false,
        data: null,
        error: `修复后仍无法解析: ${(repairParseError as Error).message}`,
        repaired: true,
      };
    }
  }
}
