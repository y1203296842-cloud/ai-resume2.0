/**
 * 模板入口 —— 通过 Registry 获取模板插件并渲染
 *
 * 新增模板时不需要修改此文件。
 * 模板注册在 src/templates/registry.ts 中完成。
 *
 * ResumeDocumentShell：统一 A4 容器，带 data-resume-document 属性。
 * PDF 导出只捕获此元素，不捕获网页 UI。
 */

import type { ResumeData } from '@/lib/types';
import { getTemplate, getDefaultTemplateId } from './registry';
import { normalizeForRendering } from '@/lib/normalizeForRendering';

/**
 * 根据模板 ID 获取并渲染模板
 * 如果模板不存在，回退到默认模板（modern）
 *
 * 所有数据在渲染前经过统一规范化层（normalizeForRendering）：
 * - 清洗占位内容
 * - 栏目排序（岗位相关性 + 内容质量）
 * - 栏目内部排序
 * - 信息去重
 * - 小标题整理
 * - STAR 结构检查
 *
 * 这确保所有模板、所有数据路径走同一套处理逻辑。
 *
 * @param templateId 模板 ID
 * @param data 原始简历数据
 * @param targetPosition 目标岗位（可选，用于相关性排序）
 */
export function getResumeTemplate(templateId: string, data: ResumeData, targetPosition?: string) {
  const normalizedData = normalizeForRendering(data, targetPosition);

  const plugin = getTemplate(templateId) ?? getTemplate(getDefaultTemplateId());
  if (!plugin) {
    throw new Error('No templates registered');
  }

  return plugin.render(normalizedData);
}

// 向后兼容：保留组件导出
export { ModernTemplate } from './modern';
export { BusinessTemplate } from './business';
export { CampusTemplate } from './campus';
export { WennekerTemplate } from './wenneker';
export { AltaCVTemplate } from './altacv';
export { TechResumeTemplate } from './techresume';
export { BasicResumeTemplate } from './basicresume';
export { PikaResumeTemplate } from './pikaresume';
