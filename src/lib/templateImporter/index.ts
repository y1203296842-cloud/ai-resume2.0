/**
 * 外部模板导入系统
 * 支持从 Overleaf/LaTeX、Word、HTML/CSS 导入模板
 * 统一转换为内部 TemplateSchema 并注册
 * 
 * 迁移时可直接复用
 */

import type { TemplateDefinition, TemplateId, TemplateStyle, TemplateLayout, TemplateMeta } from '../templates/templateTypes';
import { registerTemplate, hasTemplate } from '../templates/registry';

/** 导入来源类型 */
export type ImportSource = 'latex' | 'word' | 'html' | 'json';

/** 导入选项 */
export interface ImportOptions {
  /** 模板 ID（自定义） */
  customId?: string;
  /** 模板名称 */
  name?: string;
  /** 模板描述 */
  description?: string;
  /** 适合的行业 */
  suitableFor?: string[];
  /** 模板语言 */
  templateLanguage?: string;
  /** 简历语言（默认中文） */
  resumeLanguage?: string;
}

/** 导入结果 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean;
  /** 注册的模板 ID */
  templateId?: TemplateId;
  /** 错误信息 */
  error?: string;
  /** 导入日志 */
  logs: string[];
}

/**
 * 导入外部模板
 * 统一入口，自动检测来源类型
 */
export async function importTemplate(
  content: string,
  source: ImportSource,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const logs: string[] = [];
  
  try {
    let definition: TemplateDefinition | null = null;

    switch (source) {
      case 'latex':
        logs.push('[Importer] 解析 LaTeX 模板');
        definition = parseLatexTemplate(content, options, logs);
        break;
      case 'word':
        logs.push('[Importer] 解析 Word 模板');
        definition = parseWordTemplate(content, options, logs);
        break;
      case 'html':
        logs.push('[Importer] 解析 HTML/CSS 模板');
        definition = parseHtmlTemplate(content, options, logs);
        break;
      case 'json':
        logs.push('[Importer] 解析 JSON 模板配置');
        definition = parseJsonTemplate(content, options, logs);
        break;
      default:
        return { success: false, error: `不支持的导入来源: ${source}`, logs };
    }

    if (!definition) {
      return { success: false, error: '模板解析失败', logs };
    }

    // 注册模板
    registerTemplate(definition);
    logs.push(`[Importer] 模板 ${definition.meta.id} 注册成功`);

    return {
      success: true,
      templateId: definition.meta.id,
      logs,
    };
  } catch (error) {
    console.error('[Importer] 导入失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
      logs,
    };
  }
}

/**
 * 解析 LaTeX 模板
 * 提取 layout、section 结构、font、color、spacing
 * 删除英文固定内容，保留排版逻辑，替换动态字段
 */
function parseLatexTemplate(content: string, options: ImportOptions, logs: string[]): TemplateDefinition | null {
  const id = options.customId || generateTemplateId('latex');
  
  // 提取颜色（常见 LaTeX 颜色定义）
  const colorMatch = content.match(/\\definecolor\{[^}]+\}\{[^}]+\}\{([^}]+)\}/g);
  const primaryColor = extractLatexColor(colorMatch?.[0]) || '#1A365D';
  logs.push(`[LaTeX] 提取主色: ${primaryColor}`);

  // 提取字体
  const fontMatch = content.match(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g);
  const hasCjk = fontMatch?.some(f => /CJK|xeCJK|ctex/i.test(f));
  logs.push(`[LaTeX] 检测到 CJK 支持: ${hasCjk}`);

  // 提取 section 结构
  const sections = extractLatexSections(content);
  logs.push(`[LaTeX] 提取栏目: ${sections.join(', ')}`);

  // 提取间距
  const marginMatch = content.match(/\\usepackage\[([^\]]*)\]\{geometry\}/);
  const margin = marginMatch ? parseLatexMargin(marginMatch[1]) : '20mm';

  const definition: TemplateDefinition = {
    meta: {
      id,
      name: options.name || '导入的 LaTeX 模板',
      description: options.description || '从 LaTeX 模板导入',
      suitableFor: options.suitableFor || [],
      suitedFor: options.suitableFor || [],
      isPremium: false, // 开源版 - 所有模板免费
      source: 'imported',
      templateLanguage: options.templateLanguage || 'en',
    },
    style: {
      colors: {
        primary: primaryColor,
        textPrimary: '#1A202C',
        textSecondary: '#4A5568',
        background: '#FFFFFF',
        border: '#E2E8F0',
      },
      fonts: {
        heading: 'Computer Modern, serif',
        body: 'Computer Modern, serif',
        headingSize: '16px',
        bodySize: '12px',
        lineHeight: '1.5',
      },
      spacing: {
        padding: '30px',
        sectionGap: '16px',
        itemGap: '8px',
      },
      sectionStyle: {
        titleStyle: 'underline',
        showIcons: false,
        divider: 'solid',
      },
    },
    layout: {
      photoPosition: 'none',
      columns: 1,
      margin,
      compact: false,
    },
    contentAdapter: {
      defaultSections: sections.length > 0 ? sections : ['personalInfo', 'education', 'experience', 'skills'],
    },
  };

  return definition;
}

/**
 * 解析 Word 模板
 */
function parseWordTemplate(content: string, options: ImportOptions, logs: string[]): TemplateDefinition | null {
  const id = options.customId || generateTemplateId('word');
  logs.push('[Word] Word 模板解析为占位实现，需后续集成 docx 样式提取');

  const definition: TemplateDefinition = {
    meta: {
      id,
      name: options.name || '导入的 Word 模板',
      description: options.description || '从 Word 模板导入',
      suitableFor: options.suitableFor || [],
      suitedFor: options.suitableFor || [],
      isPremium: false, // 开源版 - 所有模板免费
      source: 'imported',
      templateLanguage: options.templateLanguage || 'zh-CN',
    },
    style: {
      colors: {
        primary: '#2B6CB0',
        textPrimary: '#1A202C',
        textSecondary: '#4A5568',
        background: '#FFFFFF',
        border: '#CBD5E0',
      },
      fonts: {
        heading: 'Calibri, PingFang SC, sans-serif',
        body: 'Calibri, PingFang SC, sans-serif',
        headingSize: '16px',
        bodySize: '12px',
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
      defaultSections: ['personalInfo', 'education', 'experience', 'skills', 'evaluation'],
    },
  };

  return definition;
}

/**
 * 解析 HTML/CSS 模板
 */
function parseHtmlTemplate(content: string, options: ImportOptions, logs: string[]): TemplateDefinition | null {
  const id = options.customId || generateTemplateId('html');

  // 从 CSS 中提取颜色
  const colorMatches = content.match(/#[0-9a-fA-F]{3,8}/g) || [];
  const primaryColor = colorMatches[0] || '#0071E3';
  logs.push(`[HTML] 提取主色: ${primaryColor}`);

  // 从 CSS 中提取字体
  const fontMatches = content.match(/font-family:\s*([^;]+)/g) || [];
  const fontFamily = fontMatches[0]?.replace('font-family:', '').trim() || 'Inter, sans-serif';
  logs.push(`[HTML] 提取字体: ${fontFamily}`);

  const definition: TemplateDefinition = {
    meta: {
      id,
      name: options.name || '导入的 HTML 模板',
      description: options.description || '从 HTML/CSS 模板导入',
      suitableFor: options.suitableFor || [],
      suitedFor: options.suitableFor || [],
      isPremium: false, // 开源版 - 所有模板免费
      source: 'imported',
      templateLanguage: options.templateLanguage || 'zh-CN',
    },
    style: {
      colors: {
        primary: primaryColor,
        textPrimary: '#1D1D1F',
        textSecondary: '#86868B',
        background: '#FFFFFF',
        border: '#E5E5E7',
      },
      fonts: {
        heading: fontFamily,
        body: fontFamily,
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
    },
  };

  return definition;
}

/**
 * 解析 JSON 模板配置
 */
function parseJsonTemplate(content: string, options: ImportOptions, logs: string[]): TemplateDefinition | null {
  const id = options.customId || generateTemplateId('json');

  try {
    const config = JSON.parse(content);
    logs.push('[JSON] 解析 JSON 配置成功');

    const definition: TemplateDefinition = {
      meta: {
        id,
        name: config.name || options.name || '导入的 JSON 模板',
        description: config.description || options.description || '从 JSON 配置导入',
        suitableFor: config.suitableFor || options.suitableFor || [],
        suitedFor: config.suitedFor || options.suitableFor || [],
        isPremium: config.isPremium || false, // 开源版 - 所有模板免费
        source: 'imported',
        templateLanguage: config.templateLanguage || options.templateLanguage || 'zh-CN',
      },
      style: config.style || {
        colors: {
          primary: '#0071E3',
          textPrimary: '#1D1D1F',
          textSecondary: '#86868B',
        },
      },
      layout: config.layout || {
        photoPosition: 'right',
        columns: 1,
        margin: '20mm',
      },
      contentAdapter: config.contentAdapter || {
        defaultSections: ['personalInfo', 'education', 'experience', 'skills'],
      },
    };

    return definition;
  } catch (error) {
    logs.push(`[JSON] 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    return null;
  }
}

// ============ 辅助函数 ============

/**
 * 生成模板 ID
 */
function generateTemplateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 提取 LaTeX 颜色值
 */
function extractLatexColor(defineColor: string | undefined): string | null {
  if (!defineColor) return null;
  // 匹配 {rgb}{0.1,0.2,0.3} 或 {HTML}{1A365D} 格式
  const rgbMatch = defineColor.match(/\{rgb\}\{([^}]+)\}/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(Number);
    if (parts.length === 3) {
      const hex = parts.map(p => Math.round(p * 255).toString(16).padStart(2, '0')).join('');
      return `#${hex}`;
    }
  }
  const htmlMatch = defineColor.match(/\{HTML\}\{([0-9a-fA-F]{6})\}/);
  if (htmlMatch) {
    return `#${htmlMatch[1]}`;
  }
  return null;
}

/**
 * 提取 LaTeX section 结构
 */
function extractLatexSections(content: string): string[] {
  const sectionMap: Record<string, string> = {
    'section{Education': 'education',
    'section{Experience': 'experience',
    'section{Work': 'experience',
    'section{Project': 'projects',
    'section{Skill': 'skills',
    'section{Summary': 'evaluation',
    'section{Profile': 'personalInfo',
    'section{Personal': 'personalInfo',
    'section{Certificate': 'certificates',
    'section{Honor': 'certificates',
    'section{Award': 'certificates',
    'section{Research': 'research',
    'section{Publication': 'publications',
  };

  const sections: string[] = [];
  for (const [pattern, section] of Object.entries(sectionMap)) {
    if (content.includes(pattern) && !sections.includes(section)) {
      sections.push(section);
    }
  }

  return sections;
}

/**
 * 解析 LaTeX margin 配置
 */
function parseLatexMargin(options: string): string {
  const marginMatch = options.match(/margin=(\d+(?:\.\d+)?(?:mm|cm|in|pt))/);
  return marginMatch ? marginMatch[1] : '20mm';
}
