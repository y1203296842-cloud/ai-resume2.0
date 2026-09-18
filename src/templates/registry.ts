/**
 * 统一 Template Registry
 *
 * 这是模板的唯一注册入口。
 * 新增模板只需：
 *   1. 在 plugins.ts 中定义 TemplatePlugin
 *   2. 在 builtinPlugins 数组中添加一行
 *
 * 项目其他模块通过 Registry 获取模板信息，不再直接 switch/if-else。
 */

import type { TemplatePlugin, TemplateMetadata, TemplateStyleConfig, SectionType, LayoutConfig, PageStandard, ExportPolicy } from './types';
import { A4_PAGE_STANDARD, DEFAULT_EXPORT_POLICY } from './types';
import { builtinPlugins } from './plugins';
import { validateTemplate } from './conformance';

// ============================================
// Registry 核心
// ============================================

const registry = new Map<string, TemplatePlugin>();

/**
 * 注册单个模板插件
 *
 * 注册时自动运行 Conformance 验证：
 * - 非法配置（errors）→ 抛出错误，拒绝注册
 * - 可修复配置（warnings）→ 自动 normalize 后注册
 * - 所有 warnings 输出到 console
 *
 * 这保证了未来新模板注册时自动继承全局规则，
 * 不需要手动检查 A4、sidebar、supportedSections 等。
 */
export function registerTemplate(plugin: TemplatePlugin): void {
  if (registry.has(plugin.metadata.id)) {
    console.warn(`[TemplateRegistry] 模板 "${plugin.metadata.id}" 已存在，将被覆盖`);
  }

  const result = validateTemplate(plugin);

  if (result.errors.length > 0) {
    throw new Error(
      `[TemplateRegistry] 模板 "${plugin.metadata.id}" 注册失败，存在非法配置:\n` +
      result.errors.map((e) => `  - ${e}`).join('\n')
    );
  }

  for (const w of result.warnings) {
    console.warn(`[TemplateRegistry] ${w}`);
  }

  const normalizedPlugin: TemplatePlugin = {
    ...plugin,
    layout: result.normalizedLayout ?? plugin.layout,
    page: result.normalizedPage ?? plugin.page,
    supportedSections: result.normalizedSupportedSections ?? plugin.supportedSections,
  };

  registry.set(plugin.metadata.id, normalizedPlugin);
}

/**
 * 批量注册模板插件
 */
export function registerTemplates(plugins: TemplatePlugin[]): void {
  for (const plugin of plugins) {
    registerTemplate(plugin);
  }
}

/**
 * 注销模板
 */
export function unregisterTemplate(id: string): boolean {
  return registry.delete(id);
}

// ============================================
// 查询函数
// ============================================

/**
 * 获取模板插件（含 render 函数）
 */
export function getTemplate(id: string): TemplatePlugin | undefined {
  return registry.get(id);
}

/**
 * 获取模板元数据
 */
export function getTemplateMetadata(id: string): TemplateMetadata | undefined {
  return registry.get(id)?.metadata;
}

/**
 * 获取所有模板元数据（用于模板选择页面）
 */
export function getAllTemplateMetas(): TemplateMetadata[] {
  return Array.from(registry.values()).map((p) => p.metadata);
}

/**
 * 获取所有模板插件
 */
export function getAllTemplates(): TemplatePlugin[] {
  return Array.from(registry.values());
}

/**
 * 检查模板是否存在
 */
export function hasTemplate(id: string): boolean {
  return registry.has(id);
}

/**
 * 获取默认模板 ID
 */
export function getDefaultTemplateId(): string {
  return 'modern';
}

/**
 * 获取模板支持的栏目列表
 */
export function getSupportedSections(id: string): SectionType[] {
  return registry.get(id)?.supportedSections ?? [];
}

/**
 * 获取模板样式配置（供导出函数使用）
 * 如果模板不存在，返回 modern 的样式作为默认值
 */
export function getTemplateStyle(id: string): TemplateStyleConfig {
  const plugin = registry.get(id) ?? registry.get('modern');
  if (!plugin) {
    throw new Error('[TemplateRegistry] Registry 未初始化，无模板可用');
  }
  return plugin.style;
}

/**
 * 获取模板布局配置
 */
export function getTemplateLayout(id: string): LayoutConfig {
  const plugin = registry.get(id) ?? registry.get('modern');
  if (!plugin) {
    throw new Error('[TemplateRegistry] Registry 未初始化，无模板可用');
  }
  return plugin.layout;
}

/**
 * 获取模板页面标准（A4 Portrait）
 */
export function getTemplatePageStandard(id: string): PageStandard {
  const plugin = registry.get(id) ?? registry.get('modern');
  if (!plugin) {
    throw new Error('[TemplateRegistry] Registry 未初始化，无模板可用');
  }
  return plugin.page ?? A4_PAGE_STANDARD;
}

/**
 * 获取模板导出策略
 */
export function getTemplateExportPolicy(id: string): ExportPolicy {
  const plugin = registry.get(id) ?? registry.get('modern');
  if (!plugin) {
    throw new Error('[TemplateRegistry] Registry 未初始化，无模板可用');
  }
  return plugin.exportPolicy ?? DEFAULT_EXPORT_POLICY;
}

// ============================================
// 自动注册内置模板
// ============================================

registerTemplates(builtinPlugins);
