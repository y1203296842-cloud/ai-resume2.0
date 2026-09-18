import type { ResumeData } from '@/lib/types';
import { isChineseResume } from './sectionTitles';
import { DynamicSectionsRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';

interface ResumeTemplateProps {
  data: ResumeData;
}

/** 基础信息网格 - 互联网简洁风 */
function BasicInfoGrid({ data }: { data: ResumeData }) {
  const { personalInfo } = data;
  const items = [
    { label: '性别', value: personalInfo.gender },
    { label: '民族', value: personalInfo.ethnicity },
    { label: '政治面貌', value: personalInfo.politicalStatus },
    { label: '籍贯', value: personalInfo.hometown },
    { label: '毕业院校', value: personalInfo.school },
    { label: '专业', value: personalInfo.major },
    { label: '学历', value: personalInfo.degree },
    { label: '英语成绩', value: personalInfo.englishScore },
    { label: '年龄', value: personalInfo.age },
  ].filter((item) => item.value);

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[9pt]">
      {items.map((item) => (
        <div key={item.label} className="inline-flex" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span className="text-[#86868b] flex-shrink-0">{item.label}：</span>
          <span className="text-[#3a3a3c]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

const modernSectionConfig: SectionRenderConfig = {
  titleStyle: {
    fontSize: '10.5pt',
    fontWeight: 500,
    color: '#1d1d1f',
    borderBottom: '1px solid #e5e5e7',
    paddingBottom: '4px',
    marginBottom: '8px',
  },
  itemTitleStyle: {
    fontSize: '10.5pt',
    fontWeight: 500,
    color: '#1d1d1f',
  },
  subtitleStyle: {
    fontSize: '9.5pt',
    color: '#3a3a3c',
  },
  dateStyle: {
    fontSize: '8.5pt',
    color: '#86868b',
  },
  bulletStyle: {
    fontSize: '9.5pt',
    color: '#3a3a3c',
  },
  bulletMarkerColor: '#0071e3',
  bulletMarker: '•',
  metaStyle: {
    fontSize: '8pt',
    color: '#0071e3',
  },
  listRenderMode: 'pipe',
  listRenderModeOverrides: {
    skills: 'tags',
  },
  tagStyle: {
    backgroundColor: '#f5f5f7',
    color: '#3a3a3c',
    fontSize: '9pt',
  },
  textStyle: {
    fontSize: '9.5pt',
    color: '#3a3a3c',
    lineHeight: 1.6,
  },
  sectionGap: '16px',
  itemGap: '12px',
};

/**
 * 模板1：互联网简洁风
 * 适合互联网/科技行业，简洁现代
 *
 * 使用动态栏目渲染：所有栏目通过 GenericSectionRenderer 统一渲染，
 * 模板仅负责 header 和整体布局。
 */
export function ModernTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;

  return (
    <div className="resume-content font-sans text-[#1d1d1f] bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '16mm 18mm', fontSize: '10pt', lineHeight: '1.5' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-[#e5e5e7]">
        <div className="flex-1">
          <h1 className="text-[22pt] font-light tracking-tight text-[#1d1d1f] mb-1.5">
            {personalInfo.name || '\u00A0'}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[9pt] text-[#86868b]">
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.email && <span>{personalInfo.email}</span>}
          </div>
        </div>
        {/* Photo placeholder */}
        <div className="w-[33mm] h-[42mm] border border-[#e5e5e7] rounded-md flex items-center justify-center bg-[#fafafa] flex-shrink-0 ml-4">
          <span className="text-[8pt] text-[#c7c7cc]">照片</span>
        </div>
      </div>

      {/* Basic Info Grid */}
      <BasicInfoGrid data={data} />

      {/* Dynamic Sections — 所有栏目通过 GenericSectionRenderer 统一渲染 */}
      <DynamicSectionsRenderer
        data={data}
        config={modernSectionConfig}
        excludeSectionIds={['personalInfo']}
      />
    </div>
  );
}
