/**
 * Wenneker 模板定义
 * 源自 LaTeX Wenneker Resume Template
 * 双栏布局：左侧个人信息栏 + 右侧主体内容
 * 蓝色强调风格，简洁专业
 */

import type { TemplateDefinition } from './templateTypes';

/** Wenneker 模板定义 */
export const wennekerDefinition: TemplateDefinition = {
  meta: {
    id: 'wenneker',
    name: '双栏专业风',
    description: '源自 LaTeX Wenneker 模板，双栏布局，左侧个人信息，右侧主体内容，蓝色强调风格',
    suitableFor: ['技术', '开发', '工程', '研究', '学术', '设计'],
    suitedFor: ['学生', '应届生', '研究生', '职场人士'],
    isPremium: false, // 开源版 - 所有模板免费
    source: 'imported',
    templateLanguage: 'en', // 原模板为英文，但内容会适配中文
  },
  style: {
    colors: {
      primary: '#4A90D9',      // 蓝色强调色
      secondary: '#5BA3E6',    // 浅蓝
      textPrimary: '#333333',  // 深灰文字
      textSecondary: '#666666',// 次要文字
      background: '#FFFFFF',   // 白色背景
      border: '#E0E0E0',       // 浅灰边框
      accent: '#4A90D9',       // 强调色
    },
    fonts: {
      heading: 'Georgia, SimSun, serif',
      body: 'Arial, PingFang SC, Microsoft YaHei, sans-serif',
      headingSize: '24px',
      bodySize: '11px',
      lineHeight: '1.5',
    },
    spacing: {
      padding: '20px',
      sectionGap: '16px',
      itemGap: '8px',
    },
    sectionStyle: {
      titleStyle: 'underline',
      showIcons: false,
      divider: 'solid',
    },
  },
  layout: {
    photoPosition: 'left',     // 照片在左侧栏
    columns: 2,                // 双栏布局
    margin: '15mm',
    compact: true,             // 紧凑布局
  },
  contentAdapter: {
    // 默认栏目顺序（右侧主体）
    defaultSections: ['personalInfo', 'aboutMe', 'education', 'experience', 'skills', 'interests'],
    // 研究生额外栏目
    graduate: ['research', 'publications', 'labSkills'],
    // 职场人士额外栏目
    professional: ['achievements', 'projects', 'certifications'],
    // 学生额外栏目
    student: ['campus', 'courseProjects', 'competitions'],
  },
};

/**
 * Wenneker 模板栏目映射
 * LaTeX 原模板 → 中国简历适配
 */
export const wennekerSectionMapping = {
  // 左侧栏
  sidebar: {
    photo: 'photoUrl',           // 照片
    name: 'name',                // 姓名
    email: 'email',              // 邮箱
    phone: 'phone',              // 电话
    address: 'hometown',         // 地址/籍贯
  },
  // 右侧主体
  main: {
    heading: 'name',             // 大标题：姓名
    subheading: 'currentStatus', // 副标题：职业/身份
    aboutMe: 'evaluation',       // 个人简介 → 个人优势/职业简介
    education: 'education',      // 教育背景
    experience: 'experience',    // 工作经历/实践经历
    projects: 'projects',        // 项目经历（替代 Interests）
    skills: 'skills',            // 技能
    certificates: 'certificates',// 证书
    interests: 'evaluation',     // 兴趣 → 可映射到其他模块
  },
};
