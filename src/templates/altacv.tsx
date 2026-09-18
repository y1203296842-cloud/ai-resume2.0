import type { ResumeData } from '@/lib/types';
import { GLOBAL_FONT } from '@/config/fonts';
import { isChineseResume } from './sectionTitles';
import { ensureSections } from '@/lib/sectionNormalizer';
import { GenericSectionRenderer } from './GenericSectionRenderer';
import type { SectionRenderConfig } from './GenericSectionRenderer';

const primaryColor = '#3E0097';
const secondaryColor = '#6B46C1';
const textPrimary = '#2E2E2E';
const textSecondary = '#666666';

const sidebarConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '12px', fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${primaryColor}`, paddingBottom: '4px', marginBottom: '8px' },
  itemTitleStyle: { fontSize: '11px', fontWeight: 700, color: '#333' },
  subtitleStyle: { fontSize: '10px', color: primaryColor },
  dateStyle: { fontSize: '10px', color: '#666' },
  bulletStyle: { fontSize: '10px', color: textPrimary },
  bulletMarker: '•',
  bulletMarkerColor: primaryColor,
  listRenderMode: 'bullets',
  listRenderModeOverrides: {
    skills: 'tags',
    certificates: 'bullets',
    languages: 'bullets',
  },
  tagStyle: { backgroundColor: '#FFFFFF', color: primaryColor, border: `1px solid ${secondaryColor}`, fontSize: '10px' },
  textStyle: { fontSize: '10.5px', color: textPrimary },
  sectionGap: '16px',
  itemGap: '12px',
};

const mainConfig: SectionRenderConfig = {
  titleStyle: { fontSize: '14px', fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `2px solid ${primaryColor}`, paddingBottom: '4px', marginBottom: '10px' },
  itemTitleStyle: { fontSize: '11px', fontWeight: 700, color: '#333' },
  subtitleStyle: { fontSize: '10px', color: primaryColor },
  dateStyle: { fontSize: '10px', color: '#666' },
  bulletStyle: { fontSize: '10px', color: '#444', lineHeight: '1.5' },
  bulletMarker: '•',
  bulletMarkerColor: primaryColor,
  metaStyle: { fontSize: '10px', color: '#555' },
  listRenderMode: 'pipe',
  textStyle: { fontSize: '10.5px', color: textPrimary },
  sectionGap: '16px',
  itemGap: '12px',
};

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '12px', fontWeight: 700, color: primaryColor, margin: '0 0 8px 0', paddingBottom: '4px', borderBottom: `2px solid ${primaryColor}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ContactItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', fontSize: '10px' }}>
      <span style={{ marginRight: '6px' }}>{icon}</span>
      <span style={{ color: '#444' }}>{text}</span>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', marginBottom: '4px', fontSize: '10px' }}>
      <span style={{ color: '#666', marginRight: '6px' }}>{label}:</span>
      <span style={{ color: '#333' }}>{value}</span>
    </div>
  );
}

export function AltaCVTemplate({ data }: { data: ResumeData }) {
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
    <div style={{ display: 'flex', width: '100%', minHeight: '100%', fontFamily: GLOBAL_FONT.cssStack, fontSize: '10.5px', lineHeight: '1.5', color: textPrimary }}>
      {/* 左侧边栏 */}
      <aside style={{ width: '32%', backgroundColor: '#F8F8F8', padding: '20px 15px', borderRight: `2px solid ${primaryColor}` }}>
        {personalInfo.photo && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img src={personalInfo.photo} alt={personalInfo.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${primaryColor}` }} />
          </div>
        )}

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: primaryColor, margin: '0 0 4px 0', textAlign: 'center' }}>
          {personalInfo.name}
        </h1>

        {personalInfo.currentStatus && (
          <p style={{ fontSize: '11px', color: textSecondary, margin: '0 0 16px 0', textAlign: 'center' }}>
            {personalInfo.currentStatus}
          </p>
        )}

        {/* 联系方式 */}
        <div style={{ marginBottom: '16px' }}>
          <SidebarSection title="联系方式">
            {personalInfo.phone && <ContactItem icon="📞" text={personalInfo.phone} />}
            {personalInfo.email && <ContactItem icon="✉️" text={personalInfo.email} />}
            {personalInfo.hometown && <ContactItem icon="📍" text={personalInfo.hometown} />}
          </SidebarSection>
        </div>

        {/* 基本信息 */}
        <div style={{ marginBottom: '16px' }}>
          <SidebarSection title="基本信息">
            {[
              { label: '性别', value: personalInfo.gender },
              { label: '民族', value: personalInfo.ethnicity },
              { label: '政治面貌', value: personalInfo.politicalStatus },
              { label: '年龄', value: personalInfo.age },
              { label: '毕业院校', value: personalInfo.school },
              { label: '专业', value: personalInfo.major },
              { label: '学历', value: personalInfo.degree },
              { label: '英语成绩', value: personalInfo.englishScore },
            ].filter((item): item is { label: string; value: string } => Boolean(item.value)).map(item => (
              <InfoItem key={item.label} label={item.label} value={item.value} />
            ))}
          </SidebarSection>
        </div>

        {/* 侧边栏动态栏目 */}
        {sidebarSections.map(section => (
          <GenericSectionRenderer key={section.id} section={section} config={sidebarConfig} isChinese={isChinese} />
        ))}
      </aside>

      {/* 右侧主体 */}
      <main style={{ flex: 1, padding: '20px' }}>
        {mainSections.map(section => (
          <GenericSectionRenderer key={section.id} section={section} config={mainConfig} isChinese={isChinese} />
        ))}
      </main>
    </div>
  );
}
