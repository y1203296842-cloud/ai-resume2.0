/**
 * AI Output Gateway Module
 * 
 * 所有LLM输出的统一处理入口
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

export {
  processAIOutput,
  processResumeJsonSync,
  type OutputType,
  type GatewayInput,
  type GatewayOutput,
  type RecoveryOptions,
} from './gateway';
