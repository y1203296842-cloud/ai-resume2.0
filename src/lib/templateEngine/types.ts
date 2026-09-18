/**
 * 模板引擎类型定义
 * Template Engine Type Definitions
 */

/** 模板来源类型 */
export type TemplateSourceType = 'latex' | 'html' | 'word' | 'json' | 'manual';

/** 布局类型 */
export type LayoutType = 'single-column' | 'two-column' | 'creative' | 'minimal';

/** 侧边栏位置 */
export type SidebarPosition = 'left' | 'right' | 'none';

/** 模板分类 */
export type TemplateCategory = 'academic' | 'professional' | 'creative' | 'technical' | 'business';

/** 支持的用户类型 */
export type SupportedUserType = 'student' | 'freshgraduate' | 'graduate' | 'professional' | 'researcher';

/** 栏目映射 */
export interface SectionMapping {
  /** 栏目ID */
  id: string;
  /** 栏目名称 */
  name: string;
  /** 映射到哪个区域 */
  position: 'sidebar' | 'main' | 'header' | 'footer';
  /** 数据字段映射 */
  dataField?: string;
  /** 是否必填 */
  required?: boolean;
  /** 排序 */
  order?: number;
}

/** 颜色主题 */
export interface ColorTheme {
  /** 主色 */
  primary: string;
  /** 次要色 */
  secondary?: string;
  /** 强调色 */
  accent?: string;
  /** 文字主色 */
  textPrimary: string;
  /** 文字次要色 */
  textSecondary?: string;
  /** 背景色 */
  background: string;
  /** 边框色 */
  border?: string;
}

/** 字体配置 */
export interface Typography {
  /** 标题字体 */
  headingFont?: string;
  /** 正文字体 */
  bodyFont?: string;
  /** 标题大小 */
  headingSize?: string;
  /** 正文大小 */
  bodySize?: string;
  /** 行高 */
  lineHeight?: string;
}

/** 模板配置 */
export interface TemplateConfig {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 来源类型 */
  sourceType: TemplateSourceType;
  /** 布局类型 */
  layout: LayoutType;
  /** 侧边栏位置 */
  sidebar?: SidebarPosition;
  /** 分类 */
  category: TemplateCategory[];
  /** 支持的用户类型 */
  supportedUsers: SupportedUserType[];
  /** 颜色主题 */
  colorTheme: ColorTheme;
  /** 字体配置 */
  typography?: Typography;
  /** 栏目映射 */
  sections: SectionMapping[];
  /** 预览图 */
  previewImage?: string;
  /** 版本 */
  version?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 额外配置 */
  metadata?: Record<string, unknown>;
}

/** 模板解析结果 */
export interface TemplateParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析后的配置 */
  config?: TemplateConfig;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
}

/** 模板渲染选项 */
export interface TemplateRenderOptions {
  /** 模板ID */
  templateId: string;
  /** 简历数据 */
  data: unknown;
  /** 输出格式 */
  format: 'html' | 'pdf' | 'docx';
  /** 语言 */
  locale?: string;
}
