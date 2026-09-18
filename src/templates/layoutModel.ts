/**
 * Unified Layout Model — 统一布局中间层
 *
 * 核心职责：
 * 将 ResumeData + Template Contract 转化为 Normalized Layout，
 * 让 Preview / PDF / DOCX 三个渲染器读取同一份结构定义，
 * 而不是各自猜测"这个模板应该是双栏""Sidebar 应该多宽""evaluation 应该在哪里"。
 *
 * 导出链路：
 *   ResumeData
 *     ↓
 *   Template Contract (metadata + style + layout + page + exportPolicy)
 *     ↓
 *   NormalizedLayout (sidebarSections + mainSections + pageConfig + policy)
 *     ↓
 *   Preview / PDF / DOCX
 *
 * 全局规则（来自 rules.ts，所有模板自动继承）：
 *   - personalInfo 始终保留
 *   - 空栏目自动隐藏
 *   - evaluation 始终是最后一个非空栏目
 *   - 模板不支持的栏目自动 fallback
 *
 * 布局分配规则：
 *   - single-column: 所有栏目按顺序排列在 main 中
 *   - two-column: sidebar.regions 中的栏目 + personalInfo → sidebar；其余 → main
 *     evaluation 始终在 main 的最后（不进 sidebar）
 *     动态 section 根据 placement 属性决定放在 sidebar 还是 main
 */

import type { ResumeData, ResumeSection } from '@/lib/types';
import { ensureSections } from '@/lib/sectionNormalizer';
import type {
  SectionType,
  TemplatePlugin,
  LayoutConfig,
  PageStandard,
  ExportPolicy,
} from './types';
import { A4_PAGE_STANDARD, DEFAULT_EXPORT_POLICY } from './types';
import { getOrderedSectionIds } from './rules';

// ============================================
// Normalized Layout — 三个渲染器共享的统一结构
// ============================================

export interface NormalizedLayout {
  /** 页面标准（A4 Portrait + 边距） */
  page: PageStandard;
  /** 布局配置 */
  layout: LayoutConfig;
  /** 导出策略 */
  exportPolicy: ExportPolicy;
  /** 侧边栏栏目顺序（personalInfo 始终首位） */
  sidebarSections: string[];
  /** 主栏栏目顺序（evaluation 始终末位） */
  mainSections: string[];
}

// ============================================
// 双栏默认侧边栏栏目
// ============================================

/** 当 two-column 模板未声明 sidebar.regions 时的默认值 */
const DEFAULT_SIDEBAR_REGIONS: SectionType[] = ['skills', 'certificates', 'languages'];

// ============================================
// 核心函数：构建 Normalized Layout
// ============================================

/**
 * 从 ResumeData + TemplatePlugin 构建 Normalized Layout
 *
 * 这是 Preview / PDF / DOCX 三个渲染器的统一数据源。
 * 任何渲染器都不应自行决定栏目归属，必须读取此 Layout。
 */
export function buildNormalizedLayout(
  data: ResumeData,
  plugin: TemplatePlugin
): NormalizedLayout {
  const page = plugin.page ?? A4_PAGE_STANDARD;
  const exportPolicy = plugin.exportPolicy ?? DEFAULT_EXPORT_POLICY;
  const layout = resolveLayout(plugin);

  // 获取全局规则处理后的有序栏目 id 列表（支持动态 sections）
  const orderedSectionIds = getOrderedSectionIds(data, plugin.supportedSections);

  if (layout.type === 'single-column') {
    return {
      page,
      layout,
      exportPolicy,
      sidebarSections: [],
      mainSections: orderedSectionIds,
    };
  }

  // 双栏：根据 placement 属性和 sidebar.regions 分配
  // 所有栏目（已知和动态）统一使用 placement 属性决定 sidebar/main
  // 如果 section 没有 placement，则检查 sidebar.regions
  const sidebarRegions = new Set(layout.sidebar?.regions ?? DEFAULT_SIDEBAR_REGIONS);
  const allSections = ensureSections(data);
  const sectionMap = new Map<string, ResumeSection>();
  for (const s of allSections) {
    sectionMap.set(s.id, s);
  }

  const sidebarSections: string[] = [];
  const mainSections: string[] = [];

  for (const sectionId of orderedSectionIds) {
    // personalInfo 始终进 sidebar（双栏模板中个人信息在侧边栏）
    if (sectionId === 'personalInfo') {
      sidebarSections.push(sectionId);
      continue;
    }
    // evaluation 始终进 main（个人优势在主栏最后）
    if (sectionId === 'evaluation') {
      mainSections.push(sectionId);
      continue;
    }

    // 所有栏目统一按 placement 属性分配
    const section = sectionMap.get(sectionId);
    if (section?.placement === 'sidebar') {
      sidebarSections.push(sectionId);
    } else if (section?.placement === 'main') {
      mainSections.push(sectionId);
    } else if (sidebarRegions.has(sectionId)) {
      // 没有 placement 属性时，检查 sidebar.regions
      sidebarSections.push(sectionId);
    } else {
      mainSections.push(sectionId);
    }
  }

  return {
    page,
    layout,
    exportPolicy,
    sidebarSections,
    mainSections,
  };
}

// ============================================
// 布局解析与归一化
// ============================================

/**
 * 解析模板布局配置，填充默认值
 */
function resolveLayout(plugin: TemplatePlugin): LayoutConfig {
  const layout = plugin.layout;

  if (layout.type === 'two-column') {
    // 确保 sidebar 配置完整
    const sidebar = layout.sidebar;
    const width = sidebar?.width ?? plugin.style.sidebarWidth ?? 35;
    const position = sidebar?.position ?? 'left';
    const regions = sidebar?.regions ?? DEFAULT_SIDEBAR_REGIONS;
    const bgColor = sidebar?.bgColor;

    return {
      type: 'two-column',
      sidebar: { position, width, regions, bgColor },
    };
  }

  return { type: 'single-column' };
}
