/**
 * Fallback Sections — 全局兜底栏目渲染
 *
 * 当模板的 supportedSections 不包含某个栏目，但 ResumeData 中该栏目有数据时，
 * 此组件以统一的通用样式渲染该栏目，确保用户数据不会在 Preview/PDF 中丢失。
 *
 * 这不是"第二套渲染系统"——它只在模板不原生支持某栏目时激活。
 * 现有模板全部声明了 ALL_SECTION_TYPES，因此不会触发 fallback，视觉零影响。
 *
 * 支持两类 fallback：
 * 1. 固定栏目 fallback：旧版固定字段（education/experience/projects 等）模板不支持时
 * 2. 动态栏目 fallback：ResumeData.sections 中 id 不在 ALL_SECTION_TYPES 中的动态栏目
 *
 * DOCX 路径的 fallback 由 layoutModel.ts + rules.ts 处理（已存在）。
 * 此组件补齐 Preview/PDF 路径的 fallback 缺口。
 */

import type { ResumeData, ResumeSection, ResumeSectionItem } from '@/lib/types';
import type { SectionType } from './types';
import { ALL_SECTION_TYPES } from './types';
import { isChineseResume, getSectionTitle } from './sectionTitles';
import { ensureEvaluationLast } from './rules';

interface FallbackSectionsProps {
  data: ResumeData;
  sections: SectionType[];
  /** 可选：栏目标题的自定义 className（用于与模板视觉风格一致） */
  sectionTitleClassName?: string;
  /** 可选：栏目容器的自定义 className */
  sectionContainerClassName?: string;
}

export function FallbackSections({
  data,
  sections,
  sectionTitleClassName,
  sectionContainerClassName,
}: FallbackSectionsProps) {
  const isChinese = isChineseResume(data);

  // 从 data.sections 中提取动态 fallback 栏目（id 不在 ALL_SECTION_TYPES 中）
  const dynamicSections = getDynamicFallbackSections(data);

  // 合并固定 fallback 栏目和动态 fallback 栏目
  // 固定栏目用原有的 SectionType，动态栏目直接用 ResumeSection
  const allFallbacks = [...sections, ...dynamicSections.map((s) => s.id as SectionType)];

  if (allFallbacks.length === 0 && dynamicSections.length === 0) return null;

  const ordered = ensureEvaluationLast(allFallbacks);

  return (
    <div className="fallback-sections" style={{ fontSize: '10pt', lineHeight: 1.5, color: '#1d1d1f' }}>
      {ordered.map((sectionId) => {
        // 检查是否是动态栏目
        const dynamicSection = dynamicSections.find((s) => s.id === sectionId);
        if (dynamicSection) {
          return (
            <DynamicFallbackSection
              key={dynamicSection.id}
              section={dynamicSection}
              sectionTitleClassName={sectionTitleClassName}
              sectionContainerClassName={sectionContainerClassName}
            />
          );
        }
        // 固定栏目 fallback（原有逻辑）
        if (ALL_SECTION_TYPES.includes(sectionId as SectionType)) {
          return (
            <FallbackSection
              key={sectionId}
              section={sectionId as SectionType}
              data={data}
              isChinese={isChinese}
              sectionTitleClassName={sectionTitleClassName}
              sectionContainerClassName={sectionContainerClassName}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

/**
 * 从 ResumeData.sections 中找出需要 fallback 渲染的动态栏目
 * 即 id 不在 ALL_SECTION_TYPES 中的栏目
 */
function getDynamicFallbackSections(data: ResumeData): ResumeSection[] {
  if (!data.sections || data.sections.length === 0) return [];

  // 同时也排除掉在固定字段中已有对应数据的栏目（避免重复渲染）
  const allKnownIds = new Set<string>(ALL_SECTION_TYPES);

  return data.sections.filter(
    (s) => !allKnownIds.has(s.id) && hasSectionContent(s)
  );
}

/**
 * 检查一个动态 section 是否有实际内容
 */
function hasSectionContent(section: ResumeSection): boolean {
  if (!section.items || section.items.length === 0) return false;

  for (const item of section.items) {
    switch (item.type) {
      case 'experience-item':
        if (item.title || (item.description && item.description.length > 0)) return true;
        break;
      case 'list-item':
        if (item.items && item.items.length > 0) return true;
        break;
      case 'text-item':
        if (item.content && item.content.trim().length > 0) return true;
        break;
    }
  }
  return false;
}

// ============================================
// 动态栏目 Fallback 渲染
// ============================================

function DynamicFallbackSection({
  section,
  sectionTitleClassName,
  sectionContainerClassName,
}: {
  section: ResumeSection;
  sectionTitleClassName?: string;
  sectionContainerClassName?: string;
}) {
  return (
    <div
      className={sectionContainerClassName}
      style={{ marginBottom: '8px' }}
    >
      <h3
        className={sectionTitleClassName}
        style={{
          fontSize: '11pt',
          fontWeight: 600,
          borderBottom: '1px solid #d1d1d6',
          paddingBottom: '3px',
          marginBottom: '5px',
          color: '#1d1d1f',
        }}
      >
        {section.title}
      </h3>
      <DynamicFallbackContent section={section} />
    </div>
  );
}

function DynamicFallbackContent({ section }: { section: ResumeSection }) {
  switch (section.itemType) {
    case 'experience-item':
      return <DynamicExperienceItems items={section.items as ResumeSectionItem[]} />;
    case 'list-item':
      return <DynamicListItems items={section.items as ResumeSectionItem[]} />;
    case 'text-item':
      return <DynamicTextItems items={section.items as ResumeSectionItem[]} />;
    default:
      return null;
  }
}

function DynamicExperienceItems({ items }: { items: ResumeSectionItem[] }) {
  const expItems = items.filter((i): i is Extract<ResumeSectionItem, { type: 'experience-item' }> => i.type === 'experience-item');

  return (
    <>
      {expItems.map((item, i) => (
        <div key={i} style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 500 }}>
              {item.title}
              {item.subtitle ? ` — ${item.subtitle}` : ''}
            </span>
            {(item.startDate || item.endDate) && (
              <span style={{ fontSize: '8.5pt', color: '#86868b' }}>
                {item.startDate || ''} - {item.endDate || ''}
              </span>
            )}
          </div>
          {item.meta && (
            <div style={{ fontSize: '8.5pt', color: '#86868b', marginTop: '2px' }}>{item.meta}</div>
          )}
          {item.description && item.description.length > 0 && (
            <div style={{ marginTop: '3px' }}>
              {item.description.map((d, j) => (
                <div key={j} style={{ fontSize: '9.5pt', color: '#555', paddingLeft: '8px' }}>
                  • {d}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function DynamicListItems({ items }: { items: ResumeSectionItem[] }) {
  const listItems = items.filter((i): i is Extract<ResumeSectionItem, { type: 'list-item' }> => i.type === 'list-item');
  const allItems = listItems.flatMap((li) => li.items);

  if (allItems.length === 0) return null;

  // 条目较少时用分隔符，较多时用标签式
  if (allItems.length <= 5) {
    return (
      <div style={{ fontSize: '9.5pt', color: '#555' }}>
        {allItems.join(' | ')}
      </div>
    );
  }

  // 多标签式排列
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '9pt' }}>
      {allItems.map((item, i) => (
        <span
          key={i}
          style={{
            padding: '2px 8px',
            backgroundColor: '#f5f5f7',
            borderRadius: '4px',
            color: '#555',
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function DynamicTextItems({ items }: { items: ResumeSectionItem[] }) {
  const textItems = items.filter((i): i is Extract<ResumeSectionItem, { type: 'text-item' }> => i.type === 'text-item');

  return (
    <>
      {textItems.map((item, i) => (
        <p key={i} style={{ fontSize: '9.5pt', color: '#555', margin: 0, marginBottom: i < textItems.length - 1 ? '4px' : 0 }}>
          {item.content}
        </p>
      ))}
    </>
  );
}

// ============================================
// 固定栏目 Fallback 渲染（原有逻辑，保留兼容）
// ============================================

function FallbackSection({
  section,
  data,
  isChinese,
  sectionTitleClassName,
  sectionContainerClassName,
}: {
  section: SectionType;
  data: ResumeData;
  isChinese: boolean;
  sectionTitleClassName?: string;
  sectionContainerClassName?: string;
}) {
  const title = getSectionTitle(section, isChinese);

  return (
    <div className={sectionContainerClassName} style={{ marginBottom: '8px' }}>
      <h3
        className={sectionTitleClassName}
        style={{
          fontSize: '11pt',
          fontWeight: 600,
          borderBottom: '1px solid #d1d1d6',
          paddingBottom: '3px',
          marginBottom: '5px',
          color: '#1d1d1f',
        }}
      >
        {title}
      </h3>
      <FallbackContent section={section} data={data} />
    </div>
  );
}

function FallbackContent({ section, data }: { section: SectionType; data: ResumeData }) {
  switch (section) {
    case 'education':
      return (
        <>
          {data.education!.map((edu, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 500 }}>{edu.school}</span>
                <span style={{ fontSize: '8.5pt', color: '#86868b' }}>
                  {edu.startDate} - {edu.endDate}
                </span>
              </div>
              <div style={{ fontSize: '9.5pt', color: '#555' }}>
                {[edu.degree, edu.major].filter(Boolean).join(' | ')}
              </div>
              {edu.gpa && <div style={{ fontSize: '9pt', color: '#86868b' }}>GPA: {edu.gpa}</div>}
              {edu.description && <div style={{ fontSize: '9.5pt', color: '#555' }}>{edu.description}</div>}
            </div>
          ))}
        </>
      );

    case 'experience':
      return (
        <>
          {data.experience!.map((exp, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 500 }}>{exp.company} — {exp.position}</span>
                <span style={{ fontSize: '8.5pt', color: '#86868b' }}>
                  {exp.startDate} - {exp.endDate}
                </span>
              </div>
              {exp.description.map((d, j) => (
                <div key={j} style={{ fontSize: '9.5pt', color: '#555', paddingLeft: '8px' }}>• {d}</div>
              ))}
            </div>
          ))}
        </>
      );

    case 'projects':
      return (
        <>
          {data.projects!.map((proj, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 500 }}>
                  {proj.name}
                  {proj.role ? ` — ${proj.role}` : ''}
                </span>
                {proj.techStack && (
                  <span style={{ fontSize: '8.5pt', color: '#86868b' }}>{proj.techStack}</span>
                )}
              </div>
              {proj.description.map((d, j) => (
                <div key={j} style={{ fontSize: '9.5pt', color: '#555', paddingLeft: '8px' }}>• {d}</div>
              ))}
            </div>
          ))}
        </>
      );

    case 'skills':
      return (
        <div style={{ fontSize: '9.5pt', color: '#555' }}>
          {data.skills!.join(' | ')}
        </div>
      );

    case 'certificates':
      return (
        <div style={{ fontSize: '9.5pt', color: '#555' }}>
          {data.certificates!.join(' | ')}
        </div>
      );

    case 'languages':
      return (
        <div style={{ fontSize: '9.5pt', color: '#555' }}>
          {data.languages!.join(' | ')}
        </div>
      );

    case 'evaluation':
      return (
        <p style={{ fontSize: '9.5pt', color: '#555', margin: 0 }}>{data.evaluation}</p>
      );

    default:
      return null;
  }
}
