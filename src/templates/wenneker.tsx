import type { ResumeData, ResumeSection } from '@/lib/types';
import { isChineseResume } from './sectionTitles';
import { ensureSections } from '@/lib/sectionNormalizer';
import { GenericSectionRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';

const SIDEBAR_COLOR = '#4A90D9';

const sidebarConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '10px', fontWeight: 600, color: SIDEBAR_COLOR, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${SIDEBAR_COLOR}`, paddingBottom: '4px', marginBottom: '8px' },
  itemTitleStyle: { fontSize: '9pt', fontWeight: 600, color: '#333' },
  subtitleStyle: { fontSize: '8pt', color: '#666' },
  dateStyle: { fontSize: '8pt', color: '#666' },
  bulletStyle: { fontSize: '9pt', color: '#333' },
  bulletMarker: '•',
  bulletMarkerColor: SIDEBAR_COLOR,
  listRenderMode: 'bullets',
  listRenderModeOverrides: { skills: 'bullets' },
  textStyle: { fontSize: '9pt', color: '#333', lineHeight: 1.6 },
  sectionGap: '20px',
  itemGap: '10px',
};

const mainConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '10pt', fontWeight: 600, color: SIDEBAR_COLOR, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${SIDEBAR_COLOR}`, paddingBottom: '6px', marginBottom: '10px' },
  itemTitleStyle: { fontSize: '10pt', fontWeight: 600, color: '#333' },
  subtitleStyle: { fontSize: '9pt', color: '#666' },
  dateStyle: { fontSize: '9pt', color: '#666' },
  bulletStyle: { fontSize: '9pt', color: '#333', lineHeight: 1.5 },
  bulletMarker: '•',
  bulletMarkerColor: SIDEBAR_COLOR,
  metaStyle: { fontSize: '9pt', color: '#666' },
  listRenderMode: 'bullets',
  listRenderModeOverrides: { skills: 'bullets', certificates: 'bullets', languages: 'bullets' },
  textStyle: { fontSize: '9pt', color: '#333', lineHeight: 1.6 },
  sectionGap: '16px',
  itemGap: '10px',
};

export function WennekerTemplate({ data }: { data: ResumeData }) {
  const { personalInfo } = data;
  const isChinese = isChineseResume(data);
  const allSections = ensureSections(data);

  const sidebarSections = allSections.filter(s =>
    s.id !== 'personalInfo' && s.id !== 'evaluation' &&
    (s.placement === 'sidebar' || ['skills', 'certificates', 'languages'].includes(s.id))
  );
  const mainSections = allSections.filter(s =>
    s.id !== 'personalInfo' &&
    (s.placement === 'main' || !['skills', 'certificates', 'languages'].includes(s.id))
  );

  return (
    <div className="flex min-h-[297mm] w-full font-sans text-[9pt] leading-[1.5] text-[#333]">
      {/* 左侧栏 */}
      <div className="w-[35%] bg-[#f5f7fa] p-6">
        {personalInfo.photo && (
          <div className="mx-auto mb-4 h-[150px] w-[120px] overflow-hidden rounded bg-[#e0e0e0]">
            <img src={personalInfo.photo} alt="照片" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mb-5 text-center text-lg font-semibold text-[#333]">
          {personalInfo.name}
        </div>

        {/* 联系方式 */}
        <div className="mb-5">
          <div className="mb-2 border-b-2 border-[#4A90D9] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4A90D9]">
            联系方式
          </div>
          {personalInfo.phone && (
            <div className="mb-1.5 text-[9px]">
              <div className="text-[8px] text-[#666]">电话</div>
              {personalInfo.phone}
            </div>
          )}
          {personalInfo.email && (
            <div className="mb-1.5 text-[9px]">
              <div className="text-[8px] text-[#666]">邮箱</div>
              {personalInfo.email}
            </div>
          )}
          {personalInfo.hometown && (
            <div className="mb-1.5 text-[9px]">
              <div className="text-[8px] text-[#666]">籍贯</div>
              {personalInfo.hometown}
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className="mb-5">
          <div className="mb-2 border-b-2 border-[#4A90D9] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4A90D9]">
            基本信息
          </div>
          {[
            { label: '性别', value: personalInfo.gender },
            { label: '民族', value: personalInfo.ethnicity },
            { label: '政治面貌', value: personalInfo.politicalStatus },
            { label: '年龄', value: personalInfo.age },
            { label: '毕业院校', value: personalInfo.school },
            { label: '专业', value: personalInfo.major },
            { label: '学历', value: personalInfo.degree },
            { label: '英语成绩', value: personalInfo.englishScore },
          ].filter(item => item.value).map(item => (
            <div key={item.label} className="mb-1.5 text-[9px]">
              <div className="text-[8px] text-[#666]">{item.label}</div>
              {item.value}
            </div>
          ))}
        </div>

        {/* 侧边栏动态栏目 */}
        {sidebarSections.map(section => (
          <GenericSectionRenderer key={section.id} section={section} config={sidebarConfig} isChinese={isChinese} />
        ))}
      </div>

      {/* 右侧主体 */}
      <div className="w-[65%] p-6">
        <div className="mb-1 font-serif text-2xl font-normal text-[#333]">
          {personalInfo.name}
        </div>
        <div className="mb-5 text-xs text-[#666]">
          {personalInfo.currentStatus || '求职者'}
        </div>

        {/* 主体动态栏目 */}
        {mainSections.map(section => (
          <GenericSectionRenderer key={section.id} section={section} config={mainConfig} isChinese={isChinese} />
        ))}
      </div>
    </div>
  );
}
