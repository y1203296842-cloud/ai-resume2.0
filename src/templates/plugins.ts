/**
 * 现有模板插件定义
 *
 * 每个模板插件 = metadata + supportedSections + style + layout + docxLayout + render
 * docxLayout 从 Preview CSS 提取视觉参数，让 Word Export 读取统一 Contract。
 *
 * 新增模板步骤：
 * 1. 创建 my-template.tsx（React 组件）
 * 2. 在此文件中 import 并组装为 TemplatePlugin（含 docxLayout）
 * 3. 在 registry.ts 的 auto-register 列表中添加一行
 */

import type { TemplatePlugin } from './types';
import type { ResumeData } from '@/lib/types';
import { GLOBAL_FONT } from '@/config/fonts';

import { ModernTemplate } from './modern';
import { BusinessTemplate } from './business';
import { CampusTemplate } from './campus';
import { WennekerTemplate } from './wenneker';
import { AltaCVTemplate } from './altacv';
import { TechResumeTemplate } from './techresume';
import { BasicResumeTemplate } from './basicresume';
import { PikaResumeTemplate } from './pikaresume';

const ALL_SECTIONS: TemplatePlugin['supportedSections'] = [
  'personalInfo',
  'education',
  'experience',
  'projects',
  'skills',
  'certificates',
  'languages',
  'evaluation',
];

// altacv 主体顺序：经历 → 项目 → 教育 → 评价（与 Preview 一致）
const ALTACV_SECTIONS: TemplatePlugin['supportedSections'] = [
  'personalInfo',
  'experience',
  'projects',
  'education',
  'skills',
  'certificates',
  'languages',
  'evaluation',
];

// techresume 主体顺序：经历 → 项目 → 教育 → 技能（与 Preview 一致）
const TECHRESUME_SECTIONS: TemplatePlugin['supportedSections'] = [
  'personalInfo',
  'experience',
  'projects',
  'education',
  'skills',
  'certificates',
  'languages',
  'evaluation',
];

// ============================================
// Modern — 互联网简洁风
// ============================================
export const modernPlugin: TemplatePlugin = {
  metadata: {
    id: 'modern',
    name: '互联网简洁风',
    description: '适合互联网/科技行业，简洁现代',
    suitedFor: ['互联网', '科技', '前端', '后端', '产品经理'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: ALL_SECTIONS,
  style: {
    primaryColor: '#0071E3',
    font: GLOBAL_FONT.docx,
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: 'transparent',
    titleColor: '#0071E3',
    titlePadding: '0 0 6px 0',
    titleRadius: '0',
    titleBorder: 'border-bottom: 1px solid #e5e5e7;',
    skillBg: '#f5f5f7',
    skillColor: '#3a3a3c',
    skillBorder: 'none',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 16, bottom: 16, left: 18, right: 18 },
    bodyFontSize: 10,
    bodyLineHeight: 1.5,
    fontFamily: undefined,
    nameFontSize: 22,
    nameBold: false,
    nameAlignment: 'left',
    headerBorderWidth: 0.75,
    headerBorderColor: 'E5E5E7',
    sectionTitleFontSize: 10.5,
    sectionTitleBold: true,
    sectionTitleUppercase: false,
    sectionTitleBorderWidth: 0.75,
    sectionTitleTextColor: '1D1D1F',
    itemTitleFontSize: 10.5,
    itemTitleBold: true,
    itemDetailFontSize: 9.5,
    dateFontSize: 8.5,
    dateItalic: false,
    bulletFontSize: 9.5,
    bulletColor: '0071E3',
    subtitleSeparator: ' | ',
    subtitleOnOwnLine: false,
    sectionBefore: 12,
    sectionAfter: 6,
    itemAfter: 8,
    bulletAfter: 2,
    headerAfter: 10,
    sectionTitles: {
      education: '教育经历',
      experience: '工作经历',
      projects: '项目经历',
      skills: '专业技能',
      certificates: '证书',
      languages: '语言能力',
      evaluation: '个人优势',
    },
    contentStyles: {
      skills: 'tags',
      certificates: 'pipe',
      languages: 'pipe',
    },
  },
  render: (data: ResumeData) => ModernTemplate({ data }),
  personalInfoRenderer: 'custom',
};

// ============================================
// Business — 商务正式风
// ============================================
export const businessPlugin: TemplatePlugin = {
  metadata: {
    id: 'business',
    name: '商务正式风',
    description: '适合传统行业/管理岗/金融/咨询',
    suitedFor: ['金融', '咨询', '管理', '传统行业', '国企'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: ALL_SECTIONS,
  style: {
    primaryColor: '#1a365d',
    font: GLOBAL_FONT.docx,
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: '#f8f9fa',
    titleColor: '#1a365d',
    titlePadding: '8px 12px',
    titleRadius: '0',
    titleBorder: 'border-bottom: 2px solid #1a365d;',
    skillBg: '#e8edf3',
    skillColor: '#1a365d',
    skillBorder: 'none',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 16, bottom: 16, left: 20, right: 20 },
    bodyFontSize: 10,
    bodyLineHeight: 1.6,
    fontFamily: 'SimSun',
    nameFontSize: 24,
    nameBold: false,
    nameAlignment: 'center',
    headerBorderWidth: 1.5,
    headerBorderColor: '1A1A1A',
    sectionTitleFontSize: 11,
    sectionTitleBold: true,
    sectionTitleUppercase: false,
    sectionTitleBorderWidth: 0.75,
    sectionTitleTextColor: '1A1A1A',
    itemTitleFontSize: 10.5,
    itemTitleBold: true,
    itemDetailFontSize: 9.5,
    dateFontSize: 8.5,
    dateItalic: false,
    bulletFontSize: 9.5,
    bulletColor: undefined,
    subtitleSeparator: ' · ',
    subtitleOnOwnLine: true,
    sectionBefore: 14,
    sectionAfter: 6,
    itemAfter: 10,
    bulletAfter: 2,
    headerAfter: 10,
    sectionTitles: {
      education: '教育背景',
      experience: '职业经历',
      projects: '项目经验',
      skills: '专业技能',
      certificates: '资格证书',
      languages: '语言能力',
      evaluation: '个人优势',
    },
    contentStyles: {
      skills: 'slash',
      certificates: 'pipe',
      languages: 'pipe',
    },
  },
  render: (data: ResumeData) => BusinessTemplate({ data }),
  personalInfoRenderer: 'custom',
};

// ============================================
// Campus — 应届生校园风
// ============================================
export const campusPlugin: TemplatePlugin = {
  metadata: {
    id: 'campus',
    name: '应届生校园风',
    description: '适合大学生/应届生/转行，突出校园经历和潜力',
    suitedFor: ['应届生', '实习', '校园招聘', '转行'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: ALL_SECTIONS,
  style: {
    primaryColor: '#059669',
    font: GLOBAL_FONT.docx,
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: 'linear-gradient(90deg, #059669 0%, #34d399 100%)',
    titleColor: 'white',
    titlePadding: '4px 14px',
    titleRadius: '4px',
    titleBorder: 'none',
    skillBg: '#ecfdf5',
    skillColor: '#059669',
    skillBorder: 'border: 1px solid #a7f3d0;',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 12, bottom: 12, left: 15, right: 12 },
    bodyFontSize: 10,
    bodyLineHeight: 1.55,
    nameFontSize: 22,
    nameBold: true,
    nameAlignment: 'left',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 10,
    sectionTitleBold: true,
    sectionTitleUppercase: false,
    sectionTitleBorderWidth: 0,
    sectionTitleBgColor: '059669',
    sectionTitleTextColor: 'FFFFFF',
    itemTitleFontSize: 10.5,
    itemTitleBold: true,
    itemDetailFontSize: 9.5,
    dateFontSize: 8.5,
    bulletFontSize: 9.5,
    sectionBefore: 10,
    sectionAfter: 5,
    itemAfter: 7,
    bulletAfter: 2,
    headerAfter: 8,
    sectionTitles: {
      education: '教育背景',
      experience: '实习/工作经历',
      projects: '项目经历',
      skills: '专业技能',
      certificates: '证书',
      languages: '语言能力',
      evaluation: '个人优势',
    },
    contentStyles: {
      skills: 'tags',
      certificates: 'pipe',
      languages: 'pipe',
    },
  },
  render: (data: ResumeData) => CampusTemplate({ data }),
  personalInfoRenderer: 'custom',
};

// ============================================
// Wenneker — 双栏专业风
// ============================================
export const wennekerPlugin: TemplatePlugin = {
  metadata: {
    id: 'wenneker',
    name: '双栏专业风',
    description: 'LaTeX 风格双栏模板，适合技术/研究岗位',
    suitedFor: ['技术', '研究', '学术', '工程师', '博士生'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'two-column',
  },
  supportedSections: ALL_SECTIONS,
  style: {
    primaryColor: '#4A90D9',
    font: GLOBAL_FONT.docx,
    isTwoColumn: true,
    sidebarWidth: 35,
    titleBg: 'transparent',
    titleColor: '#4A90D9',
    titlePadding: '0 0 6px 0',
    titleRadius: '0',
    titleBorder: 'border-bottom: 2px solid #4A90D9;',
    skillBg: 'transparent',
    skillColor: '#333333',
    skillBorder: 'none',
  },
  layout: {
    type: 'two-column',
    sidebar: {
      position: 'left',
      width: 35,
      regions: ['skills'],
      bgColor: 'F5F7FA',
    },
  },
  docxLayout: {
    pageMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    bodyFontSize: 9,
    bodyLineHeight: 1.5,
    nameFontSize: 13.5,
    nameBold: true,
    nameAlignment: 'center',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 9,
    sectionTitleBold: true,
    sectionTitleUppercase: true,
    sectionTitleBorderWidth: 1.5,
    itemTitleFontSize: 10,
    itemTitleBold: true,
    itemDetailFontSize: 9,
    dateFontSize: 9,
    bulletFontSize: 9,
    showNameInMain: true,
    mainNameFontSize: 18,
    mainNameBold: false,
    sidebarNameFontSize: 13.5,
    sidebarNameBold: true,
    sidebarNameAlignment: 'center',
    sidebarNameColor: '#333',
    sidebarShowCurrentStatus: false,
    sidebarBodyFontSize: 6.75,
    sidebarLabelFontSize: 6,
    sidebarTitleFontSize: 7.5,
    sidebarTitleUppercase: true,
    sidebarTitleBorderWidth: 1.5,
    sidebarPadding: 6,
    mainPadding: 6,
    projectTechStackInline: true,
    sectionBefore: 10,
    sectionAfter: 5,
    itemAfter: 7,
    bulletAfter: 2,
    headerAfter: 8,
    sectionTitles: {
      education: '教育背景',
      experience: '工作经历',
      projects: '项目经历',
      skills: '专业技能',
      certificates: '证书',
      languages: '语言能力',
      evaluation: '个人优势',
    },
    contentStyles: {
      skills: 'grid-bullets',
      certificates: 'grid-bullets',
      languages: 'grid-bullets',
    },
  },
  render: (data: ResumeData) => WennekerTemplate({ data }),
  personalInfoRenderer: 'custom',
};

// ============================================
// AltaCV — 学术专业风
// ============================================
export const altacvPlugin: TemplatePlugin = {
  metadata: {
    id: 'altacv',
    name: '学术专业风',
    description: 'LaTeX AltaCV 风格，适合学术/科研/高端技术岗位',
    suitedFor: ['学术', '科研', '博士', '高端技术', '数据科学'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'two-column',
  },
  supportedSections: ALTACV_SECTIONS,
  style: {
    primaryColor: '#3E0097',
    font: GLOBAL_FONT.docx,
    isTwoColumn: true,
    sidebarWidth: 32,
    titleBg: 'transparent',
    titleColor: '#3E0097',
    titlePadding: '0 0 4px 0',
    titleRadius: '0',
    titleBorder: 'border-bottom: 2px solid #3E0097;',
    skillBg: '#FFFFFF',
    skillColor: '#3E0097',
    skillBorder: 'border: 1px solid #6B46C1;',
  },
  layout: {
    type: 'two-column',
    sidebar: {
      position: 'left',
      width: 32,
      regions: ['skills', 'certificates', 'languages'],
      bgColor: 'F8F8F8',
    },
  },
  docxLayout: {
    pageMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    bodyFontSize: 8,
    bodyLineHeight: 1.5,
    nameFontSize: 15,
    nameBold: true,
    nameAlignment: 'center',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 10,
    sectionTitleBold: true,
    sectionTitleUppercase: true,
    sectionTitleBorderWidth: 1.5,
    itemTitleFontSize: 9,
    itemTitleBold: true,
    itemDetailFontSize: 8,
    dateFontSize: 8,
    bulletFontSize: 8,
    showNameInMain: false,
    sidebarNameFontSize: 15,
    sidebarNameBold: true,
    sidebarNameAlignment: 'center',
    sidebarBodyFontSize: 8,
    sidebarLabelFontSize: 8,
    sidebarTitleFontSize: 9,
    sidebarTitleUppercase: true,
    sidebarTitleBorderWidth: 1.5,
    sidebarPadding: 5,
    mainPadding: 5,
    sectionBefore: 10,
    sectionAfter: 5,
    itemAfter: 7,
    bulletAfter: 2,
    headerAfter: 8,
    sectionTitles: {
      education: '教育背景',
      experience: '工作经历',
      projects: '项目经历',
      skills: '专业技能',
      certificates: '证书资质',
      languages: '语言能力',
      evaluation: '个人优势',
    },
    contentStyles: {
      skills: 'tags',
      certificates: 'bullets',
      languages: 'bullets',
    },
  },
  render: (data: ResumeData) => AltaCVTemplate({ data }),
  personalInfoRenderer: 'custom',
};

// ============================================
// TechResume — 科技职场风（单栏 ATS）
// 源自 github.com/alexcalabrese/techResume
// NavyBlue 主色，居中头部，双列条目行，技术标签
// ============================================
export const techresumePlugin: TemplatePlugin = {
  metadata: {
    id: 'techresume',
    name: '科技职场',
    description: '单栏、ATS 友好，适合技术与互联网岗位',
    suitedFor: ['软件工程', 'AI', '数据', '互联网', '技术产品'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: TECHRESUME_SECTIONS,
  style: {
    primaryColor: '#000080',
    font: GLOBAL_FONT.docx,
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: 'transparent',
    titleColor: '#000080',
    titlePadding: '0 0 2pt 0',
    titleRadius: '0',
    titleBorder: 'border-bottom: 1px solid #000080;',
    skillBg: 'transparent',
    skillColor: '#2E2E2E',
    skillBorder: 'border: 1px solid #b3b3b3; border-radius: 3px;',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 10, bottom: 10, left: 10, right: 10 },
    bodyFontSize: 10,
    bodyLineHeight: 1.2,
    nameFontSize: 25,
    nameBold: true,
    nameAlignment: 'center',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 14,
    sectionTitleBold: true,
    sectionTitleUppercase: true,
    sectionTitleBorderWidth: 1,
    sectionTitleTextColor: '000080',
    itemTitleFontSize: 10,
    itemTitleBold: true,
    itemDetailFontSize: 9.5,
    dateFontSize: 9,
    bulletFontSize: 9.5,
    nameColor: '000000',
    currentStatusColor: '000080',
    contactInfoColor: '2E2E2E',
    showBasicInfo: false,
    sectionBefore: 8,
    sectionAfter: 4,
    itemAfter: 6,
    bulletAfter: 1,
    headerAfter: 6,
    sectionTitles: {
      education: 'EDUCATION',
      experience: 'WORK EXPERIENCE',
      projects: 'PROJECTS',
      skills: 'SKILLS',
      certificates: 'CERTIFICATES',
      languages: 'LANGUAGES',
      evaluation: 'SUMMARY',
    },
    contentStyles: {
      skills: 'tags',
      certificates: 'bullets',
      languages: 'pipe',
    },
  },
  render: (data: ResumeData) => TechResumeTemplate({ data }),
  personalInfoRenderer: 'shared',
};

// ============================================
// BasicResume — 极简职场风（单栏 ATS）
// 源自 github.com/stuxf/basic-typst-resume-template
// 深蓝标题，衬线字体，小写大写混合，双列信息行
// ============================================
export const basicresumePlugin: TemplatePlugin = {
  metadata: {
    id: 'basicresume',
    name: '极简职场',
    description: '标准单栏 ATS 简历，适合广泛职场岗位',
    suitedFor: ['应届生', '互联网', '产品', '运营', '技术', '数据'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: ALL_SECTIONS,
  style: {
    primaryColor: '#26428b',
    font: 'Georgia',
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: 'transparent',
    titleColor: '#26428b',
    titlePadding: '0 0 2pt 0',
    titleRadius: '0',
    titleBorder: 'border-bottom: 1px solid #26428b;',
    skillBg: 'transparent',
    skillColor: '#000000',
    skillBorder: 'none',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 13, bottom: 13, left: 13, right: 13 },
    bodyFontSize: 10,
    bodyLineHeight: 1.3,
    nameFontSize: 24,
    nameBold: true,
    nameAlignment: 'left',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 13,
    sectionTitleBold: true,
    sectionTitleUppercase: false,
    sectionTitleBorderWidth: 1,
    sectionTitleTextColor: '26428b',
    itemTitleFontSize: 10.5,
    itemTitleBold: true,
    itemDetailFontSize: 10,
    dateFontSize: 9.5,
    bulletFontSize: 10,
    nameColor: '26428b',
    currentStatusColor: '555555',
    contactInfoColor: '555555',
    showBasicInfo: false,
    sectionBefore: 10,
    sectionAfter: 5,
    itemAfter: 6,
    bulletAfter: 1,
    headerAfter: 8,
    sectionTitles: {
      education: 'Education',
      experience: 'Work Experience',
      projects: 'Projects',
      skills: 'Skills',
      certificates: 'Certificates',
      languages: 'Languages',
      evaluation: 'Summary',
    },
    contentStyles: {
      skills: 'grid-bullets',
      certificates: 'bullets',
      languages: 'pipe',
    },
  },
  render: (data: ResumeData) => BasicResumeTemplate({ data }),
  personalInfoRenderer: 'shared',
};

// ============================================
// PikaResume — 现代职场风（单栏 ATS）
// 浅灰头部背景块 + 蓝色栏目标题 + 右对齐日期
// ============================================

const PIKARESUME_SECTIONS: TemplatePlugin['supportedSections'] = [
  'personalInfo',
  'experience',
  'education',
  'projects',
  'skills',
  'certificates',
  'languages',
  'evaluation',
];

export const pikaresumePlugin: TemplatePlugin = {
  metadata: {
    id: 'pikaresume',
    name: '现代职场',
    description: '浅灰头部背景，蓝色标题，适合互联网/技术/产品岗位',
    suitedFor: ['互联网', '技术', '产品', '设计', '应届生', '社招'],
    isPremium: false, // 开源版 - 所有模板免费
    layout: 'single-column',
  },
  supportedSections: PIKARESUME_SECTIONS,
  style: {
    primaryColor: '#2b74e2',
    font: GLOBAL_FONT.docx,
    isTwoColumn: false,
    sidebarWidth: 0,
    titleBg: 'transparent',
    titleColor: '#2b74e2',
    titlePadding: '10pt 0 4pt 0',
    titleRadius: '0',
    titleBorder: 'none',
    skillBg: 'transparent',
    skillColor: '#1a1a1a',
    skillBorder: 'none',
  },
  layout: { type: 'single-column' },
  docxLayout: {
    pageMargins: { top: 6, bottom: 6, left: 6, right: 6 },
    bodyFontSize: 10,
    bodyLineHeight: 1.32,
    nameFontSize: 19,
    nameBold: true,
    nameAlignment: 'left',
    headerBorderWidth: 0,
    headerBorderColor: 'FFFFFF',
    sectionTitleFontSize: 12,
    sectionTitleBold: true,
    sectionTitleUppercase: false,
    sectionTitleBorderWidth: 0,
    sectionTitleTextColor: '2b74e2',
    itemTitleFontSize: 10,
    itemTitleBold: true,
    itemDetailFontSize: 9.7,
    dateFontSize: 9,
    bulletFontSize: 9.7,
    nameColor: '1a1a1a',
    currentStatusColor: '2b74e2',
    contactInfoColor: '1a1a1a',
    showBasicInfo: false,
    sectionBefore: 10,
    sectionAfter: 4,
    itemAfter: 6,
    bulletAfter: 1,
    headerAfter: 6,
    sectionTitles: {
      education: 'Education',
      experience: 'Experience',
      projects: 'Projects',
      skills: 'Skills & Tools',
      certificates: 'Certifications',
      languages: 'Languages',
      evaluation: 'Summary',
    },
    contentStyles: {
      skills: 'grid-bullets',
      certificates: 'bullets',
      languages: 'grid-bullets',
    },
  },
  render: (data: ResumeData) => PikaResumeTemplate({ data }),
  personalInfoRenderer: 'custom',
};

export const builtinPlugins: TemplatePlugin[] = [
  modernPlugin,
  businessPlugin,
  campusPlugin,
  wennekerPlugin,
  altacvPlugin,
  techresumePlugin,
  basicresumePlugin,
  pikaresumePlugin,
];
