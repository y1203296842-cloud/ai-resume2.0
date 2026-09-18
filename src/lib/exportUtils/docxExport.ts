/**
 * DOCX 导出工具 — 基于 Unified Layout Contract
 *
 * 核心架构：
 *   ResumeData → TemplatePlugin.docxLayout → DocxLayoutConfig → DOCX
 *
 * 所有视觉参数（字号、行高、间距、栏目标题、内容渲染方式）从 DocxLayoutConfig 读取，
 * 不再硬编码。每个模板的 docxLayout 在 plugins.ts 中从 Preview CSS 提取。
 *
 * 分页策略：
 *   - 标题 + 首行内容通过 keepNext 链保持在一起（不孤立）
 *   - 各段落通过 keepLines 防止行内拆分
 *   - 不使用嵌套 cantSplit 表格（避免大面积空白）
 *   - 双栏表格行允许跨页拆分（cantSplit: false），侧边栏背景色通过 cell-level shading 延续
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  ShadingType,
  LineRuleType,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type {
  ResumeData,
  ResumeSection,
  ResumeExperienceItem,
  ResumeListItem,
  ResumeTextItem,
} from '@/lib/types';
import { ensureSections } from '@/lib/sectionNormalizer';
import type { TemplateId } from '@/config/templates';
import { getTemplate } from '@/templates/registry';
import { buildNormalizedLayout } from '@/templates/layoutModel';
import type { NormalizedLayout } from '@/templates/layoutModel';
import type { SectionType, ExportPolicy, DocxLayoutConfig, ListRenderStyle } from '@/templates/types';
import { A4_PAGE_STANDARD, DEFAULT_EXPORT_POLICY, DEFAULT_DOCX_LAYOUT, ALL_SECTION_TYPES } from '@/templates/types';
import { isChineseResume, getSectionTitle } from '@/templates/sectionTitles';

// ============================================
// 单位转换
// ============================================

const MM_TO_DXA = 56.69;

function mmToDxa(mm: number): number {
  return Math.round(mm * MM_TO_DXA);
}

function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

function ptToDxa(pt: number): number {
  return Math.round(pt * 20);
}

function ptToBorderSize(pt: number): number {
  return Math.max(1, Math.round(pt * 8));
}

function lineHeightToDxa(ratio: number): number {
  return Math.round(ratio * 240);
}

function resolveColor(cssColor: string): string {
  if (!cssColor || cssColor === 'transparent' || cssColor === 'none') return '';
  const hex = cssColor.replace('#', '');
  if (hex.length === 3) {
    return hex.split('').map(c => c + c).join('');
  }
  return hex;
}

// ============================================
// 配置获取
// ============================================

function getDocxLayout(templateId: string): DocxLayoutConfig {
  const plugin = getTemplate(templateId);
  return plugin?.docxLayout ?? DEFAULT_DOCX_LAYOUT;
}

function getSidebarLayout(config: DocxLayoutConfig): DocxLayoutConfig {
  return {
    ...config,
    bodyFontSize: config.sidebarBodyFontSize ?? config.bodyFontSize,
    sectionTitleFontSize: config.sidebarTitleFontSize ?? config.sectionTitleFontSize,
    sectionTitleUppercase: config.sidebarTitleUppercase ?? config.sectionTitleUppercase,
    sectionTitleBorderWidth: config.sidebarTitleBorderWidth ?? config.sectionTitleBorderWidth,
    nameFontSize: config.sidebarNameFontSize ?? config.nameFontSize,
    nameBold: config.sidebarNameBold ?? config.nameBold,
    nameAlignment: config.sidebarNameAlignment ?? config.nameAlignment,
  };
}

// ============================================
// 样式上下文
// ============================================

interface StyleContext {
  config: DocxLayoutConfig;
  primaryColor: string;
  font: string;
  skillBg: string;
  skillColor: string;
  policy: ExportPolicy;
  isChinese: boolean;
}

// ============================================
// TextRun / Paragraph 构建器
// ============================================

function makeRun(text: string, ctx: StyleContext, opts: {
  bold?: boolean;
  size?: number;
  color?: string;
  italics?: boolean;
} = {}): TextRun {
  const size = opts.size ?? ptToHalfPt(ctx.config.bodyFontSize);
  return new TextRun({
    text: text || '',
    bold: opts.bold,
    italics: false,
    size,
    color: opts.color,
    font: ctx.config.fontFamily ?? ctx.font,
  });
}

function makePara(runs: TextRun[], ctx: StyleContext, opts: {
  spacing?: { before?: number; after?: number };
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  border?: { bottom?: { style: typeof BorderStyle.SINGLE; size: number; color: string } };
  indent?: { left?: number };
  shading?: { type: typeof ShadingType.SOLID; color: string; fill: string };
  keepNext?: boolean;
  keepLines?: boolean;
} = {}): Paragraph {
  const lineSpacing = lineHeightToDxa(ctx.config.bodyLineHeight);
  return new Paragraph({
    children: runs,
    spacing: {
      ...opts.spacing,
      line: lineSpacing,
      lineRule: LineRuleType.AUTO,
    },
    alignment: opts.alignment,
    border: opts.border,
    indent: opts.indent,
    shading: opts.shading as any,
    keepNext: opts.keepNext,
    keepLines: opts.keepLines,
    wordWrap: true,
  });
}

// ============================================
// 无边框定义
// ============================================

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const;

type DocxBlock = Paragraph | Table;

// ============================================
// Section 标题
// ============================================

function addSectionTitle(title: string, ctx: StyleContext, blocks: DocxBlock[]): void {
  const { config, primaryColor, font } = ctx;
  const effectiveFont = config.fontFamily ?? font;
  const text = config.sectionTitleUppercase ? title.toUpperCase() : title;
  const textColor = config.sectionTitleTextColor ?? primaryColor;
  const fontSize = ptToHalfPt(config.sectionTitleFontSize);

  const border = config.sectionTitleBorderWidth > 0
    ? { bottom: { style: BorderStyle.SINGLE, size: ptToBorderSize(config.sectionTitleBorderWidth), color: primaryColor } }
    : undefined;

  const shading = config.sectionTitleBgColor
    ? { type: ShadingType.SOLID, color: config.sectionTitleBgColor, fill: config.sectionTitleBgColor }
    : undefined;

  blocks.push(
    new Paragraph({
      children: [new TextRun({
        text,
        bold: config.sectionTitleBold,
        size: fontSize,
        color: textColor,
        font: effectiveFont,
        italics: false,
      })],
      spacing: {
        before: ptToDxa(config.sectionBefore),
        after: ptToDxa(config.sectionAfter),
        line: lineHeightToDxa(config.bodyLineHeight),
        lineRule: LineRuleType.AUTO,
      },
      border,
      shading: shading as any,
      keepNext: true,
    })
  );
}

// ============================================
// 内容渲染器：列表类栏目（技能、证书、语言）
// ============================================

function renderListContent(
  items: string[],
  section: SectionType,
  ctx: StyleContext
): DocxBlock[] {
  let style = ctx.config.contentStyles[section] ?? 'pipe';
  const title = getSectionTitle(section, ctx.isChinese);
  const blocks: DocxBlock[] = [];

  addSectionTitle(title, ctx, blocks);

  // 全局规则：当技能/证书数量 >= compactThreshold（默认 6）时，
  // 自动从 pipe/slash/bullets 切换为紧凑多栏排列
  const threshold = ctx.config.compactThreshold ?? 6;
  if (items.length >= threshold && (style === 'pipe' || style === 'slash' || style === 'bullets')) {
    style = 'tags';
  }

  const { config, primaryColor, font } = ctx;
  const bodySize = ptToHalfPt(config.bodyFontSize);
  const after = ptToDxa(config.itemAfter);

  switch (style) {
    case 'pipe':
      blocks.push(makePara(
        [makeRun(items.join('  |  '), ctx)],
        ctx,
        { spacing: { after } }
      ));
      break;

    case 'slash':
      blocks.push(makePara(
        [makeRun(items.join('  /  '), ctx)],
        ctx,
        { spacing: { after } }
      ));
      break;

    case 'bullets':
      for (const item of items) {
        blocks.push(makePara(
          [
            makeRun('• ', ctx, { color: primaryColor }),
            makeRun(item, ctx),
          ],
          ctx,
          { spacing: { after: ptToDxa(config.bulletAfter) }, indent: { left: 200 }, keepLines: true }
        ));
      }
      break;

    case 'grid-bullets':
      blocks.push(buildGridBullets(items, ctx));
      break;

    case 'tags':
      blocks.push(buildTags(items, ctx));
      break;
  }

  return blocks;
}

function buildTags(items: string[], ctx: StyleContext): Table {
  const { config, font, skillBg, skillColor } = ctx;
  const effectiveFont = config.fontFamily ?? font;
  const bodySize = ptToHalfPt(config.bodyFontSize);

  const bgColor = resolveColor(skillBg) || 'F5F5F7';
  const textColor = resolveColor(skillColor) || '3A3A3C';

  const TAGS_PER_ROW = 3;
  const rows: TableRow[] = [];

  for (let i = 0; i < items.length; i += TAGS_PER_ROW) {
    const cells: TableCell[] = [];
    for (let j = 0; j < TAGS_PER_ROW; j++) {
      const item = items[i + j];
      if (item) {
        cells.push(new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: item,
              size: bodySize,
              color: textColor,
              font: effectiveFont,
              italics: false,
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 10, after: 10, line: lineHeightToDxa(config.bodyLineHeight), lineRule: LineRuleType.AUTO },
          })],
          shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
          margins: { top: 10, bottom: 10, left: 40, right: 40 },
          borders: NO_BORDERS,
          width: { size: 33, type: WidthType.PERCENTAGE },
        }));
      } else {
        cells.push(new TableCell({
          children: [new Paragraph('')],
          borders: NO_BORDERS,
          width: { size: 33, type: WidthType.PERCENTAGE },
        }));
      }
    }
    rows.push(new TableRow({ children: cells, cantSplit: true }));
  }

  return new Table({
    rows,
    borders: NO_BORDERS,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function buildGridBullets(items: string[], ctx: StyleContext): Table {
  const { config, primaryColor, font } = ctx;
  const effectiveFont = config.fontFamily ?? font;
  const bodySize = ptToHalfPt(config.bodyFontSize);

  const rows: TableRow[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cells: TableCell[] = [];
    for (let j = 0; j < 2; j++) {
      const item = items[i + j];
      cells.push(new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: '• ', size: bodySize, color: primaryColor, font: effectiveFont, italics: false }),
            new TextRun({ text: item || '', size: bodySize, font: effectiveFont, italics: false }),
          ],
          spacing: { after: 20, line: lineHeightToDxa(config.bodyLineHeight), lineRule: LineRuleType.AUTO },
        })],
        borders: NO_BORDERS,
        width: { size: 50, type: WidthType.PERCENTAGE },
      }));
    }
    rows.push(new TableRow({ children: cells, cantSplit: true }));
  }

  return new Table({
    rows,
    borders: NO_BORDERS,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ============================================
// 渲染：教育背景
// ============================================

function renderEducation(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  if (!data.education || data.education.length === 0) return blocks;

  const title = getSectionTitle('education', ctx.isChinese);
  addSectionTitle(title, ctx, blocks);

  const { config, font } = ctx;
  const titleSize = ptToHalfPt(config.itemTitleFontSize);
  const detailSize = ptToHalfPt(config.itemDetailFontSize);
  const dateSize = ptToHalfPt(config.dateFontSize);
  const dateItalic = config.dateItalic ?? false;
  const subtitleSep = config.subtitleSeparator ?? ' · ';

  for (const edu of data.education) {
    blocks.push(makePara(
      [
        makeRun(edu.school, ctx, { bold: config.itemTitleBold, size: titleSize }),
        makeRun(`  ${edu.startDate || ''} - ${edu.endDate || '至今'}`, ctx, { size: dateSize, color: '86868B', italics: dateItalic }),
      ],
      ctx,
      { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
    ));

    const subParts: string[] = [];
    if (edu.major) subParts.push(edu.major);
    if (edu.degree) subParts.push(edu.degree);
    if (subParts.length > 0) {
      blocks.push(makePara(
        [makeRun(subParts.join(subtitleSep), ctx, { size: detailSize, color: '585858' })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: !!edu.gpa || !!edu.description, keepLines: true }
      ));
    }

    if (edu.gpa) {
      blocks.push(makePara(
        [makeRun(`GPA: ${edu.gpa}`, ctx, { size: detailSize, color: '86868B' })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: !!edu.description, keepLines: true }
      ));
    }

    if (edu.description) {
      blocks.push(makePara(
        [makeRun(edu.description, ctx, { size: detailSize, color: '86868B' })],
        ctx,
        { spacing: { after: ptToDxa(config.itemAfter) }, keepLines: true }
      ));
    } else {
      blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(config.itemAfter) } }));
    }
  }

  return blocks;
}

// ============================================
// 渲染：工作/实习经历
// ============================================

function renderExperience(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  if (!data.experience || data.experience.length === 0) return blocks;

  const title = getSectionTitle('experience', ctx.isChinese);
  addSectionTitle(title, ctx, blocks);

  const { config } = ctx;
  const titleSize = ptToHalfPt(config.itemTitleFontSize);
  const detailSize = ptToHalfPt(config.itemDetailFontSize);
  const dateSize = ptToHalfPt(config.dateFontSize);
  const bulletSize = ptToHalfPt(config.bulletFontSize);
  const dateItalic = config.dateItalic ?? false;
  const subtitleSep = config.subtitleSeparator ?? ' · ';
  const subtitleOnOwnLine = config.subtitleOnOwnLine ?? false;
  const bulletColor = config.bulletColor;

  for (const exp of data.experience) {
    if (subtitleOnOwnLine && exp.position) {
      blocks.push(makePara(
        [makeRun(exp.company, ctx, { bold: config.itemTitleBold, size: titleSize })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
      blocks.push(makePara(
        [
          makeRun(exp.position, ctx, { size: detailSize, color: '585858', italics: dateItalic }),
          makeRun(`  ${exp.startDate || ''} - ${exp.endDate || '至今'}`, ctx, { size: dateSize, color: '86868B', italics: dateItalic }),
        ],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
    } else {
      const titleRuns: TextRun[] = [
        makeRun(exp.company, ctx, { bold: config.itemTitleBold, size: titleSize }),
      ];
      if (exp.position) {
        titleRuns.push(makeRun(` ${subtitleSep} ${exp.position}`, ctx, { size: detailSize, color: '585858' }));
      }
      titleRuns.push(makeRun(`  ${exp.startDate || ''} - ${exp.endDate || '至今'}`, ctx, { size: dateSize, color: '86868B', italics: dateItalic }));
      blocks.push(makePara(
        titleRuns,
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
    }

    if (exp.description && exp.description.length > 0) {
      const descs = exp.description.filter(Boolean);
      descs.forEach((desc, idx) => {
        const isLast = idx === descs.length - 1;
        blocks.push(makePara(
          [makeRun(`• ${desc}`, ctx, { size: bulletSize, color: bulletColor })],
          ctx,
          {
            spacing: { after: isLast ? ptToDxa(config.itemAfter) : ptToDxa(config.bulletAfter) },
            indent: { left: 200 },
            keepLines: true,
          }
        ));
      });
    } else {
      blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(config.itemAfter) } }));
    }
  }

  return blocks;
}

// ============================================
// 渲染：项目经历
// ============================================

function renderProjects(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  if (!data.projects || data.projects.length === 0) return blocks;

  const title = getSectionTitle('projects', ctx.isChinese);
  addSectionTitle(title, ctx, blocks);

  const { config, primaryColor, font } = ctx;
  const effectiveFont = config.fontFamily ?? font;
  const titleSize = ptToHalfPt(config.itemTitleFontSize);
  const detailSize = ptToHalfPt(config.itemDetailFontSize);
  const dateSize = ptToHalfPt(config.dateFontSize);
  const bulletSize = ptToHalfPt(config.bulletFontSize);
  const bulletColor = config.bulletColor;
  const lineSpacing = lineHeightToDxa(config.bodyLineHeight);
  const inlineTechStack = config.projectTechStackInline === true;

  for (const proj of data.projects) {
    if (inlineTechStack && proj.techStack) {
      blocks.push(new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: config.itemTitleBold, size: titleSize, font: effectiveFont, italics: false }),
          new TextRun({ text: '\t', font: effectiveFont, italics: false }),
          new TextRun({ text: proj.techStack, size: dateSize, color: '86868B', font: effectiveFont, italics: false }),
        ],
        spacing: { after: ptToDxa(2), line: lineSpacing, lineRule: LineRuleType.AUTO },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        keepNext: true,
        keepLines: true,
      }));
    } else {
      blocks.push(makePara(
        [makeRun(proj.name, ctx, { bold: config.itemTitleBold, size: titleSize })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
    }

    if (proj.role) {
      blocks.push(makePara(
        [makeRun(proj.role, ctx, { size: detailSize, color: '585858' })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
    }

    if (proj.description && proj.description.length > 0) {
      const descs = proj.description.filter(Boolean);
      descs.forEach((desc, idx) => {
        const isLast = idx === descs.length - 1;
        blocks.push(makePara(
          [makeRun(`• ${desc}`, ctx, { size: bulletSize, color: bulletColor })],
          ctx,
          {
            spacing: { after: isLast && !proj.techStack ? ptToDxa(config.itemAfter) : ptToDxa(config.bulletAfter) },
            indent: { left: 200 },
            keepLines: true,
          }
        ));
      });
    }

    if (!inlineTechStack && proj.techStack) {
      blocks.push(makePara(
        [makeRun(`技术栈：${proj.techStack}`, ctx, { size: detailSize, color: primaryColor })],
        ctx,
        { spacing: { after: ptToDxa(config.itemAfter) }, keepLines: true }
      ));
    } else if (!proj.description || proj.description.length === 0) {
      blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(config.itemAfter) } }));
    }
  }

  return blocks;
}

// ============================================
// 渲染：个人评价
// ============================================

function renderEvaluation(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  if (!data.evaluation) return blocks;

  const title = getSectionTitle('evaluation', ctx.isChinese);
  addSectionTitle(title, ctx, blocks);

  blocks.push(makePara(
    [makeRun(data.evaluation, ctx)],
    ctx,
    { spacing: { after: ptToDxa(ctx.config.itemAfter) }, keepLines: true }
  ));

  return blocks;
}

// ============================================
// 动态 Section 渲染器
// ============================================

/**
 * 渲染 experience-item 类型的动态栏目
 * 样式参考 renderExperience：标题 + 副标题 + 时间 + 描述要点
 */
function renderDynamicExperienceSection(
  section: ResumeSection,
  title: string,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const items = section.items as ResumeExperienceItem[];
  if (items.length === 0) return blocks;

  addSectionTitle(title, ctx, blocks);

  const { config } = ctx;
  const titleSize = ptToHalfPt(config.itemTitleFontSize);
  const detailSize = ptToHalfPt(config.itemDetailFontSize);
  const dateSize = ptToHalfPt(config.dateFontSize);
  const bulletSize = ptToHalfPt(config.bulletFontSize);
  const dateItalic = config.dateItalic ?? false;
  const subtitleSep = config.subtitleSeparator ?? ' · ';
  const subtitleOnOwnLine = config.subtitleOnOwnLine ?? false;
  const bulletColor = config.bulletColor;

  for (const item of items) {
    if (subtitleOnOwnLine && item.subtitle) {
      blocks.push(makePara(
        [makeRun(item.title, ctx, { bold: config.itemTitleBold, size: titleSize })],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
      const subRuns: TextRun[] = [];
      if (item.subtitle) {
        subRuns.push(makeRun(item.subtitle, ctx, { size: detailSize, color: '585858', italics: dateItalic }));
      }
      if (item.startDate || item.endDate) {
        subRuns.push(makeRun(`  ${item.startDate || ''} - ${item.endDate || '至今'}`, ctx, { size: dateSize, color: '86868B', italics: dateItalic }));
      }
      if (subRuns.length > 0) {
        blocks.push(makePara(
          subRuns,
          ctx,
          { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
        ));
      }
    } else {
      const titleRuns: TextRun[] = [
        makeRun(item.title, ctx, { bold: config.itemTitleBold, size: titleSize }),
      ];
      if (item.subtitle) {
        titleRuns.push(makeRun(` ${subtitleSep} ${item.subtitle}`, ctx, { size: detailSize, color: '585858' }));
      }
      if (item.startDate || item.endDate) {
        titleRuns.push(makeRun(`  ${item.startDate || ''} - ${item.endDate || '至今'}`, ctx, { size: dateSize, color: '86868B', italics: dateItalic }));
      }
      blocks.push(makePara(
        titleRuns,
        ctx,
        { spacing: { after: ptToDxa(2) }, keepNext: true, keepLines: true }
      ));
    }

    if (item.description && item.description.length > 0) {
      const descs = item.description.filter(Boolean);
      descs.forEach((desc, idx) => {
        const isLast = idx === descs.length - 1;
        blocks.push(makePara(
          [makeRun(`• ${desc}`, ctx, { size: bulletSize, color: bulletColor })],
          ctx,
          {
            spacing: { after: isLast ? ptToDxa(config.itemAfter) : ptToDxa(config.bulletAfter) },
            indent: { left: 200 },
            keepLines: true,
          }
        ));
      });
    } else {
      blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(config.itemAfter) } }));
    }
  }

  return blocks;
}

/**
 * 渲染 list-item 类型的动态栏目
 * 样式参考 renderListContent：默认 pipe 分隔符样式
 */
function renderDynamicListSection(
  section: ResumeSection,
  title: string,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const listItems = section.items as ResumeListItem[];
  const allItems = listItems.flatMap((i) => i.items).filter(Boolean);
  if (allItems.length === 0) return blocks;

  addSectionTitle(title, ctx, blocks);

  const { config, primaryColor, font } = ctx;
  const after = ptToDxa(config.itemAfter);
  const threshold = ctx.config.compactThreshold ?? 6;

  // 动态栏目默认使用 pipe 样式，达到 compactThreshold 自动切换 tags
  const useTags = allItems.length >= threshold;

  if (useTags) {
    blocks.push(buildTags(allItems, ctx));
  } else {
    blocks.push(makePara(
      [makeRun(allItems.join('  |  '), ctx)],
      ctx,
      { spacing: { after } }
    ));
  }

  return blocks;
}

/**
 * 渲染 text-item 类型的动态栏目
 * 样式参考 renderEvaluation：纯文本段落
 */
function renderDynamicTextSection(
  section: ResumeSection,
  title: string,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const textItems = section.items as ResumeTextItem[];
  const content = textItems.map((i) => i.content).filter(Boolean).join('\n');
  if (!content) return blocks;

  addSectionTitle(title, ctx, blocks);

  const paragraphs = content.split('\n').filter(Boolean);
  for (let i = 0; i < paragraphs.length; i++) {
    const isLast = i === paragraphs.length - 1;
    blocks.push(makePara(
      [makeRun(paragraphs[i], ctx)],
      ctx,
      { spacing: { after: isLast ? ptToDxa(ctx.config.itemAfter) : ptToDxa(ctx.config.bulletAfter) }, keepLines: true }
    ));
  }

  return blocks;
}

// ============================================
// Section 渲染分发器
// ============================================

function renderSection(sectionId: string, data: ResumeData, ctx: StyleContext): DocxBlock[] {
  // 优先从 data.sections 中查找对应 id 的 section
  const sections = ensureSections(data);
  const section = sections.find((s) => s.id === sectionId);

  // 如果找到动态 section（非 legacy 类型），根据 itemType 渲染
  if (section && !ALL_SECTION_TYPES.includes(sectionId as SectionType)) {
    const title = section.title || sectionId;
    switch (section.itemType) {
      case 'experience-item':
        return renderDynamicExperienceSection(section, title, ctx);
      case 'list-item':
        return renderDynamicListSection(section, title, ctx);
      case 'text-item':
        return renderDynamicTextSection(section, title, ctx);
      default:
        return [];
    }
  }

  // Legacy 情况：已知 SectionType 走原来的 switch 逻辑
  switch (sectionId as SectionType) {
    case 'education':
      return renderEducation(data, ctx);
    case 'experience':
      return renderExperience(data, ctx);
    case 'projects':
      return renderProjects(data, ctx);
    case 'skills':
      return data.skills?.length ? renderListContent(data.skills, 'skills', ctx) : [];
    case 'certificates':
      return data.certificates?.length ? renderListContent(data.certificates, 'certificates', ctx) : [];
    case 'languages':
      return data.languages?.length ? renderListContent(data.languages, 'languages', ctx) : [];
    case 'evaluation':
      return renderEvaluation(data, ctx);
    default:
      return [];
  }
}

// ============================================
// 单栏 Header（姓名 + 联系方式 + 基础信息）
// ============================================

function renderHeader(data: ResumeData, ctx: StyleContext): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const { config, font } = ctx;
  const { personalInfo } = data;

  const nameSize = ptToHalfPt(config.nameFontSize);
  const align = config.nameAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
  const nameColor = config.nameColor ?? '1D1D1F';
  const statusColor = config.currentStatusColor ?? '86868B';
  const contactColor = config.contactInfoColor ?? '86868B';
  const contactSep = config.contactInfoSeparator ?? '  |  ';

  paragraphs.push(makePara(
    [makeRun(personalInfo.name, ctx, { bold: config.nameBold, size: nameSize, color: nameColor })],
    ctx,
    { spacing: { after: ptToDxa(3) }, alignment: align, keepNext: true }
  ));

  if (personalInfo.currentStatus) {
    paragraphs.push(makePara(
      [makeRun(personalInfo.currentStatus, ctx, { size: ptToHalfPt(config.bodyFontSize), color: statusColor })],
      ctx,
      { spacing: { after: ptToDxa(3) }, keepNext: true }
    ));
  }

  const contactParts: string[] = [];
  if (personalInfo.phone) contactParts.push(personalInfo.phone);
  if (personalInfo.email) contactParts.push(personalInfo.email);
  if (personalInfo.hometown) contactParts.push(personalInfo.hometown);

  if (contactParts.length > 0) {
    paragraphs.push(makePara(
      [makeRun(contactParts.join(contactSep), ctx, { size: ptToHalfPt(config.bodyFontSize), color: contactColor })],
      ctx,
      { spacing: { after: ptToDxa(3) }, keepNext: true }
    ));
  }

  if (config.showBasicInfo !== false) {
    const basicInfoItems = [
      { label: '性别', value: personalInfo.gender },
      { label: '民族', value: personalInfo.ethnicity },
      { label: '政治面貌', value: personalInfo.politicalStatus },
      { label: '毕业院校', value: personalInfo.school },
      { label: '专业', value: personalInfo.major },
      { label: '学历', value: personalInfo.degree },
      { label: '英语成绩', value: personalInfo.englishScore },
      { label: '年龄', value: personalInfo.age },
    ].filter((item) => item.value);

    if (basicInfoItems.length > 0) {
      const border = config.headerBorderWidth > 0
        ? { bottom: { style: BorderStyle.SINGLE, size: ptToBorderSize(config.headerBorderWidth), color: config.headerBorderColor } }
        : undefined;

      paragraphs.push(makePara(
        [makeRun(basicInfoItems.map((item) => `${item.label}：${item.value}`).join('  |  '), ctx,
          { size: ptToHalfPt(config.bodyFontSize), color: '585858' })],
        ctx,
        { spacing: { after: ptToDxa(config.headerAfter) }, border }
      ));
    }
  } else if (config.headerBorderWidth > 0) {
    paragraphs.push(makePara(
      [],
      ctx,
      { spacing: { after: ptToDxa(config.headerAfter) },
        border: { bottom: { style: BorderStyle.SINGLE, size: ptToBorderSize(config.headerBorderWidth), color: config.headerBorderColor } }
      }
    ));
  }

  return paragraphs;
}

// ============================================
// 双栏 Sidebar 个人信息
// ============================================

function renderSidebarPersonalInfo(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const { config, primaryColor, font } = ctx;
  const { personalInfo } = data;

  const nameSize = ptToHalfPt(config.nameFontSize);
  const align = config.nameAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
  const nameColor = config.sidebarNameColor ? resolveColor(config.sidebarNameColor) : primaryColor;

  blocks.push(makePara(
    [makeRun(personalInfo.name, ctx, { bold: config.nameBold, size: nameSize, color: nameColor })],
    ctx,
    { spacing: { after: ptToDxa(4) }, alignment: align, keepNext: true }
  ));

  if (personalInfo.currentStatus && config.sidebarShowCurrentStatus !== false) {
    blocks.push(makePara(
      [makeRun(personalInfo.currentStatus, ctx, { size: ptToHalfPt(config.bodyFontSize), color: '86868B' })],
      ctx,
      { spacing: { after: ptToDxa(8) }, alignment: align, keepNext: true }
    ));
  }

  const contactItems = [
    { label: '电话', value: personalInfo.phone },
    { label: '邮箱', value: personalInfo.email },
    { label: '籍贯', value: personalInfo.hometown },
  ].filter((item) => item.value);

  if (contactItems.length > 0) {
    addSectionTitle('联系方式', ctx, blocks);
    const labelSize = ptToHalfPt(config.sidebarLabelFontSize ?? config.bodyFontSize);
    const valueSize = ptToHalfPt(config.sidebarBodyFontSize ?? config.bodyFontSize);
    for (const item of contactItems) {
      blocks.push(makePara(
        [
          makeRun(`${item.label}: `, ctx, { size: labelSize, color: '86868B' }),
          makeRun(item.value!, ctx, { size: valueSize }),
        ],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepLines: true }
      ));
    }
    blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(4) } }));
  }

  const basicItems = [
    { label: '性别', value: personalInfo.gender },
    { label: '民族', value: personalInfo.ethnicity },
    { label: '政治面貌', value: personalInfo.politicalStatus },
    { label: '年龄', value: personalInfo.age },
    { label: '毕业院校', value: personalInfo.school },
    { label: '专业', value: personalInfo.major },
    { label: '学历', value: personalInfo.degree },
    { label: '英语成绩', value: personalInfo.englishScore },
  ].filter((item) => item.value);

  if (basicItems.length > 0) {
    addSectionTitle('基本信息', ctx, blocks);
    const labelSize = ptToHalfPt(config.sidebarLabelFontSize ?? config.bodyFontSize);
    const valueSize = ptToHalfPt(config.sidebarBodyFontSize ?? config.bodyFontSize);
    for (const item of basicItems) {
      blocks.push(makePara(
        [
          makeRun(`${item.label}: `, ctx, { size: labelSize, color: '86868B' }),
          makeRun(item.value!, ctx, { size: valueSize }),
        ],
        ctx,
        { spacing: { after: ptToDxa(2) }, keepLines: true }
      ));
    }
    blocks.push(makePara([], ctx, { spacing: { after: ptToDxa(4) } }));
  }

  return blocks;
}

// ============================================
// 双栏 Main Header（可选姓名 + 身份）
// ============================================

function renderMainHeader(data: ResumeData, ctx: StyleContext): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  if (!ctx.config.showNameInMain) return blocks;

  const { config, font } = ctx;
  const { personalInfo } = data;
  const nameSize = ptToHalfPt(ctx.config.mainNameFontSize ?? ctx.config.nameFontSize);
  const nameBold = ctx.config.mainNameBold ?? false;

  blocks.push(makePara(
    [makeRun(personalInfo.name, ctx, { bold: nameBold, size: nameSize, color: '333333' })],
    ctx,
    { spacing: { after: ptToDxa(2) }, keepNext: true }
  ));

  if (personalInfo.currentStatus) {
    blocks.push(makePara(
      [makeRun(personalInfo.currentStatus || '求职者', ctx, { size: ptToHalfPt(config.bodyFontSize), color: '666666' })],
      ctx,
      { spacing: { after: ptToDxa(8) }, keepNext: true }
    ));
  }

  return blocks;
}

// ============================================
// 双栏布局：侧边栏内容
// ============================================

function buildSidebarContent(
  data: ResumeData,
  layout: NormalizedLayout,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const sidebarCtx: StyleContext = {
    ...ctx,
    config: getSidebarLayout(ctx.config),
  };

  for (const section of layout.sidebarSections) {
    if (section === 'personalInfo') {
      blocks.push(...renderSidebarPersonalInfo(data, sidebarCtx));
    } else {
      blocks.push(...renderSection(section, data, sidebarCtx));
    }
  }

  return blocks;
}

// ============================================
// 双栏布局：主体内容
// ============================================

function buildMainContent(
  data: ResumeData,
  layout: NormalizedLayout,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];

  blocks.push(...renderMainHeader(data, ctx));

  for (const section of layout.mainSections) {
    if (section === 'personalInfo') continue;
    blocks.push(...renderSection(section, data, ctx));
  }

  return blocks;
}

// ============================================
// 单栏布局：完整内容
// ============================================

function buildSingleColumnContent(
  data: ResumeData,
  layout: NormalizedLayout,
  ctx: StyleContext
): DocxBlock[] {
  const blocks: DocxBlock[] = [];

  if (layout.mainSections.includes('personalInfo')) {
    const headerBlocks = renderHeader(data, ctx);
    const accentColor = ctx.config.accentBarColor;
    const accentWidth = ctx.config.accentBarWidth ?? 6;

    if (accentColor) {
      // 模板有竖向 accent bar（如 campus 模板）：用表格实现
      const accentTable = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [],
                width: { size: accentWidth, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: accentColor, fill: accentColor },
                borders: NO_BORDERS,
              }),
              new TableCell({
                children: headerBlocks,
                width: { size: 100 - accentWidth, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: NO_BORDERS,
                margins: {
                  top: mmToDxa(2),
                  bottom: mmToDxa(2),
                  left: mmToDxa(4),
                  right: mmToDxa(2),
                },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
      });
      blocks.push(accentTable);
    } else {
      blocks.push(...headerBlocks);
    }
  }

  for (const section of layout.mainSections) {
    if (section === 'personalInfo') continue;
    blocks.push(...renderSection(section, data, ctx));
  }

  return blocks;
}

// ============================================
// A4 页面属性
// ============================================

function buildPageProperties(config: DocxLayoutConfig) {
  const m = config.pageMargins;
  return {
    page: {
      size: {
        width: mmToDxa(210),
        height: mmToDxa(297),
      },
      margin: {
        top: mmToDxa(m.top),
        bottom: mmToDxa(m.bottom),
        left: mmToDxa(m.left),
        right: mmToDxa(m.right),
      },
    },
  };
}

// ============================================
// 文档级默认样式 — Global Document Typography Contract
// ============================================

/**
 * 文档级默认样式：确保所有 run（包括未来新增模板）都继承统一规则。
 *
 * 关键规则：
 * - italics: false — 全局禁止斜体，不可绕过
 * - font — 模板配置的字体，确保中英文一致
 * - size — 模板配置的正文字号
 *
 * 这是最后一道防线：即使新增模板的 render 代码忘记设置 italics: false，
 * 文档级默认样式也会强制覆盖。
 */
function buildDocumentStyles(ctx: StyleContext) {
  return {
    default: {
      document: {
        run: {
          italics: false,
          font: ctx.config.fontFamily ?? ctx.font,
          size: ptToHalfPt(ctx.config.bodyFontSize),
        },
        paragraph: {
          spacing: {
            line: lineHeightToDxa(ctx.config.bodyLineHeight),
            lineRule: LineRuleType.AUTO,
          },
        },
      },
    },
  };
}

// ============================================
// 主导出函数
// ============================================

export async function exportDocx(
  data: ResumeData,
  templateId: TemplateId,
  filename: string = '简历'
): Promise<Blob> {
  const plugin = getTemplate(templateId) ?? getTemplate('modern');
  if (!plugin) {
    throw new Error('[DOCX Export] No template available');
  }

  const config = getDocxLayout(templateId);
  const layout = buildNormalizedLayout(data, plugin);
  const pageProps = buildPageProperties(config);

  const ctx: StyleContext = {
    config,
    primaryColor: plugin.style.primaryColor.replace('#', ''),
    font: plugin.style.font,
    skillBg: plugin.style.skillBg,
    skillColor: plugin.style.skillColor,
    policy: plugin.exportPolicy ?? DEFAULT_EXPORT_POLICY,
    isChinese: isChineseResume(data),
  };

  let doc: Document;

  if (layout.layout.type === 'two-column' && layout.layout.sidebar) {
    const sidebarBlocks = buildSidebarContent(data, layout, ctx);
    const mainBlocks = buildMainContent(data, layout, ctx);

    const sidebarWidth = layout.layout.sidebar.width;
    const mainWidth = 100 - sidebarWidth;
    const bgColor = layout.layout.sidebar.bgColor;
    const sidebarPad = config.sidebarPadding ?? 6;
    const mainPad = config.mainPadding ?? 6;

    const twoColumnTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: sidebarBlocks,
              width: { size: sidebarWidth, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.TOP,
              shading: bgColor ? {
                type: ShadingType.SOLID,
                color: bgColor,
                fill: bgColor,
              } : undefined,
              margins: {
                top: mmToDxa(sidebarPad),
                bottom: mmToDxa(sidebarPad),
                left: mmToDxa(sidebarPad),
                right: mmToDxa(sidebarPad),
              },
            }),
            new TableCell({
              children: mainBlocks,
              width: { size: mainWidth, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.TOP,
              margins: {
                top: mmToDxa(mainPad),
                bottom: mmToDxa(mainPad),
                left: mmToDxa(mainPad),
                right: mmToDxa(mainPad),
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
    });

    doc = new Document({
      styles: buildDocumentStyles(ctx),
      sections: [
        {
          properties: pageProps,
          children: [twoColumnTable],
        },
      ],
    });
  } else {
    const blocks = buildSingleColumnContent(data, layout, ctx);

    doc = new Document({
      styles: buildDocumentStyles(ctx),
      sections: [
        {
          properties: pageProps,
          children: blocks,
        },
      ],
    });
  }

  const blob = await Packer.toBlob(doc);
  return blob;
}
