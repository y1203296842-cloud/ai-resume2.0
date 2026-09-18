import type { ResumeData } from '@/lib/types';
import { DynamicSectionsRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';
import { PersonalInfoGrid } from './components/PersonalInfoGrid';

interface ResumeTemplateProps {
  data: ResumeData;
}

const HEADING_COLOR = '#26428b';
const BODY_COLOR = '#000000';
const MUTED_COLOR = '#555555';

const basicConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '13pt', fontWeight: 700, color: HEADING_COLOR, letterSpacing: '0.8pt', borderBottom: `1px solid ${HEADING_COLOR}`, paddingBottom: '2pt', marginBottom: '5pt' },
  itemTitleStyle: { fontSize: '10.5pt', fontWeight: 700, color: BODY_COLOR },
  subtitleStyle: { fontSize: '10pt', fontWeight: 400, color: MUTED_COLOR },
  dateStyle: { fontSize: '9.5pt', color: MUTED_COLOR },
  bulletStyle: { fontSize: '10pt', color: BODY_COLOR, lineHeight: '1.3' },
  bulletMarker: '•',
  bulletMarkerColor: HEADING_COLOR,
  metaStyle: { fontSize: '9pt', color: MUTED_COLOR },
  listRenderMode: 'pipe',
  listRenderModeOverrides: {
    skills: 'bullets',
    certificates: 'bullets',
    languages: 'slash',
  },
  textStyle: { fontSize: '10pt', color: BODY_COLOR, lineHeight: 1.4 },
  sectionGap: '10pt',
  itemGap: '6pt',
};

export function BasicResumeTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;

  const contactParts: string[] = [];
  if (personalInfo.hometown) contactParts.push(personalInfo.hometown);
  if (personalInfo.email) contactParts.push(personalInfo.email);
  if (personalInfo.phone) contactParts.push(personalInfo.phone);
  if (personalInfo.school) contactParts.push(personalInfo.school);

  return (
    <div
      className="resume-content"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '13mm 13mm',
        fontSize: '10pt',
        lineHeight: '1.3',
        color: BODY_COLOR,
        fontFamily: "'Georgia', 'Source Han Serif SC', 'Noto Serif CJK SC', 'SimSun', serif",
      }}
    >
      <div style={{ marginBottom: '8pt' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 700, color: HEADING_COLOR, lineHeight: '1.1', marginBottom: '3pt' }}>
          {personalInfo.name || '\u00A0'}
        </h1>
        {contactParts.length > 0 && (
          <div style={{ fontSize: '10pt', color: MUTED_COLOR }}>
            {contactParts.join('  |  ')}
          </div>
        )}
        <PersonalInfoGrid
          data={data}
          config={{
            minColumnWidth: '90pt',
            gap: '2pt 16pt',
            fontSize: '10pt',
            labelColor: HEADING_COLOR,
            valueColor: MUTED_COLOR,
            labelWeight: 700,
            labelSuffix: '：',
            textAlign: 'left',
            containerStyle: { marginTop: '4pt' },
          }}
        />
      </div>

      <DynamicSectionsRenderer
        data={data}
        config={basicConfig}
        excludeSectionIds={['personalInfo']}
      />
    </div>
  );
}
