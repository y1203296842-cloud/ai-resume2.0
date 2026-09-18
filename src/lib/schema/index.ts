/**
 * Schema Contract System
 * 
 * 数据契约系统 - 所有AI输出的标准化基础
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

export {
  RESUME_SCHEMA,
  PERSONAL_INFO_SCHEMA,
  validateAndNormalize,
  type SchemaField,
  type SchemaDefinition,
  type SchemaValidationResult,
} from './resumeSchema';
