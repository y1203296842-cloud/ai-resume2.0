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
    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[9pt]">
      {items.map((item) => (
        <div key={item.label} className="inline-flex" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span className="text-[#86868b] flex-shrink-0">{item.label}：</span>
          <span className="text-[#3a3a3c]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

const campusConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '10.5pt', fontWeight: 600, color: '#1d1d1f', borderBottom: '1px solid #0071e3', paddingBottom: '4px', marginBottom: '6px' },
  itemTitleStyle: { fontSize: '10.5pt', fontWeight: 600, color: '#1d1d1f' },
  subtitleStyle: { fontSize: '9.5pt', color: '#3a3a3c' },
  dateStyle: { fontSize: '8.5pt', color: '#86868b' },
  bulletStyle: { fontSize: '9.5pt', color: '#3a3a3c' },
  bulletMarker: '•',
  bulletMarkerColor: '#0071e3',
  metaStyle: { fontSize: '8pt', color: '#0071e3' },
  listRenderMode: 'pipe',
  listRenderModeOverrides: { skills: 'tags' },
  tagStyle: { backgroundColor: '#f0f5ff', color: '#0071e3', fontSize: '9pt', border: '1px solid #d0e0ff' },
  textStyle: { fontSize: '9.5pt', color: '#3a3a3c', lineHeight: 1.6 },
  sectionGap: '14px',
  itemGap: '12px',
};

export function CampusTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;

  return (
    <div className="resume-content font-sans text-[#2c2c2e] bg-white" style={{ width: '210mm', minHeight: '297mm', fontSize: '10pt', lineHeight: '1.55' }}>
      <div className="flex">
        <div className="w-[6mm] bg-[#0071e3] flex-shrink-0" />
        <div className="flex-1 px-5 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22pt] font-semibold text-[#1d1d1f] tracking-tight mb-1.5">
                {personalInfo.name || '\u00A0'}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[9pt] text-[#86868b]">
                {personalInfo.phone && <span>{personalInfo.phone}</span>}
                {personalInfo.email && <span>{personalInfo.email}</span>}
              </div>
            </div>
            <div className="w-[32mm] h-[40mm] border-2 border-[#0071e3] rounded-lg flex items-center justify-center bg-[#f0f5ff] flex-shrink-0 ml-4">
              <span className="text-[8pt] text-[#0071e3]">照片</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <BasicInfoGrid data={data} />
        <DynamicSectionsRenderer
          data={data}
          config={campusConfig}
          excludeSectionIds={['personalInfo']}
        />
      </div>
    </div>
  );
}
