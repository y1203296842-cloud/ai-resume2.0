/**
 * 模板注册表
 * Template Registry - 管理所有可用模板
 */

import type { TemplateConfig, TemplateCategory, SupportedUserType } from './types';

/** 模板存储 */
const templateStore = new Map<string, TemplateConfig>();

/**
 * 注册模板
 */
export function registerTemplate(config: TemplateConfig): void {
  templateStore.set(config.id, config);
}

/**
 * 批量注册模板
 */
export function registerTemplates(configs: TemplateConfig[]): void {
  configs.forEach(config => registerTemplate(config));
}

/**
 * 注销模板
 */
export function unregisterTemplate(templateId: string): boolean {
  return templateStore.delete(templateId);
}

/**
 * 获取模板
 */
export function getTemplate(templateId: string): TemplateConfig | undefined {
  return templateStore.get(templateId);
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): TemplateConfig[] {
  return Array.from(templateStore.values());
}

/**
 * 获取启用的模板
 */
export function getEnabledTemplates(): TemplateConfig[] {
  return Array.from(templateStore.values()).filter(t => t.enabled);
}

/**
 * 按分类筛选模板
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateConfig[] {
  return Array.from(templateStore.values()).filter(
    t => t.enabled && t.category.includes(category)
  );
}

/**
 * 按用户类型筛选模板
 */
export function getTemplatesByUserType(userType: SupportedUserType): TemplateConfig[] {
  return Array.from(templateStore.values()).filter(
    t => t.enabled && t.supportedUsers.includes(userType)
  );
}

/**
 * 按岗位推荐模板
 */
export function recommendTemplates(position: string): TemplateConfig[] {
  const positionLower = position.toLowerCase();
  
  // 岗位关键词映射到模板分类
  const categoryMap: Record<string, TemplateCategory> = {
    '技术': 'technical',
    '开发': 'technical',
    '工程': 'technical',
    '工程师': 'technical',
    '学术': 'academic',
    '研究': 'academic',
    '科研': 'academic',
    '商务': 'business',
    '销售': 'business',
    '市场': 'business',
    '设计': 'creative',
    '创意': 'creative',
  };

  // 查找匹配的分类
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (positionLower.includes(keyword)) {
      return getTemplatesByCategory(category);
    }
  }

  // 默认返回所有启用的模板
  return getEnabledTemplates();
}

/**
 * 更新模板
 */
export function updateTemplate(templateId: string, updates: Partial<TemplateConfig>): boolean {
  const existing = templateStore.get(templateId);
  if (!existing) {
    return false;
  }

  const updated = { ...existing, ...updates, id: templateId };
  templateStore.set(templateId, updated);
  return true;
}

/**
 * 启用/禁用模板
 */
export function setTemplateEnabled(templateId: string, enabled: boolean): boolean {
  return updateTemplate(templateId, { enabled });
}

/**
 * 检查模板是否存在
 */
export function hasTemplate(templateId: string): boolean {
  return templateStore.has(templateId);
}

/**
 * 获取模板数量
 */
export function getTemplateCount(): number {
  return templateStore.size;
}

/**
 * 清空所有模板
 */
export function clearTemplates(): void {
  templateStore.clear();
}

/**
 * 导出模板配置（用于持久化）
 */
export function exportTemplates(): TemplateConfig[] {
  return Array.from(templateStore.values());
}

/**
 * 导入模板配置（用于恢复）
 */
export function importTemplates(configs: TemplateConfig[]): void {
  configs.forEach(config => {
    templateStore.set(config.id, config);
  });
}
