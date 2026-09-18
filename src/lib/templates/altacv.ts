/**
 * AltaCV 模板定义
 * 源自 LaTeX AltaCV Template (altacv.cls)
 * 左侧边栏 + 右侧主体布局，紫色强调风格
 */

import type { TemplateDefinition } from './templateTypes';

/** AltaCV 模板定义 */
export const altacvDefinition: TemplateDefinition = {
  meta: {
    id: 'altacv',
    name: '学术专业风',
    description: '源自 LaTeX AltaCV 模板，左侧边栏个人信息，右侧主体内容，紫色强调风格，适合学术和技术背景',
    suitableFor: ['学术', '研究', '教育', '技术', '工程'],
    suitedFor: ['研究生', '职场人士', '应届生', '学生'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'imported',
    templateLanguage: 'en',
  },
  style: {
    colors: {
      primary: '#3E0097',      // 深紫色强调色
      secondary: '#6B46C1',    // 浅紫色
      textPrimary: '#2E2E2E',  // 深灰文字
      textSecondary: '#666666',// 次要文字
      background: '#FFFFFF',   // 白色背景
      border: '#E0E0E0',       // 浅灰边框
      accent: '#3E0097',       // 强调色
    },
    fonts: {
      heading: 'Lato, PingFang SC, Microsoft YaHei, sans-serif',
      body: 'Lato, PingFang SC, Microsoft YaHei, sans-serif',
      headingSize: '22px',
      bodySize: '10.5px',
      lineHeight: '1.5',
    },
    spacing: {
      padding: '15px',
      sectionGap: '12px',
      itemGap: '6px',
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
    margin: '10mm',
    compact: true,
  },
  contentAdapter: {
    defaultSections: ['personalInfo', 'experience', 'education', 'skills', 'projects'],
    graduate: ['research', 'publications', 'teaching'],
    professional: ['experience', 'certifications', 'achievements'],
    student: ['education', 'campus', 'courseProjects', 'competitions'],
  },
};

/**
 * AltaCV 模板栏目映射
 * LaTeX 原模板 → 中国简历适配
 */
export const altacvSectionMapping = {
  // 左侧边栏
  sidebar: {
    photo: 'photo',
    name: 'name',
    tagline: 'currentStatus',
    email: 'email',
    phone: 'phone',
    address: 'hometown',
    location: 'hometown',
  },
  // 右侧主体
  main: {
    experience: 'experience',
    education: 'education',
    skills: 'skills',
    projects: 'projects',
    certificates: 'certificates',
    evaluation: 'evaluation',
  },
};
