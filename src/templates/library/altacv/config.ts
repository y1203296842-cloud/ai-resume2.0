/**
 * AltaCV 模板配置
 * 源自 LaTeX AltaCV Template (altacv.cls)
 */

import type { TemplateDefinition } from '@/lib/templates/templateTypes';

export const altacvDefinition: TemplateDefinition = {
  meta: {
    id: 'altacv',
    name: 'AltaCV 学术专业风',
    description: '源自 LaTeX AltaCV 模板，双栏布局，紫色强调风格，适合学术和技术岗位',
    suitableFor: ['学术', '研究', '技术', '工程', '教育'],
    suitedFor: ['学生', '研究生', '职场人士'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'imported',
    templateLanguage: 'en',
  },
  style: {
    colors: {
      primary: '#3E0097',
      secondary: '#6B46C1',
      textPrimary: '#2E2E2E',
      textSecondary: '#666666',
      background: '#FFFFFF',
      border: '#E0E0E0',
      accent: '#3E0097',
    },
    fonts: {
      heading: 'Lato, "PingFang SC", "Microsoft YaHei", sans-serif',
      body: 'Lato, "PingFang SC", "Microsoft YaHei", sans-serif',
      headingSize: '18px',
      bodySize: '10.5px',
      lineHeight: '1.5',
    },
    spacing: {
      padding: '20px',
      sectionGap: '16px',
      itemGap: '8px',
    },
    sectionStyle: {
      titleStyle: 'underline',
      showIcons: true,
      divider: 'solid',
    },
  },
  layout: {
    photoPosition: 'left',
    columns: 2,
    margin: '15mm',
    compact: true,
  },
  contentAdapter: {
    defaultSections: ['personalInfo', 'evaluation', 'experience', 'projects', 'education', 'skills', 'certificates'],
    graduate: ['research', 'publications', 'labSkills'],
    professional: ['achievements', 'projects', 'certifications'],
    student: ['campus', 'courseProjects', 'competitions'],
  },
};

export default altacvDefinition;
