/**
 * 全局模板规则
 *
 * 这些规则适用于所有模板（现有 + 未来新增），不需要在每个模板中重复实现。
 *
 * 规则 1：personalInfo 必须始终保留
 * 规则 2：空栏目自动隐藏（模板不应渲染没有数据的栏目）
 * 规则 3：evaluation（个人优势）必须是正文最后一个非空栏目
 * 规则 4：所有栏目统一按 priority 排序，不区分 native/fallback
 * 规则 5：动态 sections 是主结构，固定 SectionType 仅作 legacy 兼容
 */

import type { ResumeData, ResumeSection } from '@/lib/types';
import { ensureSections, hasSectionContent } from '@/lib/sectionNormalizer';
import type { SectionType } from './types';

/**
 * 检查某个 section 是否有实际数据
 */
export function hasSectionData(data: ResumeData, section: SectionType): boolean {
  const sections = ensureSections(data);
  const found = sections.find((s) => s.id === section);
  if (found) {
    return hasSectionContent(found);
  }
  return false;
}

/**
 * 获取所有非空 section 的 id 列表
 * 优先使用动态 sections，按 priority 排序
 */
export function getNonEmptySectionIds(data: ResumeData): string[] {
  const sections = ensureSections(data);
  return sections.filter((s) => hasSectionContent(s)).map((s) => s.id);
}

/**
 * 获取需要 fallback 渲染的 section 列表
 * = 数据中有值 + 模板不原生支持
 *
 * 在动态栏目架构下，所有栏目都由 GenericSectionRenderer 统一渲染，
 * fallback 仅用于极少数模板有特殊原生渲染逻辑的栏目。
 */
export function getFallbackSections(
  data: ResumeData,
  supportedSections: SectionType[]
): ResumeSection[] {
  const allSections = ensureSections(data);
  const supportedIds = new Set(supportedSections);

  return allSections.filter((s) => {
    if (s.id === 'personalInfo') return false;
    return hasSectionContent(s) && !supportedIds.has(s.id as SectionType);
  });
}

/**
 * 确保 evaluation 始终在最后
 * 返回新的有序列表，不修改原数组
 */
export function ensureEvaluationLast(sectionIds: string[]): string[] {
  const withoutEval = sectionIds.filter((s) => s !== 'evaluation');
  const hasEval = sectionIds.includes('evaluation');
  return hasEval ? [...withoutEval, 'evaluation'] : withoutEval;
}

/**
 * 获取模板应渲染的最终栏目顺序（动态栏目版本）
 *
 * 统一按 priority 降序排序，evaluation 始终在最后。
 * 不再区分 native/fallback — 所有栏目平等对待。
 */
export function getOrderedSectionIds(
  data: ResumeData,
  _supportedSections: SectionType[]
): string[] {
  const allSections = ensureSections(data);
  const withContent = allSections.filter((s) => hasSectionContent(s));
  const ids = withContent.map((s) => s.id);
  return ensureEvaluationLast(ids);
}

/**
 * 旧版函数名兼容（保留原 API）
 * @deprecated 请使用 getOrderedSectionIds
 */
export function getOrderedSections(
  data: ResumeData,
  supportedSections: SectionType[]
): SectionType[] {
  return getOrderedSectionIds(data, supportedSections) as SectionType[];
}

/**
 * @deprecated 请使用 getNonEmptySectionIds
 */
export function getNonEmptySections(data: ResumeData): SectionType[] {
  return getNonEmptySectionIds(data) as SectionType[];
}
