/**
 * 模板渲染器
 * 将简历数据 + 模板配置渲染为 HTML
 * 迁移时可替换渲染引擎（如改为 React/PDF 直接渲染）
 */

import type { 
  TemplateId, 
  TemplateRenderContext, 
  TemplateRenderResult,
  TemplateDefinition,
} from './templateTypes';
import { getTemplateDefinition, getDefaultTemplateId } from './registry';

/**
 * 渲染简历为 HTML
 * 完整传递 templateId，确保用户选择的模板被正确使用
 */
export function renderResume(
  resumeData: ResumeData,
  templateId: TemplateId,
  options: {
    userType?: 'graduate' | 'professional' | 'student';
    targetPosition?: string;
    outputFormat?: 'pdf' | 'word' | 'html';
    resumeLanguage?: string;
  } = {}
): TemplateRenderResult {
  // 获取模板定义
  const template = getTemplateDefinition(templateId);
  
  if (!template) {
    console.warn(`[Renderer] 模板 ${templateId} 未找到，使用默认模板`);
    const fallbackId = getDefaultTemplateId();
    const fallbackTemplate = getTemplateDefinition(fallbackId);
    if (!fallbackTemplate) {
      return {
        html: '',
        templateId,
        success: false,
        error: `模板 ${templateId} 不存在且无默认模板`,
      };
    }
    return renderWithTemplate(fallbackTemplate, resumeData, options);
  }

  return renderWithTemplate(template, resumeData, options);
}

/**
 * 使用指定模板渲染
 */
function renderWithTemplate(
  template: TemplateDefinition,
  resumeData: ResumeData,
  options: {
    userType?: 'graduate' | 'professional' | 'student';
    targetPosition?: string;
    outputFormat?: 'pdf' | 'word' | 'html';
    resumeLanguage?: string;
  }
): TemplateRenderResult {
  try {
    const { style, layout, contentAdapter, meta } = template;
    const { colors, fonts, spacing, sectionStyle } = style;
    
    // 确定栏目顺序
    const sections = determineSections(contentAdapter, options.userType);
    
    // 检查是否为双栏模板（wenneker）
    const isTwoColumn = meta.id === 'wenneker' || layout?.columns === 2;
    
    // 生成 HTML
    const html = isTwoColumn 
      ? generateTwoColumnHtml(resumeData, sections, {
          colors,
          fonts,
          spacing,
          sectionStyle,
          layout,
          outputFormat: options.outputFormat || 'html',
          templateId: meta.id,
        })
      : generateHtml(resumeData, sections, {
          colors,
          fonts,
          spacing,
          sectionStyle,
          layout,
          outputFormat: options.outputFormat || 'html',
        });

    return {
      html,
      templateId: meta.id,
      success: true,
    };
  } catch (error) {
    console.error('[Renderer] 渲染失败:', error);
    return {
      html: '',
      templateId: template.meta.id,
      success: false,
      error: error instanceof Error ? error.message : '渲染失败',
    };
  }
}

/**
 * 确定栏目顺序
 */
function determineSections(
  contentAdapter: TemplateDefinition['contentAdapter'],
  userType?: 'graduate' | 'professional' | 'student'
): string[] {
  const defaultSections = contentAdapter?.defaultSections || [
    'personalInfo', 'education', 'experience', 'projects', 'skills', 'evaluation'
  ];

  if (!userType || !contentAdapter) {
    return defaultSections;
  }

  // 根据用户类型添加额外栏目
  const extraSections = contentAdapter[userType] || [];
  
  // 合并栏目：默认栏目 + 额外栏目（去重）
  const allSections = [...defaultSections];
  for (const section of extraSections) {
    if (!allSections.includes(section)) {
      // 在合适的位置插入
      if (section === 'research' || section === 'publications') {
        const eduIndex = allSections.indexOf('education');
        if (eduIndex >= 0) {
          allSections.splice(eduIndex + 1, 0, section);
        } else {
          allSections.push(section);
        }
      } else if (section === 'campus' || section === 'courseProjects' || section === 'competitions') {
        const expIndex = allSections.indexOf('experience');
        if (expIndex >= 0) {
          allSections.splice(expIndex, 0, section);
        } else {
          allSections.push(section);
        }
      } else {
        allSections.push(section);
      }
    }
  }

  return allSections;
}

/**
 * 生成 HTML
 */
function generateHtml(
  data: ResumeData,
  sections: string[],
  config: {
    colors: { primary: string; textPrimary: string; textSecondary?: string; border?: string; background?: string };
    fonts?: { heading?: string; body?: string; headingSize?: string; bodySize?: string; lineHeight?: string };
    spacing?: { padding?: string; sectionGap?: string; itemGap?: string };
    sectionStyle?: { titleStyle?: string; showIcons?: boolean; divider?: string };
    layout?: { photoPosition?: string; columns?: number; margin?: string };
    outputFormat: string;
  }
): string {
  const { colors, fonts, spacing, layout } = config;
  
  // 基础样式
  const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${fonts?.body || 'Inter, -apple-system, PingFang SC, sans-serif'};
      font-size: ${fonts?.bodySize || '14px'};
      line-height: ${fonts?.lineHeight || '1.6'};
      color: ${colors.textPrimary};
      background: ${colors.background || '#fff'};
    }
    .resume-container {
      padding: ${spacing?.padding || '40px'};
      max-width: 210mm;
      margin: 0 auto;
    }
    .section {
      margin-bottom: ${spacing?.sectionGap || '24px'};
    }
    .section-title {
      font-family: ${fonts?.heading || fonts?.body || 'inherit'};
      font-size: ${fonts?.headingSize || '18px'};
      font-weight: 600;
      color: ${colors.primary};
      margin-bottom: ${spacing?.itemGap || '12px'};
      padding-bottom: 6px;
      border-bottom: 2px solid ${colors.primary};
    }
    .section-title.border-left {
      border-bottom: none;
      border-left: 3px solid ${colors.primary};
      padding-left: 12px;
    }
    .section-title.background {
      background: ${colors.primary}15;
      padding: 6px 12px;
      border-bottom: none;
      border-radius: 4px;
    }
    .item {
      margin-bottom: ${spacing?.itemGap || '12px'};
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .item-title {
      font-weight: 600;
      font-size: 15px;
    }
    .item-subtitle {
      color: ${colors.textSecondary || '#666'};
      font-size: 13px;
    }
    .item-date {
      color: ${colors.textSecondary || '#888'};
      font-size: 12px;
    }
    .item-description {
      color: ${colors.textSecondary || '#444'};
      font-size: 13px;
      line-height: 1.5;
    }
    .item-description ul {
      padding-left: 18px;
    }
    .item-description li {
      margin-bottom: 4px;
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background: ${colors.primary}15;
      color: ${colors.primary};
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 13px;
    }
    .personal-info {
      display: grid;
      grid-template-columns: ${layout?.photoPosition === 'left' ? 'auto 1fr' : '1fr'};
      gap: 20px;
      align-items: center;
    }
    .personal-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .personal-details .detail-item {
      font-size: 13px;
    }
    .personal-details .detail-label {
      color: ${colors.textSecondary || '#666'};
      margin-right: 8px;
    }
    .photo {
      width: 100px;
      height: 130px;
      border-radius: 4px;
      object-fit: cover;
    }
    .name {
      font-size: 24px;
      font-weight: 700;
      color: ${colors.textPrimary};
      margin-bottom: 8px;
    }
    .evaluation-text {
      font-size: 13px;
      line-height: 1.6;
      color: ${colors.textSecondary || '#444'};
    }
    @media print {
      body { background: white; }
      .resume-container { padding: 0; }
    }
  `;

  // 生成各栏目 HTML
  let sectionsHtml = '';
  
  for (const section of sections) {
    sectionsHtml += renderSection(section, data, config);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>简历</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="resume-container">
    ${sectionsHtml}
  </div>
</body>
</html>`;
}

/**
 * 生成双栏布局 HTML（Wenneker 模板专用）
 * 左侧：个人信息栏（照片、联系方式）
 * 右侧：主体内容（教育、经历、技能等）
 */
function generateTwoColumnHtml(
  data: ResumeData,
  sections: string[],
  config: {
    colors: { primary: string; textPrimary: string; textSecondary?: string; border?: string; background?: string; secondary?: string };
    fonts?: { heading?: string; body?: string; headingSize?: string; bodySize?: string; lineHeight?: string };
    spacing?: { padding?: string; sectionGap?: string; itemGap?: string };
    sectionStyle?: { titleStyle?: string; showIcons?: boolean; divider?: string };
    layout?: { photoPosition?: string; columns?: number; margin?: string };
    outputFormat: string;
    templateId: string;
  }
): string {
  const { colors, fonts, spacing } = config;
  const personalInfo = data.personalInfo || {} as Record<string, unknown>;
  
  // 左侧栏样式
  const sidebarStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${fonts?.body || 'Arial, PingFang SC, Microsoft YaHei, sans-serif'};
      font-size: ${fonts?.bodySize || '11px'};
      line-height: ${fonts?.lineHeight || '1.5'};
      color: ${colors.textPrimary};
      background: ${colors.background || '#fff'};
    }
    .resume-wrapper {
      display: flex;
      min-height: 297mm;
      max-width: 210mm;
      margin: 0 auto;
    }
    /* 左侧栏 */
    .sidebar {
      width: 35%;
      background: #f5f7fa;
      padding: 30px 20px;
    }
    .sidebar-photo {
      width: 100%;
      max-width: 150px;
      height: 180px;
      margin: 0 auto 20px;
      border-radius: 4px;
      overflow: hidden;
      background: #e0e0e0;
    }
    .sidebar-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .sidebar-name {
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 20px;
      color: ${colors.textPrimary};
    }
    .sidebar-section {
      margin-bottom: 20px;
    }
    .sidebar-section-title {
      font-size: 12px;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid ${colors.primary};
    }
    .sidebar-item {
      font-size: 11px;
      margin-bottom: 8px;
      word-break: break-word;
    }
    .sidebar-item-label {
      color: ${colors.textSecondary || '#666'};
      font-size: 10px;
      display: block;
      margin-bottom: 2px;
    }
    /* 右侧主体 */
    .main-content {
      width: 65%;
      padding: 30px 25px;
    }
    .main-heading {
      font-family: ${fonts?.heading || 'Georgia, SimSun, serif'};
      font-size: 28px;
      font-weight: 400;
      color: ${colors.textPrimary};
      margin-bottom: 5px;
    }
    .main-subheading {
      font-size: 14px;
      color: ${colors.textSecondary || '#666'};
      margin-bottom: 25px;
    }
    .main-section {
      margin-bottom: ${spacing?.sectionGap || '16px'};
    }
    .main-section-title {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${colors.primary};
    }
    .main-item {
      margin-bottom: ${spacing?.itemGap || '10px'};
    }
    .main-item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .main-item-title {
      font-weight: 600;
      font-size: 12px;
    }
    .main-item-date {
      color: ${colors.textSecondary || '#666'};
      font-size: 11px;
    }
    .main-item-subtitle {
      color: ${colors.textSecondary || '#666'};
      font-size: 11px;
      margin-bottom: 4px;
    }
    .main-item-description {
      font-size: 11px;
      line-height: 1.5;
      color: ${colors.textPrimary};
    }
    .main-item-description ul {
      padding-left: 15px;
    }
    .main-item-description li {
      margin-bottom: 3px;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .skill-item {
      font-size: 11px;
      padding-left: 12px;
      position: relative;
    }
    .skill-item::before {
      content: '•';
      color: ${colors.primary};
      position: absolute;
      left: 0;
    }
    .about-me-text {
      font-size: 11px;
      line-height: 1.6;
      color: ${colors.textPrimary};
    }
    @media print {
      body { background: white; }
      .resume-wrapper { padding: 0; }
    }
  `;

  // 左侧栏内容
  const sidebarHtml = `
    <div class="sidebar">
      ${personalInfo.photoUrl ? `
        <div class="sidebar-photo">
          <img src="${personalInfo.photoUrl}" alt="照片">
        </div>
      ` : ''}
      <div class="sidebar-name">${personalInfo.name || ''}</div>
      
      <div class="sidebar-section">
        <div class="sidebar-section-title">联系方式</div>
        ${personalInfo.phone ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">电话</span>
            ${personalInfo.phone}
          </div>
        ` : ''}
        ${personalInfo.email ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">邮箱</span>
            ${personalInfo.email}
          </div>
        ` : ''}
        ${personalInfo.hometown ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">籍贯</span>
            ${personalInfo.hometown}
          </div>
        ` : ''}
      </div>
      
      <div class="sidebar-section">
        <div class="sidebar-section-title">基本信息</div>
        ${personalInfo.gender ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">性别</span>
            ${personalInfo.gender}
          </div>
        ` : ''}
        ${personalInfo.ethnicity ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">民族</span>
            ${personalInfo.ethnicity}
          </div>
        ` : ''}
        ${personalInfo.politicalStatus ? `
          <div class="sidebar-item">
            <span class="sidebar-item-label">政治面貌</span>
            ${personalInfo.politicalStatus}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // 右侧主体内容
  let mainContentHtml = '';
  
  // 大标题和副标题
  mainContentHtml += `
    <div class="main-heading">${personalInfo.name || ''}</div>
    <div class="main-subheading">${personalInfo.currentStatus || '求职者'}</div>
  `;

  // 渲染各栏目
  for (const section of sections) {
    if (section === 'personalInfo') continue; // 已在左侧栏显示
    
    switch (section) {
      case 'aboutMe':
      case 'evaluation':
        if (data.evaluation) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">个人优势</div>
              <div class="about-me-text">${data.evaluation}</div>
            </div>
          `;
        }
        break;
      case 'education':
        if (data.education && data.education.length > 0) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">教育背景</div>
              ${data.education.map((edu: Record<string, unknown>) => `
                <div class="main-item">
                  <div class="main-item-header">
                    <span class="main-item-title">${edu.school || ''}</span>
                    <span class="main-item-date">${edu.startDate || ''} - ${edu.endDate || '至今'}</span>
                  </div>
                  <div class="main-item-subtitle">${edu.major || ''} · ${edu.degree || ''}</div>
                  ${edu.gpa ? `<div class="main-item-description">GPA: ${edu.gpa}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }
        break;
      case 'experience':
        if (data.experience && data.experience.length > 0) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">工作经历</div>
              ${data.experience.map((exp: Record<string, unknown>) => `
                <div class="main-item">
                  <div class="main-item-header">
                    <span class="main-item-title">${exp.company || ''}</span>
                    <span class="main-item-date">${exp.startDate || ''} - ${exp.endDate || '至今'}</span>
                  </div>
                  <div class="main-item-subtitle">${exp.position || ''}</div>
                  <div class="main-item-description">${exp.description || ''}</div>
                </div>
              `).join('')}
            </div>
          `;
        }
        break;
      case 'projects':
        if (data.projects && data.projects.length > 0) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">项目经历</div>
              ${data.projects.map((proj: Record<string, unknown>) => `
                <div class="main-item">
                  <div class="main-item-header">
                    <span class="main-item-title">${proj.name || ''}</span>
                    <span class="main-item-date">${proj.startDate || ''} - ${proj.endDate || ''}</span>
                  </div>
                  <div class="main-item-subtitle">${proj.role || ''}</div>
                  <div class="main-item-description">${proj.description || ''}</div>
                </div>
              `).join('')}
            </div>
          `;
        }
        break;
      case 'skills':
        if (data.skills && data.skills.length > 0) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">专业技能</div>
              <div class="skills-grid">
                ${data.skills.map((skill: string) => `
                  <div class="skill-item">${skill}</div>
                `).join('')}
              </div>
            </div>
          `;
        }
        break;
      case 'certificates':
        if (data.certificates && data.certificates.length > 0) {
          mainContentHtml += `
            <div class="main-section">
              <div class="main-section-title">证书</div>
              <div class="skills-grid">
                ${data.certificates.map((cert: string) => `
                  <div class="skill-item">${cert}</div>
                `).join('')}
              </div>
            </div>
          `;
        }
        break;
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>简历</title>
  <style>${sidebarStyles}</style>
</head>
<body>
  <div class="resume-wrapper">
    ${sidebarHtml}
    <div class="main-content">
      ${mainContentHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 渲染单个栏目
 */
function renderSection(
  section: string,
  data: ResumeData,
  config: { sectionStyle?: { titleStyle?: string } }
): string {
  const titleClass = config.sectionStyle?.titleStyle === 'border-left' ? ' border-left' :
                     config.sectionStyle?.titleStyle === 'background' ? ' background' : '';

  switch (section) {
    case 'personalInfo':
      return renderPersonalInfo(data);
    case 'education':
      return renderListSection('教育背景', data.education, titleClass, (item: Record<string, unknown>) => `
        <div class="item-header">
          <span class="item-title">${item.school || ''}</span>
          <span class="item-date">${item.startDate || ''} - ${item.endDate || '至今'}</span>
        </div>
        <div class="item-subtitle">${item.major || ''} · ${item.degree || ''}</div>
      `);
    case 'experience':
      return renderListSection('工作经历', data.experience, titleClass, (item: Record<string, unknown>) => `
        <div class="item-header">
          <span class="item-title">${item.company || ''}</span>
          <span class="item-date">${item.startDate || ''} - ${item.endDate || '至今'}</span>
        </div>
        <div class="item-subtitle">${item.position || ''}</div>
        <div class="item-description">${formatDescription(item.description as string)}</div>
      `);
    case 'projects':
      return renderListSection('项目经历', data.projects, titleClass, (item: Record<string, unknown>) => `
        <div class="item-header">
          <span class="item-title">${item.name || ''}</span>
          <span class="item-date">${item.startDate || ''} - ${item.endDate || '至今'}</span>
        </div>
        <div class="item-subtitle">${item.role || ''}</div>
        <div class="item-description">${formatDescription(item.description as string)}</div>
      `);
    case 'skills':
      if (!data.skills || data.skills.length === 0) return '';
      return `
        <div class="section">
          <div class="section-title${titleClass}">专业技能</div>
          <div class="skills-list">
            ${data.skills.map((skill: string) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
          </div>
        </div>
      `;
    case 'certificates':
      if (!data.certificates || data.certificates.length === 0) return '';
      return renderListSection('证书资质', data.certificates.map((c: string) => ({ name: c })), titleClass, (item: Record<string, unknown>) => `
        <div class="item-title">${item.name || ''}</div>
      `);
    case 'evaluation':
      if (!data.evaluation) return '';
      return `
        <div class="section">
          <div class="section-title${titleClass}">自我评价</div>
          <div class="evaluation-text">${escapeHtml(data.evaluation)}</div>
        </div>
      `;
    default:
      return '';
  }
}

/**
 * 渲染个人信息
 */
function renderPersonalInfo(data: ResumeData): string {
  const info = data.personalInfo;
  if (!info) return '';

  const details = [
    info.phone && `<div class="detail-item"><span class="detail-label">电话:</span>${escapeHtml(info.phone)}</div>`,
    info.email && `<div class="detail-item"><span class="detail-label">邮箱:</span>${escapeHtml(info.email)}</div>`,
    info.gender && `<div class="detail-item"><span class="detail-label">性别:</span>${escapeHtml(info.gender)}</div>`,
    info.school && `<div class="detail-item"><span class="detail-label">学校:</span>${escapeHtml(info.school)}</div>`,
    info.major && `<div class="detail-item"><span class="detail-label">专业:</span>${escapeHtml(info.major)}</div>`,
    info.degree && `<div class="detail-item"><span class="detail-label">学历:</span>${escapeHtml(info.degree)}</div>`,
  ].filter(Boolean).join('');

  const photoHtml = info.photoUrl 
    ? `<img src="${escapeHtml(info.photoUrl)}" class="photo" alt="照片" />`
    : '';

  return `
    <div class="section">
      <div class="personal-info">
        <div>
          <div class="name">${escapeHtml(info.name || '')}</div>
          <div class="personal-details">${details}</div>
        </div>
        ${photoHtml}
      </div>
    </div>
  `;
}

/**
 * 渲染列表类栏目
 */
function renderListSection(
  title: string,
  items: unknown[] | undefined,
  titleClass: string,
  renderItem: (item: Record<string, unknown>) => string
): string {
  if (!items || items.length === 0) return '';
  
  return `
    <div class="section">
      <div class="section-title${titleClass}">${title}</div>
      ${items.map(item => `<div class="item">${renderItem(item as Record<string, unknown>)}</div>`).join('')}
    </div>
  `;
}

/**
 * 格式化描述文本（支持换行和列表）
 */
function formatDescription(desc: string | undefined): string {
  if (!desc) return '';
  
  // 如果包含换行，转为列表
  if (desc.includes('\n')) {
    const lines = desc.split('\n').filter(line => line.trim());
    return `<ul>${lines.map(line => `<li>${escapeHtml(line.replace(/^[-•·]\s*/, ''))}</li>`).join('')}</ul>`;
  }
  
  return `<p>${escapeHtml(desc)}</p>`;
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ResumeData 类型（从 types.ts 导入会导致循环依赖，这里声明最小接口）
interface ResumeData {
  personalInfo?: {
    name?: string;
    gender?: string;
    phone?: string;
    email?: string;
    school?: string;
    major?: string;
    degree?: string;
    photoUrl?: string;
    [key: string]: unknown;
  };
  education?: Array<Record<string, unknown>>;
  experience?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  skills?: string[];
  certificates?: string[];
  evaluation?: string;
  [key: string]: unknown;
}
