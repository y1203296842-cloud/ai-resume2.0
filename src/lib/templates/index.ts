/**
 * 模板系统 - 主入口
 * 迁移时可直接复用
 */

// 类型导出
export type {
  TemplateId,
  TemplateDefinition,
  TemplateMeta,
  TemplateStyle,
  TemplateColors,
  TemplateFonts,
  TemplateSpacing,
  TemplateSectionStyle,
  TemplateLayout,
  ContentAdapter,
  TemplateRenderContext,
  TemplateRenderResult,
} from './templateTypes';

// 注册表导出
export {
  registerTemplate,
  registerTemplates,
  getTemplateDefinition,
  getAllTemplateMetas,
  getAllTemplates,
  hasTemplate,
  recommendTemplate,
  getDefaultTemplateId,
  unregisterTemplate,
  clearRegistry,
} from './registry';

// 渲染器导出
export { renderResume } from './renderer';
