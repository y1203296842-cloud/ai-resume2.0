import type { ResumeData } from '@/lib/types';
import { DynamicSectionsRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';

interface ResumeTemplateProps {
  data: ResumeData;
}

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
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[9pt]">
      {items.map((item) => (
        <div key={item.label} className="inline-flex" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span className="text-[#666] flex-shrink-0">{item.label}：</span>
          <span className="text-[#3a3a3c]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

const businessConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '11pt', fontWeight: 700, color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', paddingBottom: '4px', marginBottom: '8px' },
  itemTitleStyle: { fontSize: '10.5pt', fontWeight: 700, color: '#1a1a1a' },
  subtitleStyle: { fontSize: '9.5pt', color: '#4a4a4a' },
  dateStyle: { fontSize: '8.5pt', color: '#666' },
  bulletStyle: { fontSize: '9.5pt', color: '#3a3a3c' },
  bulletMarker: '•',
  bulletMarkerColor: '#1a1a1a',
  metaStyle: { fontSize: '8pt', color: '#666' },
  listRenderMode: 'pipe',
  listRenderModeOverrides: { skills: 'slash' },
  textStyle: { fontSize: '9.5pt', color: '#3a3a3c', lineHeight: 1.6 },
  sectionGap: '16px',
  itemGap: '14px',
};

export function BusinessTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;

  return (
    <div className="resume-content font-serif text-[#1a1a1a] bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '16mm 20mm', fontSize: '10pt', lineHeight: '1.6' }}>
      <div className="text-center mb-3 pb-3 border-b-2 border-[#1a1a1a]">
        <h1 className="text-[24pt] font-normal tracking-wide text-[#1a1a1a] mb-2">
          {personalInfo.name || '\u00A0'}
        </h1>
        <div className="flex justify-center flex-wrap gap-x-5 gap-y-0.5 text-[9pt] text-[#4a4a4a]">
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.email && <span>{personalInfo.email}</span>}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <BasicInfoGrid data={data} />
        </div>
        <div className="w-[30mm] h-[38mm] border border-[#ccc] flex items-center justify-center bg-[#fafafa] flex-shrink-0 self-start">
          <span className="text-[8pt] text-[#999]">照片</span>
        </div>
      </div>

      <DynamicSectionsRenderer
        data={data}
        config={businessConfig}
        excludeSectionIds={['personalInfo']}
      />
    </div>
  );
}
