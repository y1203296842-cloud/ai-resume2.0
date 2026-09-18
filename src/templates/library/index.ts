/**
 * 模板库索引
 * 所有可用模板的注册入口
 * 
 * 新增模板只需：
 * 1. 在 library/ 下创建新文件夹
 * 2. 添加 config.ts, renderer.tsx, style.ts
 * 3. 在此文件中导入并注册
 */

import { altacvDefinition } from './altacv/config';
import { wennekerDefinition } from './wenneker/config';
import type { TemplateDefinition } from '@/lib/templates/templateTypes';

/** 模板库 */
export const templateLibrary: Record<string, TemplateDefinition> = {
  altacv: altacvDefinition,
  wenneker: wennekerDefinition,
};

/** 获取所有可用模板 */
export function getAvailableTemplates(): TemplateDefinition[] {
  return Object.values(templateLibrary);
}

/** 获取模板定义 */
export function getTemplateDefinition(templateId: string): TemplateDefinition | undefined {
  return templateLibrary[templateId];
}

/** 检查模板是否存在 */
export function hasTemplate(templateId: string): boolean {
  return templateId in templateLibrary;
}

/** 注册新模板 */
export function registerTemplate(definition: TemplateDefinition): void {
  templateLibrary[definition.meta.id] = definition;
}

/** 注销模板 */
export function unregisterTemplate(templateId: string): void {
  delete templateLibrary[templateId];
}

// 导出各模板定义
export { altacvDefinition } from './altacv/config';
export { wennekerDefinition } from './wenneker/config';
