/**
 * 模板类型定义
 * 定义模板的完整配置结构
 * 迁移时可直接复用
 */

/** 模板 ID */
export type TemplateId = 'modern' | 'business' | 'campus' | string;

/** 颜色配置 */
export interface TemplateColors {
  /** 主色 */
  primary: string;
  /** 次要色 */
  secondary?: string;
  /** 文字主色 */
  textPrimary: string;
  /** 文字次要色 */
  textSecondary?: string;
  /** 背景色 */
  background?: string;
  /** 边框色 */
  border?: string;
  /** 强调色 */
  accent?: string;
}

/** 字体配置 */
export interface TemplateFonts {
  /** 标题字体 */
  heading?: string;
  /** 正文字体 */
  body?: string;
  /** 标题字号 */
  headingSize?: string;
  /** 正文字号 */
  bodySize?: string;
  /** 行高 */
  lineHeight?: string;
}

/** 间距配置 */
export interface TemplateSpacing {
  /** 页面内边距 */
  padding?: string;
  /** 段落间距 */
  sectionGap?: string;
  /** 元素间距 */
  itemGap?: string;
}

/** 栏目样式 */
export interface TemplateSectionStyle {
  /** 标题样式 */
  titleStyle?: 'underline' | 'background' | 'border-left' | 'none';
  /** 是否显示图标 */
  showIcons?: boolean;
  /** 分隔线样式 */
  divider?: 'solid' | 'dashed' | 'none';
}

/** 布局配置 */
export interface TemplateLayout {
  /** 头像位置 */
  photoPosition?: 'left' | 'right' | 'top' | 'none';
  /** 列数 */
  columns?: 1 | 2;
  /** 页面边距 */
  margin?: string;
  /** 是否紧凑布局 */
  compact?: boolean;
}

/** 完整模板样式配置 */
export interface TemplateStyle {
  /** 颜色 */
  colors: TemplateColors;
  /** 字体 */
  fonts?: TemplateFonts;
  /** 间距 */
  spacing?: TemplateSpacing;
  /** 栏目样式 */
  sectionStyle?: TemplateSectionStyle;
}

/** 模板元数据 */
export interface TemplateMeta {
  /** 模板 ID */
  id: TemplateId;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 适合的行业/岗位 */
  suitableFor: string[];
  /** 适合的用户类型 */
  suitedFor: string[];
  /** 开源版 - 所有模板免费，此字段保留用于类型兼容 */
  isPremium?: boolean;
  /** 模板来源 */
  source?: 'builtin' | 'imported';
  /** 模板语言 */
  templateLanguage?: string;
  /** 预览图 URL */
  previewUrl?: string;
}

/** 完整模板定义 */
export interface TemplateDefinition {
  /** 元数据 */
  meta: TemplateMeta;
  /** 样式配置 */
  style: TemplateStyle;
  /** 布局配置 */
  layout: TemplateLayout;
  /** 内容适配配置 */
  contentAdapter?: ContentAdapter;
}

/** 内容适配配置 - 根据用户身份动态调整内容结构 */
export interface ContentAdapter {
  /** 研究生额外栏目 */
  graduate?: string[];
  /** 职场人士额外栏目 */
  professional?: string[];
  /** 学生额外栏目 */
  student?: string[];
  /** 默认栏目顺序 */
  defaultSections: string[];
}

/** 模板渲染上下文 */
export interface TemplateRenderContext {
  /** 模板 ID */
  templateId: TemplateId;
  /** 简历数据 */
  resumeData: Record<string, unknown>;
  /** 用户身份类型 */
  userType?: 'graduate' | 'professional' | 'student';
  /** 目标岗位 */
  targetPosition?: string;
  /** 输出格式 */
  outputFormat?: 'pdf' | 'word' | 'html';
  /** 简历语言 */
  resumeLanguage?: string;
}

/** 模板渲染结果 */
export interface TemplateRenderResult {
  /** 渲染的 HTML */
  html: string;
  /** 使用的模板 ID */
  templateId: TemplateId;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}
