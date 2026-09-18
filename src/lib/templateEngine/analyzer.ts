/**
 * 模板分析器
 * Template Analyzer - 自动分析模板源码并生成配置
 */

import type { TemplateConfig, TemplateParseResult, TemplateSourceType, LayoutType, SidebarPosition, SectionMapping, ColorTheme } from './types';

/**
 * 分析模板源码
 */
export async function analyzeTemplate(
  source: string | ArrayBuffer,
  sourceType: TemplateSourceType
): Promise<TemplateParseResult> {
  try {
    switch (sourceType) {
      case 'latex':
        return analyzeLatexTemplate(source as string);
      case 'html':
        return analyzeHtmlTemplate(source as string);
      case 'word':
        return analyzeWordTemplate(source as ArrayBuffer);
      case 'json':
        return analyzeJsonTemplate(source as string);
      default:
        return { success: false, error: `不支持的模板类型: ${sourceType}` };
    }
  } catch (error) {
    return {
      success: false,
      error: `模板分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 分析 LaTeX 模板
 */
function analyzeLatexTemplate(source: string): TemplateParseResult {
  const warnings: string[] = [];
  const config: Partial<TemplateConfig> = {
    sourceType: 'latex',
    enabled: true,
    sections: [],
    category: [],
    supportedUsers: [],
  };

  // 解析 documentclass
  const classMatch = source.match(/\\documentclass\[([^\]]*)\]\{(\w+)\}/);
  if (classMatch) {
    const options = classMatch[1];
    const docClass = classMatch[2];
    
    // 检测布局类型
    if (options.includes('twocolumn') || docClass === 'altacv') {
      config.layout = 'two-column';
      config.sidebar = 'left';
    } else {
      config.layout = 'single-column';
      config.sidebar = 'none';
    }
  }

  // 解析 geometry
  const geometryMatch = source.match(/\\geometry\{([^}]+)\}/);
  if (geometryMatch) {
    const geometry = geometryMatch[1];
    // 检测是否有 marginpar（侧边栏）
    if (geometry.includes('marginparwidth') || geometry.includes('marginparsep')) {
      config.layout = 'two-column';
      config.sidebar = geometry.includes('left=') ? 'left' : 'right';
    }
  }

  // 解析颜色定义
  const colorTheme = extractLatexColors(source);
  if (colorTheme) {
    config.colorTheme = colorTheme;
  }

  // 解析 section 结构
  const sections = extractLatexSections(source);
  config.sections = sections;

  // 检测分类
  if (source.includes('altacv') || source.includes('academic')) {
    config.category?.push('academic');
  }
  if (source.includes('moderncv') || source.includes('professional')) {
    config.category?.push('professional');
  }

  // 生成模板ID和名称
  config.id = generateTemplateId(source);
  config.name = extractTemplateName(source) || '未命名模板';

  // 设置默认值
  config.colorTheme = config.colorTheme || {
    primary: '#333333',
    textPrimary: '#000000',
    background: '#FFFFFF',
  };

  if (!config.layout) {
    config.layout = 'single-column';
  }

  if (warnings.length > 0) {
    return { success: true, config: config as TemplateConfig, warnings };
  }

  return { success: true, config: config as TemplateConfig };
}

/**
 * 分析 HTML 模板
 */
function analyzeHtmlTemplate(source: string): TemplateParseResult {
  const config: Partial<TemplateConfig> = {
    sourceType: 'html',
    enabled: true,
    sections: [],
    category: [],
    supportedUsers: [],
  };

  // 检测布局类型
  if (source.includes('grid') || source.includes('flex') || source.includes('two-column') || source.includes('sidebar')) {
    config.layout = 'two-column';
    // 检测侧边栏位置
    if (source.includes('sidebar-left') || source.includes('left-sidebar')) {
      config.sidebar = 'left';
    } else if (source.includes('sidebar-right') || source.includes('right-sidebar')) {
      config.sidebar = 'right';
    } else {
      config.sidebar = 'left';
    }
  } else {
    config.layout = 'single-column';
    config.sidebar = 'none';
  }

  // 提取颜色
  const colorTheme = extractHtmlColors(source);
  config.colorTheme = colorTheme || undefined;

  // 提取字体
  const typography = extractHtmlTypography(source);
  config.typography = typography;

  // 提取栏目结构
  config.sections = extractHtmlSections(source);

  // 生成模板ID和名称
  config.id = generateTemplateId(source);
  config.name = extractTemplateName(source) || 'HTML模板';

  // 设置默认值
  config.colorTheme = config.colorTheme || {
    primary: '#333333',
    textPrimary: '#000000',
    background: '#FFFFFF',
  };

  return { success: true, config: config as TemplateConfig };
}

/**
 * 分析 Word 模板
 */
function analyzeWordTemplate(source: ArrayBuffer): TemplateParseResult {
  // Word 模板分析需要解析 docx 格式
  // 这里提供基础框架，实际实现需要 mammoth 或类似库
  const config: Partial<TemplateConfig> = {
    sourceType: 'word',
    enabled: true,
    sections: [],
    category: ['professional'],
    supportedUsers: ['professional', 'freshgraduate'],
    layout: 'single-column',
    sidebar: 'none',
    colorTheme: {
      primary: '#333333',
      textPrimary: '#000000',
      background: '#FFFFFF',
    },
    id: 'word-template-' + Date.now(),
    name: 'Word模板',
  };

  return {
    success: true,
    config: config as TemplateConfig,
    warnings: ['Word模板分析功能有限，建议手动调整配置'],
  };
}

/**
 * 分析 JSON 模板配置
 */
function analyzeJsonTemplate(source: string): TemplateParseResult {
  try {
    const config = JSON.parse(source) as TemplateConfig;
    config.sourceType = 'json';
    config.enabled = true;
    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: `JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 提取 LaTeX 颜色
 */
function extractLatexColors(source: string): ColorTheme | null {
  const colors: Record<string, string> = {};
  
  // 匹配 \definecolor{Name}{HTML}{XXXXXX}
  const defineColorRegex = /\\definecolor\{(\w+)\}\{HTML\}\{([0-9A-Fa-f]{6})\}/g;
  let match;
  while ((match = defineColorRegex.exec(source)) !== null) {
    colors[match[1].toLowerCase()] = '#' + match[2];
  }

  // 匹配 \colorlet{name}{color}
  const colorletRegex = /\\colorlet\{(\w+)\}\{(\w+)\}/g;
  while ((match = colorletRegex.exec(source)) !== null) {
    const alias = match[1].toLowerCase();
    const target = match[2].toLowerCase();
    if (colors[target]) {
      colors[alias] = colors[target];
    }
  }

  if (Object.keys(colors).length === 0) {
    return null;
  }

  return {
    primary: colors['heading'] || colors['accent'] || colors['primary'] || '#333333',
    secondary: colors['secondary'] || colors['emphasis'],
    accent: colors['accent'] || colors['primary'],
    textPrimary: colors['body'] || colors['text'] || '#000000',
    textSecondary: colors['lightgrey'] || colors['gray'] || '#666666',
    background: '#FFFFFF',
  };
}

/**
 * 提取 HTML 颜色
 */
function extractHtmlColors(source: string): ColorTheme | null {
  const colors: string[] = [];
  
  // 匹配 CSS 中的颜色值
  const colorRegex = /(?:color|background-color|border-color)\s*:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\)|[a-z]+)/gi;
  let match;
  while ((match = colorRegex.exec(source)) !== null) {
    colors.push(match[1]);
  }

  if (colors.length === 0) {
    return null;
  }

  // 提取主要颜色
  const primary = colors[0] || '#333333';
  const secondary = colors[1] || primary;

  return {
    primary,
    secondary,
    textPrimary: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
  };
}

/**
 * 提取 HTML 字体
 */
function extractHtmlTypography(source: string): { headingFont?: string; bodyFont?: string } {
  const fontMatch = source.match(/font-family\s*:\s*([^;]+)/i);
  if (fontMatch) {
    const fonts = fontMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
    return {
      headingFont: fonts[0],
      bodyFont: fonts[fonts.length - 1],
    };
  }
  return {};
}

/**
 * 提取 LaTeX 栏目结构
 */
function extractLatexSections(source: string): SectionMapping[] {
  const sections: SectionMapping[] = [];
  
  // 匹配 \cvsection{Name} 或 \section{Name}
  const sectionRegex = /\\(?:cvsection|section)\{([^}]+)\}/gi;
  let match;
  let order = 0;
  
  while ((match = sectionRegex.exec(source)) !== null) {
    const name = match[1];
    sections.push({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      position: 'main',
      order: order++,
    });
  }

  // 如果没有找到 section，尝试匹配常见的简历栏目
  if (sections.length === 0) {
    const defaultSections = ['education', 'experience', 'skills', 'projects'];
    defaultSections.forEach((name, index) => {
      sections.push({
        id: name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        position: 'main',
        order: index,
      });
    });
  }

  return sections;
}

/**
 * 提取 HTML 栏目结构
 */
function extractHtmlSections(source: string): SectionMapping[] {
  const sections: SectionMapping[] = [];
  
  // 匹配 <h2> 或 <section> 标签
  const sectionRegex = /<(?:h2|h3|section)[^>]*>([^<]+)<\/(?:h2|h3|section)>/gi;
  let match;
  let order = 0;
  
  while ((match = sectionRegex.exec(source)) !== null) {
    const name = match[1].trim();
    if (name && name.length < 50) {
      sections.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        position: 'main',
        order: order++,
      });
    }
  }

  return sections;
}

/**
 * 生成模板ID
 */
function generateTemplateId(source: string): string {
  // 从源码中提取名称或使用哈希
  const nameMatch = source.match(/\\name\{([^}]+)\}|<title>([^<]+)<\/title>|name["']?\s*:\s*["']([^"']+)/i);
  if (nameMatch) {
    const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  
  // 使用简单哈希
  let hash = 0;
  for (let i = 0; i < Math.min(source.length, 100); i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash = hash & hash;
  }
  return 'template-' + Math.abs(hash).toString(36);
}

/**
 * 提取模板名称
 */
function extractTemplateName(source: string): string | null {
  // 尝试从各种位置提取名称
  const patterns = [
    /\\name\{([^}]+)\}/i,
    /<title>([^<]+)<\/title>/i,
    /name["']?\s*:\s*["']([^"']+)["']/i,
    /<!--\s*Template:\s*([^-\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}
