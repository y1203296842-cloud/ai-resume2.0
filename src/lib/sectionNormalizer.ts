/**
 * Section Normalizer — 动态栏目与固定字段的双向兼容层
 *
 * 核心职责：
 * 1. 从 legacy 固定字段（experience/projects/skills 等）构建 sections
 * 2. 从 sections 回填 legacy 固定字段（供旧模板使用）
 * 3. 规范化 sections 顺序（按 priority 排序，evaluation 放最后）
 *
 * 确保：新逻辑用 sections，旧模板用固定字段，二者始终同步。
 */

import type {
  ResumeData,
  ResumeSection,
  ResumeExperienceItem,
  ResumeListItem,
  ResumeTextItem,
} from './types';

// 已知的 legacy section id 映射
const LEGACY_SECTION_IDS: Record<string, string> = {
  education: 'education',
  experience: 'experience',
  projects: 'projects',
  skills: 'skills',
  certificates: 'certificates',
  languages: 'languages',
  evaluation: 'evaluation',
};

/**
 * 确保 resumeData 有 sections 字段
 * 如果 sections 为空但 legacy 字段有数据，从 legacy 字段构建
 */
export function ensureSections(data: ResumeData): ResumeSection[] {
  if (data.sections && data.sections.length > 0) {
    return sortSections(data.sections);
  }

  const sections: ResumeSection[] = [];

  // 教育经历
  if (data.education && data.education.length > 0) {
    sections.push({
      id: 'education',
      title: '教育背景',
      itemType: 'experience-item',
      placement: 'main',
      priority: 50,
      items: data.education.map((edu) => ({
        type: 'experience-item' as const,
        title: edu.school,
        subtitle: [edu.degree, edu.major].filter(Boolean).join(' · ') || undefined,
        startDate: edu.startDate,
        endDate: edu.endDate,
        description: edu.description ? [edu.description].filter(Boolean) : [],
        meta: edu.gpa || undefined,
      })),
    });
  }

  // 工作经历
  if (data.experience && data.experience.length > 0) {
    sections.push({
      id: 'experience',
      title: '工作经历',
      itemType: 'experience-item',
      placement: 'main',
      priority: 90,
      items: data.experience.map((exp) => ({
        type: 'experience-item' as const,
        title: exp.company,
        subtitle: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: Array.isArray(exp.description) ? exp.description : [],
      })),
    });
  }

  // 项目经历
  if (data.projects && data.projects.length > 0) {
    sections.push({
      id: 'projects',
      title: '项目经历',
      itemType: 'experience-item',
      placement: 'main',
      priority: 80,
      items: data.projects.map((proj) => ({
        type: 'experience-item' as const,
        title: proj.name,
        subtitle: proj.role,
        description: Array.isArray(proj.description) ? proj.description : [],
        meta: proj.techStack,
      })),
    });
  }

  // 技能
  if (data.skills && data.skills.length > 0) {
    sections.push({
      id: 'skills',
      title: '专业技能',
      itemType: 'list-item',
      placement: 'sidebar',
      priority: 70,
      items: [{ type: 'list-item' as const, items: data.skills }],
    });
  }

  // 证书
  if (data.certificates && data.certificates.length > 0) {
    sections.push({
      id: 'certificates',
      title: '证书资质',
      itemType: 'list-item',
      placement: 'sidebar',
      priority: 40,
      items: [{ type: 'list-item' as const, items: data.certificates }],
    });
  }

  // 语言
  if (data.languages && data.languages.length > 0) {
    sections.push({
      id: 'languages',
      title: '语言能力',
      itemType: 'list-item',
      placement: 'sidebar',
      priority: 30,
      items: [{ type: 'list-item' as const, items: data.languages }],
    });
  }

  // 个人优势
  if (data.evaluation) {
    sections.push({
      id: 'evaluation',
      title: '个人优势',
      itemType: 'text-item',
      placement: 'main',
      priority: 10,
      items: [{ type: 'text-item' as const, content: data.evaluation }],
    });
  }

  return sortSections(sections);
}

/**
 * 按 priority 降序排序 sections，evaluation 始终放最后
 */
export function sortSections(sections: ResumeSection[]): ResumeSection[] {
  const withoutEval = sections.filter((s) => s.id !== 'evaluation');
  const evalSection = sections.find((s) => s.id === 'evaluation');

  withoutEval.sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    return pb - pa;
  });

  return evalSection ? [...withoutEval, evalSection] : withoutEval;
}

/**
 * 从 sections 回填 legacy 固定字段
 * 供尚未迁移到动态 sections 的旧模板/导出器使用
 */
export function syncLegacyFields(data: ResumeData): ResumeData {
  if (!data.sections || data.sections.length === 0) {
    return data;
  }

  const result = { ...data };

  for (const section of data.sections) {
    // 按 item 实际 type 处理，而非 section.itemType
    const expItems = section.items.filter(
      (i): i is ResumeExperienceItem => i.type === 'experience-item'
    );
    const listItems = section.items.filter(
      (i): i is ResumeListItem => i.type === 'list-item'
    );
    const textItems = section.items.filter(
      (i): i is ResumeTextItem => i.type === 'text-item'
    );

    if (expItems.length > 0) {
      const legacyItems = expItems.map((item) => ({
        company: item.title,
        position: item.subtitle || '',
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
      }));

      if (section.id === 'education') {
        result.education = expItems.map((item) => ({
          school: item.title,
          degree: '',
          major: item.subtitle || '',
          startDate: item.startDate,
          endDate: item.endDate,
          gpa: item.meta,
          description: item.description.join('; '),
        }));
      } else if (section.id === 'experience') {
        result.experience = legacyItems;
      } else if (section.id === 'projects') {
        result.projects = expItems.map((item) => ({
          name: item.title,
          role: item.subtitle,
          description: item.description,
          techStack: item.meta,
        }));
      }
    }

    if (listItems.length > 0) {
      const items = listItems.flatMap((i) => i.items).filter(Boolean);
      if (section.id === 'skills') result.skills = items;
      else if (section.id === 'certificates') result.certificates = items;
      else if (section.id === 'languages') result.languages = items;
    }

    if (textItems.length > 0) {
      const content = textItems.map((i) => i.content).join('\n');
      if (section.id === 'evaluation') result.evaluation = content;
    }
  }

  return result;
}

/**
 * 获取规范化后的完整 ResumeData
 * - sections 始终存在且已排序
 * - legacy 字段始终与 sections 同步
 */
export function normalizeResumeData(data: Partial<ResumeData>): ResumeData {
  const personalInfo = data.personalInfo ?? { name: '' };
  const sections = ensureSections(data as ResumeData);

  const result: ResumeData = {
    personalInfo,
    sections,
  };

  // 回填 legacy 字段
  return syncLegacyFields(result);
}

/**
 * 检查某个 section 是否有实际内容
 */
export function hasSectionContent(section: ResumeSection): boolean {
  if (!section || !section.items || section.items.length === 0) return false;

  for (const item of section.items) {
    if (item.type === 'experience-item') {
      if (item.title || (item.description && item.description.length > 0)) return true;
    } else if (item.type === 'list-item') {
      if (item.items && item.items.length > 0) return true;
    } else if (item.type === 'text-item') {
      if (item.content && item.content.trim().length > 0) return true;
    }
  }

  return false;
}

/**
 * 获取指定 id 的 section
 */
export function getSectionById(
  data: ResumeData,
  id: string
): ResumeSection | undefined {
  const sections = ensureSections(data);
  return sections.find((s) => s.id === id);
}

/**
 * LEGACY_SECTION_IDS 供外部引用
 */
export { LEGACY_SECTION_IDS };
