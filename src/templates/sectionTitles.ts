import type { ResumeData } from '@/lib/types';
import type { SectionType } from './types';

const ZH_TITLES: Partial<Record<string, string>> = {
  personalInfo: '个人信息',
  education: '教育背景',
  experience: '工作经历',
  projects: '项目经历',
  skills: '专业技能',
  certificates: '证书',
  languages: '语言能力',
  evaluation: '个人优势',
};

const EN_TITLES: Partial<Record<string, string>> = {
  personalInfo: 'Personal Info',
  education: 'Education',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  certificates: 'Certifications',
  languages: 'Languages',
  evaluation: 'Summary',
};

export function isChineseResume(data: ResumeData): boolean {
  const name = data.personalInfo?.name || '';
  if (/[\u4e00-\u9fa5]/.test(name)) return true;

  // 检查动态 sections 中的中文内容
  if (data.sections && data.sections.length > 0) {
    const sectionText = data.sections
      .flatMap(s => [
        s.title,
        ...s.items.flatMap(item => {
          if (item.type === 'experience-item') return [item.title, item.subtitle || '', ...(item.description || [])];
          if (item.type === 'list-item') return item.items;
          if (item.type === 'text-item') return [item.content];
          return [];
        }),
      ])
      .join('');
    if (sectionText.length > 0 && /[\u4e00-\u9fa5]/.test(sectionText)) return true;
  }

  // legacy 字段检查
  const expText = data.experience?.flatMap(e => [e.company, e.position, ...(e.description || [])]).join('') || '';
  if (expText.length > 0 && /[\u4e00-\u9fa5]/.test(expText)) return true;

  const eduText = data.education?.map(e => `${e.school}${e.major || ''}${e.degree || ''}`).join('') || '';
  if (eduText.length > 0 && /[\u4e00-\u9fa5]/.test(eduText)) return true;

  const projText = data.projects?.flatMap(p => [p.name, ...(p.description || [])]).join('') || '';
  if (projText.length > 0 && /[\u4e00-\u9fa5]/.test(projText)) return true;

  const evalText = data.evaluation || '';
  if (evalText.length > 0 && /[\u4e00-\u9fa5]/.test(evalText)) return true;

  const skillText = data.skills?.join('') || '';
  if (skillText.length > 0 && /[\u4e00-\u9fa5]/.test(skillText)) return true;

  const hasAnyContent = name.length > 0 || expText.length > 0 || eduText.length > 0 || projText.length > 0 || evalText.length > 0 || skillText.length > 0;
  if (hasAnyContent) return false;

  return true;
}

export function getSectionTitle(section: SectionType, isChinese: boolean): string {
  const titles = isChinese ? ZH_TITLES : EN_TITLES;
  return titles[section] ?? section;
}

/**
 * 解析栏目标题，优先使用 fallbackTitle（来自 section.title），
 * 其次查找已知栏目标题映射，最后回退到 sectionId 本身
 */
export function resolveSectionTitle(
  sectionId: string,
  isChinese: boolean,
  fallbackTitle?: string
): string {
  if (fallbackTitle) return fallbackTitle;
  const titles = isChinese ? ZH_TITLES : EN_TITLES;
  return titles[sectionId] ?? sectionId;
}
