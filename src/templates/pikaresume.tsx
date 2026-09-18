import type { ResumeData } from '@/lib/types';
import { isChineseResume } from './sectionTitles';
import { DynamicSectionsRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';

interface ResumeTemplateProps {
  data: ResumeData;
}

const BLUE = '#2b74e2';
const HEADER_BG = '#f7f8fa';
const LABEL_COLOR = '#8892a0';
const BODY_COLOR = '#1a1a1a';
const MUTED_COLOR = '#4b5563';

const pikaConfig: SectionRenderConfig = {
  titleStyle: { color: BLUE, fontSize: '12pt', fontWeight: 600, margin: '10pt 0 4pt 0' },
  itemTitleStyle: { fontSize: '10pt', fontWeight: 700, color: BODY_COLOR },
  subtitleStyle: { fontSize: '9.7pt', color: MUTED_COLOR },
  dateStyle: { fontSize: '9pt', color: '#6b7280' },
  bulletStyle: { fontSize: '9.7pt', color: BODY_COLOR, lineHeight: '1.32' },
  bulletMarker: '•',
  bulletMarkerColor: BODY_COLOR,
  metaStyle: { fontSize: '9pt', color: MUTED_COLOR },
  listRenderMode: 'pipe',
  listRenderModeOverrides: {
    skills: 'bullets',
    certificates: 'bullets',
    languages: 'bullets',
  },
  textStyle: { fontSize: '9.7pt', color: BODY_COLOR, lineHeight: 1.4 },
  sectionGap: '6pt',
  itemGap: '6pt',
};

function ContactItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '4pt' }}>
      <div style={{ color: LABEL_COLOR, fontSize: '9pt', lineHeight: '1.2' }}>{label}</div>
      <div style={{ fontSize: '9pt', color: BODY_COLOR, lineHeight: '1.2' }}>{value}</div>
    </div>
  );
}

export function PikaResumeTemplate({ data }: ResumeTemplateProps) {
  const { personalInfo } = data;
  const isChinese = isChineseResume(data);

  return (
    <div
      className="resume-content"
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: '#ffffff',
        fontSize: '10pt',
        lineHeight: '1.32',
        color: BODY_COLOR,
        fontFamily: "'Segoe UI', 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif",
      }}
    >
      <div style={{ backgroundColor: HEADER_BG, padding: '14px 20px' }}>
        <div style={{ marginBottom: '8pt' }}>
          <h1 style={{ fontSize: '19pt', fontWeight: 700, lineHeight: '1.15', color: BODY_COLOR, marginBottom: '2pt' }}>
            {personalInfo.name || '\u00A0'}
          </h1>
          {personalInfo.currentStatus && (
            <div style={{ color: BLUE, fontWeight: 600, fontSize: '11pt' }}>
              {personalInfo.currentStatus}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: '12pt', rowGap: '4pt' }}>
          <ContactItem label={isChinese ? '性别' : 'Gender'} value={personalInfo.gender} />
          <ContactItem label={isChinese ? '年龄' : 'Age'} value={personalInfo.age} />
          <ContactItem label={isChinese ? '民族' : 'Ethnicity'} value={personalInfo.ethnicity} />
          <ContactItem label={isChinese ? '政治面貌' : 'Political Status'} value={personalInfo.politicalStatus} />
          <ContactItem label={isChinese ? '电话' : 'Phone'} value={personalInfo.phone} />
          <ContactItem label={isChinese ? '邮箱' : 'Email'} value={personalInfo.email} />
          <ContactItem label={isChinese ? '学校' : 'School'} value={personalInfo.school} />
          <ContactItem label={isChinese ? '专业' : 'Major'} value={personalInfo.major} />
          <ContactItem label={isChinese ? '学历' : 'Degree'} value={personalInfo.degree} />
          <ContactItem label={isChinese ? '英语成绩' : 'English Score'} value={personalInfo.englishScore} />
          <ContactItem label={isChinese ? '住所' : 'Location'} value={personalInfo.hometown} />
        </div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <DynamicSectionsRenderer
          data={data}
          config={pikaConfig}
          excludeSectionIds={['personalInfo']}
        />
      </div>
    </div>
  );
}
