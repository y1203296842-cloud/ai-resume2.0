/**
 * 模板引擎
 * Template Engine - 统一的模板管理和渲染系统
 */

// 类型导出
export type {
  TemplateConfig,
  TemplateCategory,
  SupportedUserType,
  LayoutType,
  SidebarPosition,
  TemplateSourceType,
  ColorTheme,
  Typography,
  SectionMapping,
  TemplateParseResult,
} from './types';

// 分析器
export { analyzeTemplate } from './analyzer';

// 注册表
export {
  registerTemplate,
  registerTemplates,
  unregisterTemplate,
  getTemplate,
  getAllTemplates,
  getEnabledTemplates,
  getTemplatesByCategory,
  getTemplatesByUserType,
  recommendTemplates,
  updateTemplate,
  setTemplateEnabled,
  hasTemplate,
  getTemplateCount,
  clearTemplates,
  exportTemplates,
  importTemplates,
} from './registry';

// 渲染器
export { renderResume } from './renderer';
export type { ResumeData, RenderOptions } from './renderer';
