/**
 * 模板渲染器
 * Template Renderer - 通用模板渲染引擎
 */

import type { TemplateConfig, SectionMapping } from './types';
import { getTemplate } from './registry';

/** 简历数据类型 */
export interface ResumeData {
  personalInfo: {
    name: string;
    gender?: string;
    ethnicity?: string;
    politicalStatus?: string;
    phone?: string;
    email?: string;
    hometown?: string;
    school?: string;
    major?: string;
    degree?: string;
    englishScore?: string;
    currentStatus?: string;
    photo?: string;
  };
  education?: Array<{
    school: string;
    major: string;
    degree: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  experience?: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    description?: string[];
  }>;
  projects?: Array<{
    name: string;
    role?: string;
    description?: string[];
    outcome?: string;
  }>;
  skills?: string[];
  certificates?: string[];
  evaluation?: string;
}

/** 渲染选项 */
export interface RenderOptions {
  /** 输出格式 */
  format?: 'html' | 'text';
  /** 语言 */
  locale?: string;
  /** 是否包含样式 */
  includeStyles?: boolean;
}

/**
 * 渲染简历
 */
export function renderResume(
  data: ResumeData,
  templateId: string,
  options: RenderOptions = {}
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`模板不存在: ${templateId}`);
  }

  const { format = 'html', includeStyles = true } = options;

  if (format === 'text') {
    return renderAsText(data, template);
  }

  return renderAsHtml(data, template, includeStyles);
}

/**
 * 渲染为 HTML
 */
function renderAsHtml(data: ResumeData, template: TemplateConfig, includeStyles: boolean): string {
  const { colorTheme, typography, layout, sidebar, sections } = template;

  // 生成样式
  const styles = includeStyles ? generateStyles(colorTheme, typography) : '';

  // 根据布局类型渲染
  if (layout === 'two-column' && sidebar !== 'none') {
    return renderTwoColumnLayout(data, template, styles);
  }

  return renderSingleColumnLayout(data, template, styles);
}

/**
 * 生成 CSS 样式
 */
function generateStyles(
  colorTheme: TemplateConfig['colorTheme'],
  typography?: TemplateConfig['typography']
): string {
  const {
    primary = '#333333',
    secondary = '#666666',
    textPrimary = '#000000',
    textSecondary = '#666666',
    background = '#FFFFFF',
    border = '#E0E0E0',
  } = colorTheme;

  const {
    headingFont = 'Arial, sans-serif',
    bodyFont = 'Arial, sans-serif',
    headingSize = '24px',
    bodySize = '14px',
    lineHeight = '1.6',
  } = typography || {};

  return `
    <style>
      .resume-container {
        font-family: ${bodyFont};
        font-size: ${bodySize};
        line-height: ${lineHeight};
        color: ${textPrimary};
        background: ${background};
        padding: 40px;
        max-width: 210mm;
        margin: 0 auto;
      }
      .resume-header {
        margin-bottom: 24px;
        border-bottom: 2px solid ${primary};
        padding-bottom: 16px;
      }
      .resume-name {
        font-family: ${headingFont};
        font-size: ${headingSize};
        font-weight: 700;
        color: ${primary};
        margin: 0 0 8px 0;
      }
      .resume-title {
        font-size: 16px;
        color: ${textSecondary};
        margin: 0;
      }
      .resume-section {
        margin-bottom: 20px;
      }
      .resume-section-title {
        font-family: ${headingFont};
        font-size: 16px;
        font-weight: 700;
        color: ${primary};
        border-bottom: 1px solid ${border};
        padding-bottom: 6px;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .resume-item {
        margin-bottom: 12px;
      }
      .resume-item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
      }
      .resume-item-title {
        font-weight: 600;
        color: ${textPrimary};
      }
      .resume-item-subtitle {
        color: ${secondary};
      }
      .resume-item-date {
        font-size: 12px;
        color: ${textSecondary};
      }
      .resume-item-description {
        color: ${textSecondary};
        margin: 4px 0 0 0;
      }
      .resume-skills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .resume-skill-tag {
        background: ${primary}15;
        color: ${primary};
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
      }
      .two-column {
        display: flex;
        gap: 30px;
      }
      .sidebar {
        width: 30%;
        background: #F8F8F8;
        padding: 20px;
        border-radius: 4px;
      }
      .main-content {
        flex: 1;
      }
      .sidebar-section {
        margin-bottom: 20px;
      }
      .sidebar-title {
        font-size: 14px;
        font-weight: 700;
        color: ${primary};
        border-bottom: 2px solid ${primary};
        padding-bottom: 4px;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      .contact-item {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        font-size: 12px;
      }
      .contact-icon {
        margin-right: 8px;
        color: ${primary};
      }
      .photo-container {
        text-align: center;
        margin-bottom: 16px;
      }
      .photo-container img {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid ${primary};
      }
      @media print {
        .resume-container {
          padding: 0;
          max-width: none;
        }
      }
    </style>
  `;
}

/**
 * 渲染双栏布局
 */
function renderTwoColumnLayout(
  data: ResumeData,
  template: TemplateConfig,
  styles: string
): string {
  const { sidebar, sections } = template;
  const sidebarSections = sections.filter(s => s.position === 'sidebar');
  const mainSections = sections.filter(s => s.position === 'main');

  const sidebarContent = renderSidebar(data, sidebarSections, template);
  const mainContent = renderMainContent(data, mainSections, template);

  const sidebarFirst = sidebar === 'left';

  return `
    <div class="resume-container">
      ${styles}
      <div class="two-column">
        ${sidebarFirst ? sidebarContent + mainContent : mainContent + sidebarContent}
      </div>
    </div>
  `;
}

/**
 * 渲染单栏布局
 */
function renderSingleColumnLayout(
  data: ResumeData,
  template: TemplateConfig,
  styles: string
): string {
  const { sections } = template;

  let content = `
    <div class="resume-container">
      ${styles}
      <div class="resume-header">
        <h1 class="resume-name">${escapeHtml(data.personalInfo.name)}</h1>
        ${data.personalInfo.currentStatus ? `<p class="resume-title">${escapeHtml(data.personalInfo.currentStatus)}</p>` : ''}
      </div>
  `;

  // 渲染各个栏目
  for (const section of sections) {
    content += renderSection(data, section);
  }

  content += '</div>';
  return content;
}

/**
 * 渲染侧边栏
 */
function renderSidebar(
  data: ResumeData,
  sections: SectionMapping[],
  template: TemplateConfig
): string {
  const { colorTheme } = template;
  let content = '<div class="sidebar">';

  // 照片
  if (data.personalInfo.photo) {
    content += `
      <div class="photo-container">
        <img src="${data.personalInfo.photo}" alt="${escapeHtml(data.personalInfo.name)}" />
      </div>
    `;
  }

  // 姓名
  content += `
    <div class="sidebar-section">
      <h2 class="sidebar-title" style="color: ${colorTheme.primary}">${escapeHtml(data.personalInfo.name)}</h2>
      ${data.personalInfo.currentStatus ? `<p style="color: ${colorTheme.textSecondary}; font-size: 12px; margin: 0;">${escapeHtml(data.personalInfo.currentStatus)}</p>` : ''}
    </div>
  `;

  // 联系方式
  content += `
    <div class="sidebar-section">
      <h3 class="sidebar-title" style="color: ${colorTheme.primary}">联系方式</h3>
      ${data.personalInfo.phone ? `<div class="contact-item"><span class="contact-icon">📞</span>${escapeHtml(data.personalInfo.phone)}</div>` : ''}
      ${data.personalInfo.email ? `<div class="contact-item"><span class="contact-icon">✉️</span>${escapeHtml(data.personalInfo.email)}</div>` : ''}
      ${data.personalInfo.hometown ? `<div class="contact-item"><span class="contact-icon">📍</span>${escapeHtml(data.personalInfo.hometown)}</div>` : ''}
    </div>
  `;

  // 技能
  if (data.skills && data.skills.length > 0) {
    content += `
      <div class="sidebar-section">
        <h3 class="sidebar-title" style="color: ${colorTheme.primary}">专业技能</h3>
        <div class="resume-skills">
          ${data.skills.map(skill => `<span class="resume-skill-tag" style="background: ${colorTheme.primary}15; color: ${colorTheme.primary}">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // 证书
  if (data.certificates && data.certificates.length > 0) {
    content += `
      <div class="sidebar-section">
        <h3 class="sidebar-title" style="color: ${colorTheme.primary}">证书资质</h3>
        <ul style="margin: 0; padding-left: 16px; font-size: 12px;">
          ${data.certificates.map(cert => `<li style="margin-bottom: 4px;">${escapeHtml(cert)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  content += '</div>';
  return content;
}

/**
 * 渲染主内容区
 */
function renderMainContent(
  data: ResumeData,
  sections: SectionMapping[],
  template: TemplateConfig
): string {
  let content = '<div class="main-content">';

  // 个人优势
  if (data.evaluation) {
    content += `
      <div class="resume-section">
        <h3 class="resume-section-title">个人优势</h3>
        <p style="margin: 0;">${escapeHtml(data.evaluation)}</p>
      </div>
    `;
  }

  // 渲染其他栏目
  for (const section of sections) {
    content += renderSection(data, section);
  }

  content += '</div>';
  return content;
}

/**
 * 渲染单个栏目
 */
function renderSection(data: ResumeData, section: SectionMapping): string {
  const field = section.dataField || section.id;

  switch (field) {
    case 'education':
      return renderEducation(data);
    case 'experience':
      return renderExperience(data);
    case 'projects':
      return renderProjects(data);
    case 'skills':
      return renderSkills(data);
    case 'certificates':
      return renderCertificates(data);
    case 'evaluation':
      return renderEvaluation(data);
    default:
      return '';
  }
}

/**
 * 渲染教育背景
 */
function renderEducation(data: ResumeData): string {
  if (!data.education || data.education.length === 0) return '';

  let content = `
    <div class="resume-section">
      <h3 class="resume-section-title">教育背景</h3>
  `;

  for (const edu of data.education) {
    const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
    content += `
      <div class="resume-item">
        <div class="resume-item-header">
          <span class="resume-item-title">${escapeHtml(edu.school)}</span>
          <span class="resume-item-date">${escapeHtml(dateRange)}</span>
        </div>
        <div class="resume-item-subtitle">${escapeHtml(edu.major)} · ${escapeHtml(edu.degree)}</div>
        ${edu.gpa ? `<div class="resume-item-description">GPA: ${escapeHtml(edu.gpa)}</div>` : ''}
      </div>
    `;
  }

  content += '</div>';
  return content;
}

/**
 * 渲染工作经历
 */
function renderExperience(data: ResumeData): string {
  if (!data.experience || data.experience.length === 0) return '';

  let content = `
    <div class="resume-section">
      <h3 class="resume-section-title">工作经历</h3>
  `;

  for (const exp of data.experience) {
    const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
    content += `
      <div class="resume-item">
        <div class="resume-item-header">
          <span class="resume-item-title">${escapeHtml(exp.position)}</span>
          <span class="resume-item-date">${escapeHtml(dateRange)}</span>
        </div>
        <div class="resume-item-subtitle">${escapeHtml(exp.company)}</div>
        ${exp.description && exp.description.length > 0 ? `
          <ul class="resume-item-description" style="margin: 4px 0 0 0; padding-left: 16px;">
            ${exp.description.map(desc => `<li>${escapeHtml(desc)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  content += '</div>';
  return content;
}

/**
 * 渲染项目经历
 */
function renderProjects(data: ResumeData): string {
  if (!data.projects || data.projects.length === 0) return '';

  let content = `
    <div class="resume-section">
      <h3 class="resume-section-title">项目经历</h3>
  `;

  for (const proj of data.projects) {
    content += `
      <div class="resume-item">
        <div class="resume-item-title">${escapeHtml(proj.name)}</div>
        ${proj.role ? `<div class="resume-item-subtitle">${escapeHtml(proj.role)}</div>` : ''}
        ${proj.description && proj.description.length > 0 ? `
          <ul class="resume-item-description" style="margin: 4px 0 0 0; padding-left: 16px;">
            ${proj.description.map(desc => `<li>${escapeHtml(desc)}</li>`).join('')}
          </ul>
        ` : ''}
        ${proj.outcome ? `<div class="resume-item-description"><strong>成果：</strong>${escapeHtml(proj.outcome)}</div>` : ''}
      </div>
    `;
  }

  content += '</div>';
  return content;
}

/**
 * 渲染技能
 */
function renderSkills(data: ResumeData): string {
  if (!data.skills || data.skills.length === 0) return '';

  return `
    <div class="resume-section">
      <h3 class="resume-section-title">专业技能</h3>
      <div class="resume-skills">
        ${data.skills.map(skill => `<span class="resume-skill-tag">${escapeHtml(skill)}</span>`).join('')}
      </div>
    </div>
  `;
}

/**
 * 渲染证书
 */
function renderCertificates(data: ResumeData): string {
  if (!data.certificates || data.certificates.length === 0) return '';

  return `
    <div class="resume-section">
      <h3 class="resume-section-title">证书资质</h3>
      <ul style="margin: 0; padding-left: 16px;">
        ${data.certificates.map(cert => `<li style="margin-bottom: 4px;">${escapeHtml(cert)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * 渲染个人优势
 */
function renderEvaluation(data: ResumeData): string {
  if (!data.evaluation) return '';

  return `
    <div class="resume-section">
      <h3 class="resume-section-title">个人优势</h3>
      <p style="margin: 0;">${escapeHtml(data.evaluation)}</p>
    </div>
  `;
}

/**
 * 渲染为纯文本
 */
function renderAsText(data: ResumeData, template: TemplateConfig): string {
  let text = `${data.personalInfo.name}\n`;
  
  if (data.personalInfo.currentStatus) {
    text += `${data.personalInfo.currentStatus}\n`;
  }

  text += '\n--- 联系方式 ---\n';
  if (data.personalInfo.phone) text += `电话: ${data.personalInfo.phone}\n`;
  if (data.personalInfo.email) text += `邮箱: ${data.personalInfo.email}\n`;

  if (data.evaluation) {
    text += '\n--- 个人优势 ---\n';
    text += data.evaluation + '\n';
  }

  if (data.education && data.education.length > 0) {
    text += '\n--- 教育背景 ---\n';
    for (const edu of data.education) {
      text += `${edu.school} | ${edu.major} | ${edu.degree}\n`;
    }
  }

  if (data.experience && data.experience.length > 0) {
    text += '\n--- 工作经历 ---\n';
    for (const exp of data.experience) {
      text += `${exp.position} @ ${exp.company}\n`;
      if (exp.description) {
        text += exp.description.join('\n') + '\n';
      }
    }
  }

  if (data.skills && data.skills.length > 0) {
    text += '\n--- 技能 ---\n';
    text += data.skills.join(', ') + '\n';
  }

  return text;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
