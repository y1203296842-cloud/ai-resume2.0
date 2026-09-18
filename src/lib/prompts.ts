/**
 * 果核AI（开源版） - 系统提示词
 *
 * 版本管理：
 * - v2.0: 当前启用版本（prompt2.0 开源版）
 */

import { PROMPT_2_0 } from '@/prompts/prompt2.0';
import { RESUME_GENERATION_WORKFLOW } from '@/prompts/workflows/resumeGeneration';

/**
 * 当前启用的系统提示词
 * 状态：唯一运行规则
 * 包含：prompt2.0 + 简历生成状态工作流规则
 */
export const SYSTEM_PROMPT = PROMPT_2_0 + RESUME_GENERATION_WORKFLOW;

/**
 * 获取系统提示词
 * 保持向后兼容的接口
 */
export function getSystemPrompt(options?: {
  knowledgeContent?: string;
  resumeText?: string;
}): string {
  let prompt = SYSTEM_PROMPT;
  
  // 注入知识库内容（如果提供）
  if (options?.knowledgeContent) {
    prompt += `\n\n## 岗位知识库\n\n${options.knowledgeContent}`;
  }
  
  // 注入用户上传的简历文本（如果提供）
  if (options?.resumeText) {
    prompt += `\n\n## 用户原始简历\n\n${options.resumeText}`;
  }
  
  return prompt;
}

export default SYSTEM_PROMPT;
