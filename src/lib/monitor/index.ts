/**
 * Error Monitor Module
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

export {
  createErrorRecord,
  addFixAttempt,
  updateFinalResult,
  getRecentErrors,
  getErrorStats,
  generateErrorReport,
  inferSeverity,
  type ErrorRecord,
  type ErrorSeverity,
  type ErrorStage,
  type ErrorType,
  type FixAttempt,
} from './errorMonitor';
