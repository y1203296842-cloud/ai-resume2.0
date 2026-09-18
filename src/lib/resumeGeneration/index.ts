/**
 * Resume Generation Module
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

export {
  ResumeGenerationStateMachine,
  getGlobalStateMachine,
  resetGlobalStateMachine,
  getStateMessage,
  getStateProgress,
  type GenerationState,
  type StateInfo,
} from './stateMachine';

export {
  analyzeAndEnhance,
  type EnhancementPlan,
  type GapAnalysis,
  type TransferableSkill,
  type EnhancementSuggestion,
} from './autoEnhancement';
