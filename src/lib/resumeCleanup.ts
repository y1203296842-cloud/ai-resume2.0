/**
 * 简历展示数据清洗规则
 *
 * 核心原则：
 * - 正式简历不是信息收集表，不允许把缺失信息写成占位文字
 * - 基础信息字段（PersonalInfo）不参与清洗，保留空字符串占位
 * - 只清洗 sections 内容和 legacy 字段内容中的占位文字
 * - 不破坏布局结构、不分页空白行、不模板留白
 *
 * 此规则自动适用于所有模板、所有栏目、所有未来新增字段。
 */

import type { ResumeData, ResumeSection, ResumeSectionItem } from './types';

/**
 * 占位内容匹配模式 — 涵盖中英文常见占位描述
 *
 * 匹配原则：整字符串匹配或作为独立短语出现，不误删真实内容中的部分文字
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^(未提供|未填写|暂无|未知|不详|待补充|待完善|用户未说明|无信息|暂未提供|尚未提供|暂无信息)$/i,
  /^(N\/A|n\/a|None|none|Not\s*provided|not\s*provided|TBD|tbd|Unknown|unknown|N\/A\s*—|—)$/i,
  /^(未提供|未填写|暂无|未知|不详|待补充|待完善|用户未说明).*$/i,
  /^(N\/A|None|Not\s*provided|Unknown).*$/i,
];

/**
 * 检查字符串是否为占位内容
 */
export function isPlaceholderContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * 清洗单个字符串：如果是占位内容返回空字符串，否则原样返回
 */
function cleanString(text: string | undefined | null): string {
  if (!text) return '';
  if (isPlaceholderContent(text)) return '';
  return text;
}

/**
 * 清洗字符串数组：移除占位项，保留真实内容
 */
function cleanStringArray(arr: string[] | undefined): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .map((s) => cleanString(s))
    .filter((s) => s.trim().length > 0);
}

/**
 * 清洗 section items 中的占位内容
 */
function cleanSectionItems(items: ResumeSectionItem[]): ResumeSectionItem[] {
  return items
    .map((item) => {
      if (item.type === 'experience-item') {
        return {
          ...item,
          title: cleanString(item.title),
          subtitle: cleanString(item.subtitle),
          meta: cleanString(item.meta),
          description: cleanStringArray(item.description),
        };
      }
      if (item.type === 'list-item') {
        return {
          ...item,
          items: cleanStringArray(item.items),
        };
      }
      if (item.type === 'text-item') {
        return {
          ...item,
          content: cleanString(item.content),
        };
      }
      return item;
    })
    .filter((item) => {
      // 过滤掉清洗后完全为空的 item
      if (item.type === 'experience-item') {
        return item.title || (item.description && item.description.length > 0) || item.subtitle;
      }
      if (item.type === 'list-item') {
        return item.items && item.items.length > 0;
      }
      if (item.type === 'text-item') {
        return item.content && item.content.trim().length > 0;
      }
      return true;
    });
}

/**
 * 清洗整个 ResumeData 中的占位内容
 *
 * 规则：
 * 1. personalInfo 不清洗（基础信息字段保留空字符串占位）
 * 2. sections 中所有字符串字段清洗
 * 3. legacy 字段（education/experience/projects/skills/certificates/languages/evaluation）清洗
 * 4. 清洗后为空的 section 被移除
 * 5. 不影响布局结构、分页空白、模板留白
 */
export function cleanResumeData(data: ResumeData): ResumeData {
  if (!data) return data;

  const result: ResumeData = {
    ...data,
    personalInfo: data.personalInfo, // 不清洗基础信息
  };

  // 清洗 sections
  if (result.sections && result.sections.length > 0) {
    result.sections = result.sections
      .map((section) => ({
        ...section,
        title: cleanString(section.title),
        items: cleanSectionItems(section.items),
      }))
      .filter((section) => {
        // 保留 evaluation section 即使清洗后内容为空（由 hasSectionContent 统一过滤）
        if (section.id === 'evaluation') {
          return section.items.some((i) => i.type === 'text-item' && i.content && i.content.trim().length > 0);
        }
        // 其他 section 清洗后如果 items 为空则移除
        return section.items.length > 0;
      });
  }

  // 清洗 legacy 字段
  if (result.skills) {
    result.skills = cleanStringArray(result.skills);
  }
  if (result.certificates) {
    result.certificates = cleanStringArray(result.certificates);
  }
  if (result.languages) {
    result.languages = cleanStringArray(result.languages);
  }
  if (result.evaluation) {
    result.evaluation = cleanString(result.evaluation);
  }
  if (result.experience) {
    result.experience = result.experience
      .map((exp) => ({
        ...exp,
        company: cleanString(exp.company),
        position: cleanString(exp.position),
        description: cleanStringArray(exp.description),
      }))
      .filter((exp) => exp.company || exp.position || (exp.description && exp.description.length > 0));
  }
  if (result.projects) {
    result.projects = result.projects
      .map((proj) => ({
        ...proj,
        name: cleanString(proj.name),
        role: cleanString(proj.role),
        description: cleanStringArray(proj.description),
        techStack: cleanString(proj.techStack),
      }))
      .filter((proj) => proj.name || (proj.description && proj.description.length > 0));
  }
  if (result.education) {
    result.education = result.education
      .map((edu) => ({
        ...edu,
        school: cleanString(edu.school),
        gpa: cleanString(edu.gpa),
        description: cleanString(edu.description),
      }))
      .filter((edu) => edu.school || edu.degree || edu.major);
  }

  return result;
}
