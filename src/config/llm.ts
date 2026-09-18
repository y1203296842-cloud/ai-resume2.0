/**
 * LLM 提供商抽象层（开源版）
 *
 * 使用原生 fetch 调用 OpenAI 兼容 API (DeepSeek / OpenAI / 其他)
 * 不依赖任何第三方 SDK，避免 bundler 兼容性问题
 *
 * 开源版说明：
 * - 不使用环境变量 DEEPSEEK_API_KEY 作为 fallback
 * - 必须由调用方通过 apiKey 参数传入用户的 API Key
 * - 环境变量中的 DEEPSEEK_API_KEY 会被完全忽略
 *
 * 迁移时只需修改此文件:
 * 1. 更换 createLLMStream 的实现
 * 2. 业务逻辑无需改动
 */

import type { NextRequest } from 'next/server';

/**
 * LLM 消息格式 (统一接口，不依赖特定模型)
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM 配置
 *
 * 环境变量 (仅作为后备默认值，用户前端配置优先):
 * - DEEPSEEK_API_URL:  API Base URL (默认 https://api.deepseek.com/v1)
 * - DEEPSEEK_MODEL:    模型名称 (默认 deepseek-chat)
 *
 * 注意：开源版不在此处配置 API Key，必须由调用方通过 apiKey 参数传入。
 *       DEEPSEEK_API_KEY 环境变量不会被使用。
 *
 * 用户可通过前端配置 Base URL 和 Model，通过请求头传入，
 * 优先级：用户前端配置 > 环境变量 > 内置默认值
 */
export const LLM_CONFIG = {
  /** 默认模型 (可通过环境变量覆盖) */
  defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  /** 温度 */
  temperature: 0.7,
  /** 最大输出 token 数（简历JSON需要较大空间，8192确保不被截断） */
  maxTokens: 8192,
  /** 默认 API Base URL */
  defaultBaseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
} as const;

/**
 * 创建 LLM 流式响应
 *
 * 这是唯一的 LLM 调用入口。
 * 使用原生 fetch 调用 OpenAI 兼容 API，解析 SSE 流。
 *
 * 开源版说明：apiKey 为必填参数，不使用环境变量作为 fallback。
 *
 * @param messages 对话消息列表
 * @param apiKey 用户提供的 API Key（必填，从请求头获取）
 * @param request 原始请求 (用于提取 headers)
 * @param options 可选配置：baseUrl 和 model（从请求头获取，覆盖默认值）
 * @returns 异步迭代器，产出文本片段
 */
export async function* createLLMStream(
  messages: LLMMessage[],
  apiKey: string,
  request?: NextRequest,
  options?: { baseUrl?: string; model?: string }
): AsyncGenerator<string> {
  // 开源版：只使用传入的 apiKey，不使用环境变量 fallback
  const resolvedApiKey = apiKey?.trim() || '';

  // 检查 API Key 是否配置
  if (!resolvedApiKey) {
    yield '[错误] 未提供 API Key。请在前端输入你的 API Key。';
    return;
  }

  // 提取转发 headers
  const customHeaders = request
    ? Object.fromEntries(
        request.headers
          .entries()
          .filter(([key]) => key.startsWith('x-forwarded-') || key === 'x-real-ip')
      )
    : {};

  // 解析用户配置的 Base URL 和 Model（优先级：参数 > 默认值）
  const resolvedBaseUrl = (options?.baseUrl?.trim() || LLM_CONFIG.defaultBaseURL).replace(/\/+$/, '');
  const resolvedModel = options?.model?.trim() || LLM_CONFIG.defaultModel;

  // 调用 OpenAI 兼容 API (DeepSeek / OpenAI / 其他)
  const response = await fetch(`${resolvedBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resolvedApiKey}`,
      ...customHeaders,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: LLM_CONFIG.temperature,
      max_tokens: LLM_CONFIG.maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`LLM API error (${response.status}):`, errorText);
    yield `[错误] LLM API 返回错误 ${response.status}: ${errorText.slice(0, 200)}`;
    return;
  }

  // 解析 SSE 流
  const reader = response.body?.getReader();
  if (!reader) {
    yield '[错误] 无法读取 LLM 响应流';
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finishReason: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          // Log finish reason when stream completes
          if (finishReason) {
            console.log(`[LLM] Stream finished. finish_reason=${finishReason}`);
            if (finishReason === 'length') {
              console.warn('[LLM] Output was truncated due to max_tokens limit!');
            }
          }
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          // Capture finish_reason for logging and truncation detection
          const fr = parsed.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
          if (content) {
            yield content;
          }
        } catch {
          // 忽略 JSON 解析错误（可能是部分 chunk）
        }
      }
    }
    // Stream ended without [DONE] — log finish reason if available
    if (finishReason) {
      console.log(`[LLM] Stream ended (no [DONE]). finish_reason=${finishReason}`);
    }
  } finally {
    reader.releaseLock();
  }
}
