/**
 * API 配置本地存储管理
 *
 * 使用 localStorage 存储用户的 API Key、Base URL、Model
 * 所有信息只存在用户浏览器中，不上传服务器
 *
 * 支持 OpenAI 兼容 API（DeepSeek / OpenAI / 其他兼容服务）
 */

const STORAGE_KEY = 'guohe_api_key';
const BASE_URL_KEY = 'guohe_api_base_url';
const MODEL_KEY = 'guohe_api_model';

/** DeepSeek 默认 Base URL */
export const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
/** DeepSeek 默认模型 */
export const DEFAULT_MODEL = 'deepseek-chat';

/**
 * 获取存储的 API Key
 * 仅在浏览器环境可用
 */
export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * 保存 API Key 到 localStorage
 */
export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
  }
}

/**
 * 获取存储的 Base URL
 * 如果未设置，返回 DeepSeek 默认值
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE_URL;
  try {
    return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

/**
 * 保存 Base URL 到 localStorage
 */
export function setBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BASE_URL_KEY, url.trim());
  } catch {
    // ignore
  }
}

/**
 * 获取存储的模型名称
 * 如果未设置，返回 DeepSeek 默认值
 */
export function getModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  try {
    return localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

/**
 * 保存模型名称到 localStorage
 */
export function setModel(model: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MODEL_KEY, model.trim());
  } catch {
    // ignore
  }
}

/**
 * 清除所有 API 配置
 */
export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BASE_URL_KEY);
    localStorage.removeItem(MODEL_KEY);
  } catch {
    // ignore
  }
}

/**
 * 检查是否已设置 API Key
 */
export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

/**
 * 验证 API Key 格式是否有效
 * 不再强制要求 sk- 前缀，支持不同提供商的 Key 格式
 */
export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return key.trim().length > 0;
}
