/**
 * Template Plugin Architecture — 统一模板契约
 *
 * 模板插件只接收标准 Resume Data，负责按自己的视觉设计渲染。
 * 模板不能直接依赖聊天、Prompt、LLM、API Key 或生成状态。
 *
 * Template Contract 层级：
 *   metadata   — 模板描述信息（名称、适用人群等）
 *   style      — 视觉样式（颜色、字体、边框等）
 *   layout     — 布局结构（单栏/双栏、侧边栏区域、栏目宽度）
 *   page       — 页面标准（A4 尺寸、边距）
 *   export     — 导出策略（分页规则、keep-together）
 *
 * 导出链路：
 *   ResumeData → Template Contract → Normalized Layout → Preview / PDF / DOCX
 *
 * 新增模板只需提供以上配置 + render 函数，无需修改导出核心逻辑。
 */

import type { ReactElement } from 'react';
import type { ResumeData } from '@/lib/types';

// TemplateId 定义在 config/templates.ts 中（避免循环依赖）
// 此处重导出供模板系统内部使用
export type { TemplateId, BuiltinTemplateId } from '@/config/templates';

// ============================================
// Section Type 体系
//
// SectionType 是 string，不限制为固定枚举。
// 已知栏目类型作为常量集合 KNOWN_SECTION_TYPES 保留，
// 但模板和系统可以处理任意栏目 id（动态栏目）。
// ============================================

export type SectionType = string;

export const ALL_SECTION_TYPES: string[] = [
  'personalInfo',
  'education',
  'experience',
  'projects',
  'skills',
  'certificates',
  'languages',
  'evaluation',
];

/** 已知的固定栏目 id 集合（用于 legacy 兼容，不限制动态栏目） */
export const KNOWN_SECTION_TYPES = ALL_SECTION_TYPES;

/** 判断一个 section id 是否是已知的固定栏目 */
export function isKnownSectionType(id: string): boolean {
  return ALL_SECTION_TYPES.includes(id);
}

// ============================================
// 页面标准 — 所有模板统一 A4 Portrait
// ============================================

export interface PageStandard {
  /** A4 宽度 */
  width: '210mm';
  /** A4 高度 */
  height: '297mm';
  /** 纵向 */
  orientation: 'portrait';
  /** 页面边距（mm） */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/** 系统统一 A4 页面标准 — 所有模板必须使用此标准 */
export const A4_PAGE_STANDARD: PageStandard = {
  width: '210mm',
  height: '297mm',
  orientation: 'portrait',
  margins: {
    top: 15,
    bottom: 15,
    left: 18,
    right: 18,
  },
};

// ============================================
// 布局配置 — 描述模板的结构布局
// ============================================

export interface SidebarConfig {
  /** 侧边栏位置 */
  position: 'left' | 'right';
  /** 侧边栏宽度占比（百分比 0-100） */
  width: number;
  /** 属于侧边栏的 Section 列表（personalInfo 自动包含） */
  regions: SectionType[];
  /** 侧边栏背景色（用于 DOCX 单元格底色，如 'F5F7FA'） */
  bgColor?: string;
}

export interface LayoutConfig {
  /** 布局类型 */
  type: 'single-column' | 'two-column';
  /** 双栏配置（type 为 two-column 时必填） */
  sidebar?: SidebarConfig;
}

// ============================================
// 导出策略 — 分页与 keep-together 规则
// ============================================

export interface ExportPolicy {
  /** Section 标题是否 keep-with-next（防止标题孤立在页底） */
  keepTitleWithNext: boolean;
  /** 完整内容块（项目/经历/教育条目）是否尽量保持整体不分页 */
  keepItemTogether: boolean;
  /** 是否禁止表格行跨页拆分（默认 false：禁止会导致双栏内容超一页时整行被推到第二页） */
  cantSplitRows: boolean;
}

/** 系统统一导出策略 */
export const DEFAULT_EXPORT_POLICY: ExportPolicy = {
  keepTitleWithNext: true,
  keepItemTogether: true,
  cantSplitRows: false,
};

// ============================================
// 模板样式配置（视觉样式，不影响结构）
// ============================================

export interface TemplateStyleConfig {
  primaryColor: string;
  font: string;
  isTwoColumn: boolean;
  sidebarWidth: number;
  titleBg: string;
  titleColor: string;
  titlePadding: string;
  titleRadius: string;
  titleBorder: string;
  skillBg: string;
  skillColor: string;
  skillBorder: string;
}

// ============================================
// DOCX 布局配置 — 从 Preview CSS 提取的视觉参数
// 让 Word Export 读取统一 Contract，不再硬编码
// ============================================

export type ListRenderStyle = 'tags' | 'pipe' | 'slash' | 'grid-bullets' | 'bullets';

export interface DocxLayoutConfig {
  pageMargins: { top: number; bottom: number; left: number; right: number };
  bodyFontSize: number;
  bodyLineHeight: number;
  fontFamily?: string;
  nameFontSize: number;
  nameBold: boolean;
  nameAlignment: 'left' | 'center';
  headerBorderWidth: number;
  headerBorderColor: string;
  sectionTitleFontSize: number;
  sectionTitleBold: boolean;
  sectionTitleUppercase: boolean;
  sectionTitleBorderWidth: number;
  sectionTitleBgColor?: string;
  sectionTitleTextColor?: string;
  itemTitleFontSize: number;
  itemTitleBold: boolean;
  itemDetailFontSize: number;
  dateFontSize: number;
  dateItalic?: boolean;
  bulletFontSize: number;
  bulletColor?: string;
  subtitleSeparator?: string;
  subtitleOnOwnLine?: boolean;
  accentBarColor?: string;
  accentBarWidth?: number;
  showNameInMain?: boolean;
  mainNameFontSize?: number;
  mainNameBold?: boolean;
  sidebarNameFontSize?: number;
  sidebarNameBold?: boolean;
  sidebarNameAlignment?: 'left' | 'center';
  sidebarBodyFontSize?: number;
  sidebarLabelFontSize?: number;
  sidebarTitleFontSize?: number;
  sidebarTitleUppercase?: boolean;
  sidebarTitleBorderWidth?: number;
  sidebarPadding?: number;
  mainPadding?: number;
  sidebarShowCurrentStatus?: boolean;
  sidebarNameColor?: string;
  projectTechStackInline?: boolean;
  nameColor?: string;
  currentStatusColor?: string;
  contactInfoColor?: string;
  contactInfoSeparator?: string;
  showBasicInfo?: boolean;
  sectionBefore: number;
  sectionAfter: number;
  itemAfter: number;
  bulletAfter: number;
  headerAfter: number;
  sectionTitles: Partial<Record<SectionType, string>>;
  contentStyles: Partial<Record<SectionType, ListRenderStyle>>;
  /** 当技能/证书数量 >= 此值时，自动切换为紧凑多栏排列（全局规则） */
  compactThreshold?: number;
}

export const DEFAULT_DOCX_LAYOUT: DocxLayoutConfig = {
  pageMargins: { top: 16, bottom: 16, left: 18, right: 18 },
  bodyFontSize: 10,
  bodyLineHeight: 1.5,
  nameFontSize: 22,
  nameBold: false,
  nameAlignment: 'left',
  headerBorderWidth: 0.75,
  headerBorderColor: 'E5E5E7',
  sectionTitleFontSize: 10.5,
  sectionTitleBold: true,
  sectionTitleUppercase: false,
  sectionTitleBorderWidth: 0.75,
  itemTitleFontSize: 10.5,
  itemTitleBold: true,
  itemDetailFontSize: 9.5,
  dateFontSize: 8.5,
  bulletFontSize: 9.5,
  sectionBefore: 12,
  sectionAfter: 6,
  itemAfter: 8,
  bulletAfter: 4,
  headerAfter: 10,
  sectionTitles: {
    education: '教育背景',
    experience: '工作经历',
    projects: '项目经历',
    skills: '专业技能',
    certificates: '证书资质',
    languages: '语言能力',
    evaluation: '个人优势',
  },
  contentStyles: {
    skills: 'tags',
    certificates: 'pipe',
    languages: 'pipe',
  },
};

// ============================================
// 模板元数据
// ============================================

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  suitedFor: string[];
  /** 开源版 - 所有模板免费，此字段保留用于类型兼容 */
  isPremium: boolean;
  preview?: string;
  /** 布局类型（单栏/双栏） */
  layout?: string;
}

// ============================================
// 模板插件接口
// ============================================

export interface TemplatePlugin {
  metadata: TemplateMetadata;
  supportedSections: SectionType[];
  style: TemplateStyleConfig;
  /** 布局配置 — 描述模板的结构布局，导出器据此分配内容 */
  layout: LayoutConfig;
  /** 页面标准 — 默认使用 A4_PAGE_STANDARD，模板通常不需要覆盖 */
  page?: PageStandard;
  /** 导出策略 — 默认使用 DEFAULT_EXPORT_POLICY */
  exportPolicy?: ExportPolicy;
  /** DOCX 布局配置 — 从 Preview CSS 提取的视觉参数，让 Word Export 读取统一 Contract */
  docxLayout?: DocxLayoutConfig;
  /**
   * 基础信息渲染模式
   * - 'shared': 使用全局 PersonalInfoGrid 组件（推荐，自动支持全部 Contract 字段）
   * - 'custom': 模板自行渲染基础信息（必须确保渲染全部 Contract 字段）
   * - undefined: 等同于 'custom'，conformance 会发出警告
   *
   * 新模板建议使用 'shared'，通过 PersonalInfoGrid 组件自动继承全局 Contract。
   */
  personalInfoRenderer?: 'shared' | 'custom';
  render: (data: ResumeData) => ReactElement;
}
