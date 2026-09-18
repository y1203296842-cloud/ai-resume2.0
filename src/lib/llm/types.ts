/**
 * LLM Provider — 统一接口定义
 *
 * 当前实现：DeepSeek（在 src/config/llm.ts 中的 createLLMStream）
 * 未来实现：OpenAIProvider, AnthropicProvider, 等
 *
 * 切换 LLM 提供商时，只需实现此接口，无需修改 API 路由和业务逻辑。
 *
 * 使用方式：
 *   import type { LLMProvider } from '@/lib/llm/types';
 *
 *   const provider: LLMProvider = {
 *     createStream(messages, options) { ... }
 *   };
 */

import type { LLMMessage } from '@/config/llm';

export interface LLMStreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  /** 提供商标识 */
  readonly name: string;

  /**
   * 创建流式对话
   * 返回 AsyncGenerator，逐块 yield 文本片段。
   */
  createStream(
    messages: LLMMessage[],
    options?: LLMStreamOptions
  ): AsyncGenerator<string, void, unknown>;

  /**
   * （可选）非流式对话
   * 默认实现：收集 createStream 的全部输出。
   */
  createCompletion?(
    messages: LLMMessage[],
    options?: LLMStreamOptions
  ): Promise<string>;
}
