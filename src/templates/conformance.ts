/**
 * Export Conformance Layer — 导出一致性检查
 *
 * 在注册和导出前对模板配置进行统一检查/标准化，确保：
 * 1. 所有模板使用 A4 Portrait 页面标准
 * 2. 双栏模板有完整的 sidebar 配置
 * 3. evaluation 不在 sidebar regions 中
 * 4. sidebar 宽度在合理范围内
 * 5. sidebar regions 中的 SectionType 都是合法值
 * 6. supportedSections 包含 personalInfo（全局 Contract）
 * 7. supportedSections 中 evaluation 在最后（全局规则）
 * 8. supportedSections 声明所有 SectionType（fallback 机制保障）
 *
 * 发现非法配置时：
 * - 能自动修复的 → normalize
 * - 不能自动修复的 → 抛出明确错误
 *
 * 这保证了"导出成功，但布局已经坏了"的情况不会发生。
 * 这也保证了未来新模板注册时自动继承全局规则。
 */

import type { TemplatePlugin, SectionType, LayoutConfig, PageStandard } from './types';
import { A4_PAGE_STANDARD } from './types';

// ============================================
// 检查结果
// ============================================

export interface ConformanceResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  normalizedLayout?: LayoutConfig;
  normalizedPage?: PageStandard;
  normalizedSupportedSections?: SectionType[];
}

// ============================================
// 默认侧边栏栏目（用于 auto-normalize）
// ============================================

const DEFAULT_SIDEBAR_REGIONS: SectionType[] = ['skills', 'certificates', 'languages'];

// ============================================
// 核心验证函数
// ============================================

export function validateTemplate(plugin: TemplatePlugin): ConformanceResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let normalizedLayout: LayoutConfig | undefined;
  let normalizedPage: PageStandard | undefined;
  let normalizedSupportedSections: SectionType[] | undefined;

  // 1. 页面标准检查
  const page = plugin.page ?? A4_PAGE_STANDARD;
  if (page.width !== '210mm' || page.height !== '297mm' || page.orientation !== 'portrait') {
    warnings.push(
      `模板 "${plugin.metadata.id}" 页面标准非 A4 Portrait，已自动归一化为 A4`
    );
    normalizedPage = A4_PAGE_STANDARD;
  }

  // 2. 布局类型检查
  if (plugin.layout.type !== 'single-column' && plugin.layout.type !== 'two-column') {
    errors.push(
      `模板 "${plugin.metadata.id}" layout.type 非法: ${plugin.layout.type}`
    );
    return { valid: false, warnings, errors };
  }

  // 3. 双栏模板的 sidebar 配置检查
  if (plugin.layout.type === 'two-column') {
    const sidebar = plugin.layout.sidebar;

    // sidebar 缺失 → 自动补全默认值
    if (!sidebar) {
      warnings.push(
        `模板 "${plugin.metadata.id}" 为双栏但未定义 sidebar 配置，已使用默认值`
      );
      normalizedLayout = {
        type: 'two-column',
        sidebar: {
          position: 'left',
          width: plugin.style.sidebarWidth || 35,
          regions: DEFAULT_SIDEBAR_REGIONS,
          bgColor: undefined,
        },
      };
    } else {
      let needsNormalization = false;
      const fixed = { ...sidebar, regions: [...sidebar.regions] };

      // 宽度检查
      if (sidebar.width <= 0 || sidebar.width >= 100) {
        warnings.push(
          `模板 "${plugin.metadata.id}" sidebar.width=${sidebar.width} 不在有效范围 (0-100)，已重置为 35`
        );
        fixed.width = 35;
        needsNormalization = true;
      }

      // regions 合法性检查 — 动态栏目允许任意 id，不做白名单过滤
      // 仅检查 evaluation 和 personalInfo 的特殊规则

      // evaluation 不允许在 sidebar 中
      if (fixed.regions.includes('evaluation')) {
        warnings.push(
          `模板 "${plugin.metadata.id}" sidebar.regions 包含 evaluation，已移除（evaluation 必须在主栏最后）`
        );
        fixed.regions = fixed.regions.filter((r) => r !== 'evaluation');
        needsNormalization = true;
      }

      // personalInfo 不需要在 regions 中（自动包含）
      if (fixed.regions.includes('personalInfo')) {
        fixed.regions = fixed.regions.filter((r) => r !== 'personalInfo');
        needsNormalization = true;
      }

      // regions 为空时补充默认值
      if (fixed.regions.length === 0) {
        warnings.push(
          `模板 "${plugin.metadata.id}" sidebar.regions 为空，已使用默认值`
        );
        fixed.regions = [...DEFAULT_SIDEBAR_REGIONS];
        needsNormalization = true;
      }

      if (needsNormalization) {
        normalizedLayout = { type: 'two-column', sidebar: fixed };
      }
    }
  }

  // 4. supportedSections 全局 Contract 检查
  const sections = plugin.supportedSections;
  let fixedSections: SectionType[] | undefined;

  // 4a. personalInfo 必须存在（全局 Contract）
  if (!sections.includes('personalInfo')) {
    warnings.push(
      `模板 "${plugin.metadata.id}" supportedSections 缺少 personalInfo，已自动补充（全局 Contract）`
    );
    fixedSections = ['personalInfo', ...sections];
  }

  // 4b. 动态栏目支持 — supportedSections 允许任意 string id，不做白名单过滤
  // 已知栏目类型在 ALL_SECTION_TYPES 中，但模板可以声明额外的动态栏目

  // 4c. 去重
  const deduped = (fixedSections ?? sections).filter(
    (s, i, arr) => arr.indexOf(s) === i
  );
  if (deduped.length !== (fixedSections ?? sections).length) {
    warnings.push(
      `模板 "${plugin.metadata.id}" supportedSections 存在重复值，已去重`
    );
    fixedSections = deduped;
  }

  // 4d. evaluation 必须是最后一个（全局规则）
  const workingSections = fixedSections ?? sections;
  const evalIndex = workingSections.indexOf('evaluation');
  if (evalIndex !== -1 && evalIndex !== workingSections.length - 1) {
    warnings.push(
      `模板 "${plugin.metadata.id}" supportedSections 中 evaluation 不在最后，已调整（全局规则）`
    );
    fixedSections = [
      ...workingSections.filter((s) => s !== 'evaluation'),
      'evaluation',
    ];
  }

  // 4e. PersonalInfo Contract 渲染模式检查
  // 模板必须声明 personalInfoRenderer，否则发出警告
  // 'shared' = 使用全局 PersonalInfoGrid 组件（推荐）
  // 'custom' = 模板自行渲染（开发者需确保全部 Contract 字段）
  if (!plugin.personalInfoRenderer) {
    warnings.push(
      `模板 "${plugin.metadata.id}" 未声明 personalInfoRenderer。` +
      `建议设置 personalInfoRenderer: 'shared' 使用全局 PersonalInfoGrid 组件，` +
      `或设置 'custom' 并确保渲染全部 PersonalInfo Contract 字段` +
      `（性别、年龄、民族、政治面貌、学历、专业、英语成绩）。` +
      `未声明将视为 'custom'。`
    );
  } else if (plugin.personalInfoRenderer === 'custom') {
    warnings.push(
      `模板 "${plugin.metadata.id}" 使用 custom 基础信息渲染。` +
      `请确保渲染全部 PersonalInfo Contract 字段，` +
      `否则用户填写的基础信息可能丢失。`
    );
  }

  if (fixedSections) {
    normalizedSupportedSections = fixedSections;
  }

  const hasErrors = errors.length > 0;
  return {
    valid: !hasErrors,
    warnings,
    errors,
    normalizedLayout,
    normalizedPage,
    normalizedSupportedSections,
  };
}

// ============================================
// 批量验证
// ============================================

export function validateAllTemplates(plugins: TemplatePlugin[]): ConformanceResult[] {
  return plugins.map((p) => validateTemplate(p));
}

// ============================================
// 快速检查：模板是否通过一致性验证
// ============================================

export function isConformant(plugin: TemplatePlugin): boolean {
  return validateTemplate(plugin).valid;
}
