import type { ResumeData } from '@/lib/types';
import { DynamicSectionsRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';
import { PersonalInfoGrid } from './components/PersonalInfoGrid';

interface ResumeTemplateProps {
  data: ResumeData;
}

const NAVY = '#000080';
const SLATE = '#2E2E2E';
const GREY = '#666666';

const techConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '14pt', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5pt', borderBottom: `1px solid ${NAVY}`, paddingBottom: '2pt', marginBottom: '4pt' },
  itemTitleStyle: { fontSize: '10pt', fontWeight: 700, color: SLATE },
  subtitleStyle: { fontSize: '9pt', color: GREY },
  dateStyle: { fontSize: '9pt', color: GREY },
  bulletStyle: { fontSize: '9.5pt', color: GREY, lineHeight: '1.2' },
  bulletMarker: '•',
  bulletMarkerColor: NAVY,
  metaStyle: { fontSize: '8.5pt', color: SLATE },
  listRenderMode: 'pipe',
  listRenderModeOverrides: {
    skills: 'tags',
    certificates: 'bullets',
    languages: 'slash',
  },
  tagStyle: { fontSize: '8.5pt', color: SLATE, border: `1px solid #b3b3b3`, borderRadius: '3px' },
  textStyle: { fontSize: '9.5pt', color: GREY, lineHeight: 1.3 },
  sectionGap: '8pt',
  itemGap: '6pt',
};

export function TechResumeTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;

  const contactItems: string[] = [];
  if (personalInfo.email) contactItems.push(`✉ ${personalInfo.email}`);
  if (personalInfo.phone) contactItems.push(`☎ ${personalInfo.phone}`);
  if (personalInfo.hometown) contactItems.push(`⌂ ${personalInfo.hometown}`);
  if (personalInfo.school) contactItems.push(`⌃ ${personalInfo.school}`);

  return (
    <div
      className="resume-content"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 10mm',
        fontSize: '10pt',
        lineHeight: '1.2',
        color: GREY,
        fontFamily: "'Lato', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '6pt' }}>
        <h1 style={{ fontSize: '25pt', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '1pt', lineHeight: '1.1', marginBottom: '2pt' }}>
          {personalInfo.name || '\u00A0'}
        </h1>
        {personalInfo.currentStatus && (
          <div style={{ fontSize: '14pt', fontWeight: 700, color: NAVY, marginBottom: '4pt' }}>
            {personalInfo.currentStatus}
          </div>
        )}
        {contactItems.length > 0 && (
          <div style={{ fontSize: '10pt', fontWeight: 700, color: SLATE, display: 'flex', justifyContent: 'center', gap: '12pt', flexWrap: 'wrap' }}>
            {contactItems.map((item, i) => <span key={i}>{item}</span>)}
          </div>
        )}
        <PersonalInfoGrid
          data={data}
          config={{
            minColumnWidth: '80pt',
            gap: '2pt 12pt',
            fontSize: '9pt',
            labelColor: NAVY,
            valueColor: SLATE,
            labelWeight: 700,
            labelSuffix: ' ',
            textAlign: 'center',
            containerStyle: { marginTop: '4pt', marginBottom: '4pt' },
          }}
        />
      </div>

      <DynamicSectionsRenderer
        data={data}
        config={techConfig}
        excludeSectionIds={['personalInfo']}
      />
    </div>
  );
}
