/**
 * 模板注册表
 * 管理所有可用模板的注册、查询、选择
 * 迁移时可直接复用，新增模板只需注册
 */

import type { TemplateDefinition, TemplateId, TemplateMeta } from './templateTypes';
import { wennekerDefinition } from './wenneker';
import { altacvDefinition } from './altacv';

/** 已注册模板集合 */
const registeredTemplates = new Map<TemplateId, TemplateDefinition>();

/**
 * 注册模板
 * 新增模板时调用此函数
 */
export function registerTemplate(definition: TemplateDefinition): void {
  if (registeredTemplates.has(definition.meta.id)) {
    console.warn(`[TemplateRegistry] 模板 ${definition.meta.id} 已存在，将被覆盖`);
  }
  registeredTemplates.set(definition.meta.id, definition);
}

/**
 * 批量注册模板
 */
export function registerTemplates(definitions: TemplateDefinition[]): void {
  definitions.forEach(registerTemplate);
}

/**
 * 获取模板定义
 */
export function getTemplateDefinition(id: TemplateId): TemplateDefinition | undefined {
  return registeredTemplates.get(id);
}

/**
 * 获取所有已注册模板的元数据
 */
export function getAllTemplateMetas(): TemplateMeta[] {
  return Array.from(registeredTemplates.values()).map(t => t.meta);
}

/**
 * 获取所有已注册模板定义
 */
export function getAllTemplates(): TemplateDefinition[] {
  return Array.from(registeredTemplates.values());
}

/**
 * 检查模板是否存在
 */
export function hasTemplate(id: TemplateId): boolean {
  return registeredTemplates.has(id);
}

/**
 * 根据岗位推荐模板
 */
export function recommendTemplate(position: string): TemplateId {
  const positionLower = position.toLowerCase();
  
  for (const [id, template] of registeredTemplates) {
    const { suitableFor, suitedFor } = template.meta;
    const allKeywords = [...suitableFor, ...suitedFor].map(k => k.toLowerCase());
    
    if (allKeywords.some(keyword => positionLower.includes(keyword) || keyword.includes(positionLower))) {
      return id;
    }
  }
  
  // 默认返回第一个模板
  return registeredTemplates.keys().next().value || 'modern';
}

/**
 * 获取默认模板 ID
 */
export function getDefaultTemplateId(): TemplateId {
  return 'modern';
}

/**
 * 注销模板（用于动态移除）
 */
export function unregisterTemplate(id: TemplateId): boolean {
  return registeredTemplates.delete(id);
}

/**
 * 清空所有注册（用于测试）
 */
export function clearRegistry(): void {
  registeredTemplates.clear();
}

// ============ 内置模板定义 ============

/** Modern 模板定义 */
const modernDefinition: TemplateDefinition = {
  meta: {
    id: 'modern',
    name: '互联网简洁风',
    description: '简洁现代，适合互联网/科技行业',
    suitableFor: ['互联网', '科技', '产品', '运营', '设计', '开发'],
    suitedFor: ['互联网', '科技', '产品', '运营', '设计'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'builtin',
    templateLanguage: 'zh-CN',
  },
  style: {
    colors: {
      primary: '#0071E3',
      textPrimary: '#1D1D1F',
      textSecondary: '#86868B',
      background: '#FFFFFF',
      border: '#E5E5E7',
    },
    fonts: {
      heading: 'Inter, -apple-system, PingFang SC, sans-serif',
      body: 'Inter, -apple-system, PingFang SC, sans-serif',
      headingSize: '18px',
      bodySize: '14px',
      lineHeight: '1.6',
    },
    spacing: {
      padding: '40px',
      sectionGap: '24px',
      itemGap: '12px',
    },
    sectionStyle: {
      titleStyle: 'border-left',
      showIcons: false,
      divider: 'none',
    },
  },
  layout: {
    photoPosition: 'right',
    columns: 1,
    margin: '20mm',
    compact: false,
  },
  contentAdapter: {
    defaultSections: ['personalInfo', 'education', 'experience', 'projects', 'skills', 'evaluation'],
    graduate: ['research', 'publications', 'labSkills'],
    professional: ['achievements', 'management', 'metrics'],
    student: ['campus', 'courseProjects', 'competitions'],
  },
};

/** Business 模板定义 */
const businessDefinition: TemplateDefinition = {
  meta: {
    id: 'business',
    name: '商务正式风',
    description: '专业正式，适合传统行业/管理岗',
    suitableFor: ['金融', '咨询', '管理', '销售', '市场', '法律'],
    suitedFor: ['金融', '咨询', '管理', '销售', '市场'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'builtin',
    templateLanguage: 'zh-CN',
  },
  style: {
    colors: {
      primary: '#1A365D',
      secondary: '#2C5282',
      textPrimary: '#1A202C',
      textSecondary: '#4A5568',
      background: '#FFFFFF',
      border: '#CBD5E0',
      accent: '#2B6CB0',
    },
    fonts: {
      heading: 'Georgia, SimSun, serif',
      body: 'Inter, PingFang SC, sans-serif',
      headingSize: '16px',
      bodySize: '13px',
      lineHeight: '1.5',
    },
    spacing: {
      padding: '36px',
      sectionGap: '20px',
      itemGap: '10px',
    },
    sectionStyle: {
      titleStyle: 'underline',
      showIcons: false,
      divider: 'solid',
    },
  },
  layout: {
    photoPosition: 'left',
    columns: 1,
    margin: '25mm',
    compact: false,
  },
  contentAdapter: {
    defaultSections: ['personalInfo', 'education', 'experience', 'projects', 'skills', 'certificates', 'evaluation'],
    graduate: ['research', 'publications'],
    professional: ['achievements', 'management', 'metrics', 'certifications'],
    student: ['internship', 'campus', 'courseProjects'],
  },
};

/** Campus 模板定义 */
const campusDefinition: TemplateDefinition = {
  meta: {
    id: 'campus',
    name: '应届生校园风',
    description: '清新活力，突出校园经历和潜力',
    suitableFor: ['大学生', '应届生', '实习', '转行', '教育'],
    suitedFor: ['大学生', '应届生', '实习', '转行'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'builtin',
    templateLanguage: 'zh-CN',
  },
  style: {
    colors: {
      primary: '#38A169',
      secondary: '#48BB78',
      textPrimary: '#2D3748',
      textSecondary: '#718096',
      background: '#FFFFFF',
      border: '#E2E8F0',
      accent: '#38B2AC',
    },
    fonts: {
      heading: 'Inter, PingFang SC, sans-serif',
      body: 'Inter, PingFang SC, sans-serif',
      headingSize: '16px',
      bodySize: '14px',
      lineHeight: '1.6',
    },
    spacing: {
      padding: '32px',
      sectionGap: '18px',
      itemGap: '10px',
    },
    sectionStyle: {
      titleStyle: 'background',
      showIcons: true,
      divider: 'none',
    },
  },
  layout: {
    photoPosition: 'top',
    columns: 1,
    margin: '20mm',
    compact: false,
  },
  contentAdapter: {
    defaultSections: ['personalInfo', 'education', 'campus', 'courseProjects', 'skills', 'certificates', 'evaluation'],
    graduate: ['research', 'publications', 'labSkills'],
    professional: ['internship', 'projects'],
    student: ['campus', 'courseProjects', 'competitions', 'volunteer'],
  },
};

// 注册内置模板
registerTemplates([modernDefinition, businessDefinition, campusDefinition, wennekerDefinition, altacvDefinition]);
