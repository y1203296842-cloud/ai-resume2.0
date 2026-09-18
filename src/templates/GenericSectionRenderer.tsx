/**
 * GenericSectionRenderer — 通用动态栏目渲染器
 *
 * 核心职责：
 * 根据 ResumeSection 的 itemType 统一渲染任意栏目（已知和动态），
 * 应用模板提供的视觉样式。
 *
 * 渲染规则：
 * - experience-item: 标题 + 副标题 + 时间 + 描述要点 + meta
 * - list-item: 标签/管道符/列表点
 * - text-item: 段落文本
 *
 * 模板通过 SectionRenderConfig 提供视觉参数，
 * GenericSectionRenderer 负责按 itemType 渲染内容结构。
 *
 * 这确保了：模板适配栏目，而不是栏目适配模板。
 */

import type { ReactNode, CSSProperties } from 'react';
import type {
  ResumeData,
  ResumeSection,
  ResumeSectionItem,
  ResumeExperienceItem,
  ResumeListItem,
  ResumeTextItem,
} from '@/lib/types';
import { ensureSections, hasSectionContent } from '@/lib/sectionNormalizer';
import { resolveSectionTitle, isChineseResume } from './sectionTitles';

// ============================================
// 样式配置接口
// ============================================

export interface SectionRenderConfig {
  /** 栏目标题样式 */
  titleClassName?: string;
  titleStyle?: CSSProperties;
  /** 栏目容器样式 */
  containerClassName?: string;
  containerStyle?: CSSProperties;
  /** experience-item 标题样式 */
  itemTitleClassName?: string;
  itemTitleStyle?: CSSProperties;
  /** experience-item 副标题样式 */
  subtitleClassName?: string;
  subtitleStyle?: CSSProperties;
  /** 日期样式 */
  dateClassName?: string;
  dateStyle?: CSSProperties;
  /** 描述要点样式 */
  bulletClassName?: string;
  bulletStyle?: CSSProperties;
  bulletMarker?: string;
  bulletMarkerColor?: string;
  /** meta（技术栈等）样式 */
  metaClassName?: string;
  metaStyle?: CSSProperties;
  /** list-item 默认渲染样式 */
  listRenderMode?: 'tags' | 'pipe' | 'slash' | 'bullets';
  /** 按 section id 覆盖 list-item 渲染模式（如 skills→tags, certificates→pipe） */
  listRenderModeOverrides?: Record<string, 'tags' | 'pipe' | 'slash' | 'bullets'>;
  listClassName?: string;
  listStyle?: CSSProperties;
  tagClassName?: string;
  tagStyle?: CSSProperties;
  /** text-item 样式 */
  textClassName?: string;
  textStyle?: CSSProperties;
  /** 栏目间距 */
  sectionGap?: string;
  itemGap?: string;
}

interface GenericSectionRendererProps {
  section: ResumeSection;
  config: SectionRenderConfig;
  isChinese: boolean;
}

// ============================================
// 主组件
// ============================================

export function GenericSectionRenderer({
  section,
  config,
  isChinese,
}: GenericSectionRendererProps) {
  const title = resolveSectionTitle(section.id, isChinese, section.title);

  return (
    <div
      className={config.containerClassName}
      style={{ marginBottom: config.sectionGap ?? '12px', ...config.containerStyle }}
    >
      <h2
        className={config.titleClassName}
        style={{
          fontSize: '10.5pt',
          fontWeight: 600,
          marginBottom: '6px',
          paddingBottom: '3px',
          ...config.titleStyle,
        }}
      >
        {title}
      </h2>
      <SectionContent section={section} config={config} />
    </div>
  );
}

// ============================================
// 内容分发
// ============================================

function SectionContent({
  section,
  config,
}: {
  section: ResumeSection;
  config: SectionRenderConfig;
}) {
  // 按 item 自身的 type 渲染，而非 section.itemType
  // 这允许一个大栏目内部同时包含 experience-item（子标题+描述）和 list-item（列表内容）
  const experienceItems = section.items.filter(
    (i): i is ResumeExperienceItem => i.type === 'experience-item'
  );
  const listItems = section.items.filter(
    (i): i is ResumeListItem => i.type === 'list-item'
  );
  const textItems = section.items.filter(
    (i): i is ResumeTextItem => i.type === 'text-item'
  );

  return (
    <>
      {experienceItems.length > 0 && (
        <ExperienceItems items={experienceItems} config={config} />
      )}
      {listItems.length > 0 && (
        <ListItems items={listItems} config={config} sectionId={section.id} />
      )}
      {textItems.length > 0 && (
        <TextItems items={textItems} config={config} />
      )}
    </>
  );
}

// ============================================
// experience-item 渲染
// ============================================

function ExperienceItems({
  items,
  config,
}: {
  items: ResumeSectionItem[];
  config: SectionRenderConfig;
}) {
  const expItems = items.filter(
    (i): i is ResumeExperienceItem => i.type === 'experience-item'
  );

  return (
    <>
      {expItems.map((item, i) => (
        <div key={i} style={{ marginBottom: config.itemGap ?? '8px' }}>
          {/* 标题行：title + subtitle + date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                className={config.itemTitleClassName}
                style={{ fontWeight: 500, fontSize: '10.5pt', ...config.itemTitleStyle }}
              >
                {item.title}
              </span>
              {item.subtitle && (
                <span
                  className={config.subtitleClassName}
                  style={{ marginLeft: '6px', fontSize: '9.5pt', color: '#585858', ...config.subtitleStyle }}
                >
                  {item.subtitle}
                </span>
              )}
            </div>
            {(item.startDate || item.endDate) && (
              <span
                className={config.dateClassName}
                style={{ fontSize: '8.5pt', color: '#86868b', flexShrink: 0, marginLeft: '8px', ...config.dateStyle }}
              >
                {item.startDate || ''} - {item.endDate || '至今'}
              </span>
            )}
          </div>

          {/* meta（技术栈等） */}
          {item.meta && (
            <div
              className={config.metaClassName}
              style={{ fontSize: '8.5pt', color: '#86868b', marginTop: '2px', ...config.metaStyle }}
            >
              {item.meta}
            </div>
          )}

          {/* 描述要点 */}
          {item.description && item.description.length > 0 && (
            <div style={{ marginTop: '3px' }}>
              {item.description.map((desc, j) => (
                <div
                  key={j}
                  className={config.bulletClassName}
                  style={{
                    fontSize: '9.5pt',
                    color: '#3a3a3c',
                    paddingLeft: '8px',
                    position: 'relative',
                    ...config.bulletStyle,
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, color: config.bulletMarkerColor ?? '#0071e3' }}>
                    {config.bulletMarker ?? '•'}
                  </span>
                  {desc}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ============================================
// list-item 渲染
// ============================================

function ListItems({
  items,
  config,
  sectionId,
}: {
  items: ResumeSectionItem[];
  config: SectionRenderConfig;
  sectionId: string;
}) {
  const listItems = items.filter(
    (i): i is ResumeListItem => i.type === 'list-item'
  );
  const allItems = listItems.flatMap((li) => li.items).filter(Boolean);

  if (allItems.length === 0) return null;

  const mode = config.listRenderModeOverrides?.[sectionId] ?? config.listRenderMode ?? 'pipe';

  switch (mode) {
    case 'tags':
      return (
        <div
          className={config.listClassName}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', ...config.listStyle }}
        >
          {allItems.map((item, i) => (
            <span
              key={i}
              className={config.tagClassName}
              style={{
                padding: '2px 8px',
                backgroundColor: '#f5f5f7',
                borderRadius: '4px',
                fontSize: '9pt',
                color: '#3a3a3c',
                ...config.tagStyle,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      );

    case 'pipe':
      return (
        <div
          className={config.listClassName}
          style={{ fontSize: '9.5pt', color: '#3a3a3c', ...config.listStyle }}
        >
          {allItems.join(' | ')}
        </div>
      );

    case 'slash':
      return (
        <div
          className={config.listClassName}
          style={{ fontSize: '9.5pt', color: '#3a3a3c', ...config.listStyle }}
        >
          {allItems.join(' / ')}
        </div>
      );

    case 'bullets':
      return (
        <div className={config.listClassName} style={config.listStyle}>
          {allItems.map((item, i) => (
            <div
              key={i}
              className={config.bulletClassName}
              style={{
                fontSize: '9.5pt',
                color: '#3a3a3c',
                paddingLeft: '8px',
                position: 'relative',
                ...config.bulletStyle,
              }}
            >
              <span style={{ position: 'absolute', left: 0, color: config.bulletMarkerColor ?? '#0071e3' }}>
                {config.bulletMarker ?? '•'}
              </span>
              {item}
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

// ============================================
// text-item 渲染
// ============================================

function TextItems({
  items,
  config,
}: {
  items: ResumeSectionItem[];
  config: SectionRenderConfig;
}) {
  const textItems = items.filter(
    (i): i is ResumeTextItem => i.type === 'text-item'
  );

  return (
    <>
      {textItems.map((item, i) => (
        <p
          key={i}
          className={config.textClassName}
          style={{
            fontSize: '9.5pt',
            color: '#3a3a3c',
            lineHeight: 1.6,
            margin: 0,
            marginBottom: i < textItems.length - 1 ? '4px' : 0,
            ...config.textStyle,
          }}
        >
          {item.content}
        </p>
      ))}
    </>
  );
}

// ============================================
// 批量渲染：DynamicSectionsRenderer
// ============================================

interface DynamicSectionsRendererProps {
  data: ResumeData;
  config: SectionRenderConfig;
  /** 排除的栏目 id（如 personalInfo 由模板自行渲染） */
  excludeSectionIds?: string[];
  /** 仅渲染指定栏目 id（如果提供） */
  onlySectionIds?: string[];
}

/**
 * 批量渲染所有动态栏目
 * 模板使用此组件渲染 sections，自身只负责 header 和整体布局
 */
export function DynamicSectionsRenderer({
  data,
  config,
  excludeSectionIds,
  onlySectionIds,
}: DynamicSectionsRendererProps) {
  const sections = ensureSections(data);
  const isChinese = isChineseResume(data);

  const excludeSet = new Set(excludeSectionIds ?? []);
  const onlySet = onlySectionIds ? new Set(onlySectionIds) : null;

  const filtered = sections.filter((s) => {
    if (excludeSet.has(s.id)) return false;
    if (onlySet && !onlySet.has(s.id)) return false;
    if (!hasSectionContent(s)) return false;
    return true;
  });

  return (
    <>
      {filtered.map((section) => (
        <GenericSectionRenderer
          key={section.id}
          section={section}
          config={config}
          isChinese={isChinese}
        />
      ))}
    </>
  );
}
