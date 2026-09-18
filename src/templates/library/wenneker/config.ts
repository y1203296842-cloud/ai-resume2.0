/**
 * Wenneker 模板配置
 * 源自 LaTeX Wenneker Resume Template
 */

import type { TemplateDefinition } from '@/lib/templates/templateTypes';

export const wennekerDefinition: TemplateDefinition = {
  meta: {
    id: 'wenneker',
    name: 'Wenneker 双栏专业风',
    description: '源自 LaTeX Wenneker 模板，双栏布局，蓝色强调风格，简洁专业',
    suitableFor: ['技术', '开发', '工程', '研究', '学术', '设计'],
    suitedFor: ['学生', '应届生', '研究生', '职场人士'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'imported',
    templateLanguage: 'en',
  },
  style: {
    colors: {
      primary: '#4A90D9',
      secondary: '#5BA3E6',
      textPrimary: '#333333',
      textSecondary: '#666666',
      background: '#FFFFFF',
      border: '#E0E0E0',
      accent: '#4A90D9',
    },
    fonts: {
      heading: 'Georgia, "SimSun", serif',
      body: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
      headingSize: '20px',
      bodySize: '11px',
      lineHeight: '1.5',
    },
    spacing: {
      padding: '20px',
      sectionGap: '16px',
      itemGap: '8px',
    },
    sectionStyle: {
      titleStyle: 'border-left',
      showIcons: false,
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
    defaultSections: ['personalInfo', 'evaluation', 'education', 'experience', 'projects', 'skills', 'certificates'],
    graduate: ['research', 'publications', 'labSkills'],
    professional: ['achievements', 'projects', 'certifications'],
    student: ['campus', 'courseProjects', 'competitions'],
  },
};

export default wennekerDefinition;
