/**
 * Resume Auto Enhancement - 简历自动补强机制
 * 
 * 当质量检测不通过时，自动分析缺口并补强
 * 不是简单告诉用户重新填写，而是主动优化
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

import type { ResumeData } from '../types';
import type { QualityCheckResult } from '../resumeQuality/resumeQualityChecker';

// ============================================
// 类型定义
// ============================================

export interface EnhancementPlan {
  /** 需要补强的维度 */
  weakDimensions: string[];
  /** 岗位关键能力缺口 */
  gaps: GapAnalysis[];
  /** 可迁移的已有经历 */
  transferableSkills: TransferableSkill[];
  /** 建议补充的内容 */
  suggestions: EnhancementSuggestion[];
  /** 自动补强后的简历数据 */
  enhancedData: ResumeData;
}

export interface GapAnalysis {
  /** 缺口名称 */
  name: string;
  /** 重要程度 1-5 */
  importance: number;
  /** 是否可从已有经历迁移 */
  transferable: boolean;
  /** 迁移来源（如果有） */
  source?: string;
}

export interface TransferableSkill {
  /** 已有经历描述 */
  original: string;
  /** 迁移后的表述 */
  enhanced: string;
  /** 匹配的目标能力 */
  targetAbility: string;
}

export interface EnhancementSuggestion {
  /** 建议类型 */
  type: 'content' | 'keyword' | 'structure' | 'evaluation';
  /** 建议内容 */
  description: string;
  /** 是否已自动应用 */
  autoApplied: boolean;
}

// ============================================
// 岗位能力模型
// ============================================

const POSITION_ABILITY_MODEL: Record<string, string[]> = {
  '产品经理': ['需求分析', '用户研究', '产品设计', '项目管理', '数据分析', '沟通协调'],
  '运营': ['内容策划', '用户增长', '数据分析', '活动策划', '社群运营', '文案能力'],
  '新媒体运营': ['内容创作', '平台运营', '数据分析', '选题策划', '粉丝互动', '热点追踪'],
  '前端开发': ['HTML/CSS', 'JavaScript', '框架使用', '工程化', '性能优化', '协作能力'],
  '后端开发': ['编程语言', '数据库', 'API设计', '系统架构', '性能优化', '安全意识'],
  '设计': ['视觉设计', '交互设计', '设计工具', '设计系统', '用户研究', '沟通能力'],
  '数据分析': ['SQL', '统计分析', '数据可视化', '业务理解', '报告撰写', '工具使用'],
  '销售': ['客户开发', '商务谈判', '关系维护', '目标达成', '市场洞察', '抗压能力'],
  '人力资源': ['招聘', '培训', '绩效管理', '员工关系', '劳动法规', '沟通能力'],
  '客服': ['沟通能力', '问题解决', '耐心细致', '情绪管理', '产品知识', '服务意识'],
};

// ============================================
// 核心API
// ============================================

/**
 * 分析简历缺口并生成补强计划
 */
export function analyzeAndEnhance(
  resumeData: ResumeData,
  qualityResult: QualityCheckResult,
  targetPosition?: string
): EnhancementPlan {
  const weakDimensions = qualityResult.dimensions
    .filter(d => d.score < d.maxScore * 0.7)
    .map(d => d.name);

  const gaps = analyzeGaps(resumeData, targetPosition);
  const transferableSkills = findTransferableSkills(resumeData, gaps, targetPosition);
  const suggestions = generateSuggestions(qualityResult, gaps, targetPosition);
  const enhancedData = applyAutoEnhancements(resumeData, transferableSkills, suggestions, targetPosition);

  return {
    weakDimensions,
    gaps,
    transferableSkills,
    suggestions,
    enhancedData,
  };
}

/**
 * 分析岗位能力缺口
 */
function analyzeGaps(resumeData: ResumeData, targetPosition?: string): GapAnalysis[] {
  if (!targetPosition) return [];

  const requiredAbilities = POSITION_ABILITY_MODEL[targetPosition] || POSITION_ABILITY_MODEL['运营'] || [];
  const gaps: GapAnalysis[] = [];

  // 收集简历中已有的能力关键词
  const existingKeywords = collectExistingKeywords(resumeData);

  for (const ability of requiredAbilities) {
    const found = existingKeywords.some(k =>
      k.includes(ability) || ability.includes(k) ||
      fuzzyMatch(k, ability)
    );

    if (!found) {
      gaps.push({
        name: ability,
        importance: getAbilityImportance(ability, targetPosition),
        transferable: false, // 后续分析
        source: undefined,
      });
    }
  }

  return gaps.sort((a, b) => b.importance - a.importance);
}

/**
 * 收集简历中已有的关键词
 */
function collectExistingKeywords(data: ResumeData): string[] {
  const keywords: string[] = [];

  // 从技能列表收集
  if (data.skills) {
    keywords.push(...data.skills);
  }

  // 从经历描述收集
  if (data.experience) {
    for (const exp of data.experience) {
      keywords.push(exp.position);
      if (exp.description) {
        keywords.push(...exp.description);
      }
    }
  }

  // 从项目描述收集
  if (data.projects) {
    for (const proj of data.projects) {
      if (proj.description) {
        keywords.push(...proj.description);
      }
      if (proj.techStack) {
        keywords.push(proj.techStack);
      }
    }
  }

  // 从评价收集
  if (data.evaluation) {
    keywords.push(data.evaluation);
  }

  return keywords;
}

/**
 * 查找可迁移的技能
 */
function findTransferableSkills(
  data: ResumeData,
  gaps: GapAnalysis[],
  targetPosition?: string
): TransferableSkill[] {
  const transferable: TransferableSkill[] = [];

  if (!targetPosition || gaps.length === 0) return transferable;

  // 从已有经历中寻找可迁移的内容
  const allDescriptions = [
    ...(data.experience?.flatMap(e => e.description) || []),
    ...(data.projects?.flatMap(p => p.description) || []),
  ];

  for (const desc of allDescriptions) {
    for (const gap of gaps) {
      const match = findTransferableMatch(desc, gap.name);
      if (match) {
        transferable.push({
          original: desc,
          enhanced: match,
          targetAbility: gap.name,
        });
        gap.transferable = true;
        gap.source = desc;
        break;
      }
    }
  }

  return transferable;
}

/**
 * 查找可迁移匹配
 */
function findTransferableMatch(description: string, targetAbility: string): string | null {
  // 简单的关键词映射
  const transferMap: Record<string, string[]> = {
    '需求分析': ['收集需求', '分析需求', '理解需求', '调研', '用户反馈'],
    '用户研究': ['用户调研', '用户访谈', '问卷', '用户反馈', '用户体验'],
    '产品设计': ['设计方案', '方案设计', '原型', '功能设计', '界面设计'],
    '项目管理': ['推进', '协调', '排期', '跟进', '负责', '主导'],
    '数据分析': ['数据', '统计', '分析', '报表', '指标', '转化率'],
    '内容策划': ['策划', '内容', '文案', '编辑', '撰写', '创作'],
    '沟通协调': ['沟通', '协调', '对接', '合作', '团队'],
  };

  const keywords = transferMap[targetAbility] || [];
  for (const keyword of keywords) {
    if (description.includes(keyword)) {
      // 增强表述
      return enhanceDescription(description, targetAbility);
    }
  }

  return null;
}

/**
 * 增强描述表述
 */
function enhanceDescription(original: string, targetAbility: string): string {
  // 添加目标能力的关键词
  const enhancementMap: Record<string, string> = {
    '需求分析': '通过需求分析和调研，',
    '用户研究': '基于用户研究，',
    '产品设计': '在产品设计方面，',
    '项目管理': '通过项目管理和推进，',
    '数据分析': '通过数据分析驱动决策，',
    '内容策划': '通过内容策划与创作，',
  };

  const prefix = enhancementMap[targetAbility] || '';
  return prefix + original;
}

/**
 * 生成补强建议
 */
function generateSuggestions(
  qualityResult: QualityCheckResult,
  gaps: GapAnalysis[],
  targetPosition?: string
): EnhancementSuggestion[] {
  const suggestions: EnhancementSuggestion[] = [];

  // 基于质量检测结果的维度建议
  for (const dim of qualityResult.dimensions) {
    if (dim.score < dim.maxScore * 0.7) {
      suggestions.push({
        type: 'content',
        description: `${dim.name}维度得分较低(${dim.score}/${dim.maxScore})，建议补充相关内容`,
        autoApplied: false,
      });
    }
  }

  // 基于缺口分析的建议
  for (const gap of gaps) {
    if (gap.transferable) {
      suggestions.push({
        type: 'keyword',
        description: `可从已有经历中提炼"${gap.name}"能力`,
        autoApplied: true,
      });
    } else {
      suggestions.push({
        type: 'keyword',
        description: `建议补充"${gap.name}"相关经历或技能`,
        autoApplied: false,
      });
    }
  }

  // 个人优势建议
  if (targetPosition) {
    suggestions.push({
      type: 'evaluation',
      description: `个人优势应紧扣"${targetPosition}"岗位需求`,
      autoApplied: true,
    });
  }

  return suggestions;
}

/**
 * 自动应用补强
 */
function applyAutoEnhancements(
  data: ResumeData,
  transferableSkills: TransferableSkill[],
  suggestions: EnhancementSuggestion[],
  targetPosition?: string
): ResumeData {
  const enhanced: ResumeData = JSON.parse(JSON.stringify(data));

  // 应用可迁移技能到经历描述
  if (transferableSkills.length > 0 && enhanced.experience) {
    const experiences = enhanced.experience;
    for (const skill of transferableSkills) {
      for (let i = 0; i < experiences.length; i++) {
        const exp = experiences[i];
        const descriptions: string[] = exp.description || [];
        const idx = descriptions.findIndex((d: string) => d === skill.original || d.includes(skill.original));
        if (idx >= 0) {
          exp.description[idx] = skill.enhanced;
        }
      }
    }
  }

  // 自动生成个人优势（如果没有或太短）
  if ((!enhanced.evaluation || enhanced.evaluation.length < 20) && targetPosition) {
    enhanced.evaluation = generateEvaluation(targetPosition, enhanced);
  }

  return enhanced;
}

/**
 * 自动生成个人优势
 *
 * 原则：
 * - 只从用户真实经历/技能/项目中提炼，不虚构
 * - 紧扣目标岗位核心要求
 * - 不写通用废话（"善于团队协作"、"学习能力强"等无依据表述）
 * - 篇幅 2-3 句话
 */
function generateEvaluation(targetPosition: string, data: ResumeData): string {
  const parts: string[] = [];

  // 1. 从工作经历中提炼与岗位相关的核心能力
  if (data.experience && data.experience.length > 0) {
    const topExp = data.experience[0];
    const expDesc = topExp.description?.join('；') || '';
    if (topExp.position) {
      const positionPhrase = `${topExp.position}经历`.replace(/经历经历$/, '经历');
      if (expDesc) {
        parts.push(`具备${targetPosition}方向的${positionPhrase}，${expDesc.substring(0, 40)}`);
      } else {
        parts.push(`具备${targetPosition}方向的${positionPhrase}`);
      }
    }
  }

  // 2. 从项目经历中提炼实战能力
  if (data.projects && data.projects.length > 0) {
    const topProj = data.projects[0];
    if (topProj.name) {
      const projDesc = topProj.description?.join('；') || '';
      if (projDesc) {
        parts.push(`在${topProj.name}中${projDesc.substring(0, 40)}`);
      } else {
        parts.push(`主导/参与${topProj.name}`);
      }
    }
  }

  // 3. 从技能中提炼岗位匹配度
  if (data.skills && data.skills.length > 0) {
    const topSkills = data.skills.slice(0, 3).join('、');
    parts.push(`掌握${topSkills}等核心技能`);
  }

  // 4. 如果没有任何真实数据，生成最低限度的通用评价（仅含岗位名）
  if (parts.length === 0) {
    return `期望在${targetPosition}方向发展，期待将所学知识应用于实际工作中。`;
  }

  // 5. 组合评价，保持简洁
  const evaluation = parts.slice(0, 3).join('，') + '。';
  return evaluation;
}

// ============================================
// 个人优势内容过滤
// ============================================

/**
 * 非职业内容关键词模式
 *
 * 匹配纯个人爱好/性格描述，这些内容不应出现在正式简历的个人优势中
 */
const NON_PROFESSIONAL_PATTERNS = [
  /热爱[^，。；,;]*(运动|篮球|足球|羽毛球|乒乓球|网球|跑步|健身|音乐|电影|旅行|旅游|阅读|读书|摄影|游戏|烹饪|美食)/,
  /喜欢[^，。；,;]*(运动|篮球|足球|羽毛球|乒乓球|网球|跑步|健身|音乐|电影|旅行|旅游|阅读|读书|摄影|游戏|烹饪|美食)/,
  /爱好[^，。；,;]*(运动|篮球|足球|羽毛球|乒乓球|网球|跑步|健身|音乐|电影|旅行|旅游|阅读|读书|摄影|游戏|烹饪|美食)/,
  /性格(开朗|活泼|外向|内向|温和|随和|乐观|积极|热情|善良|诚实|踏实|稳重)/,
  /热爱生活/,
  /喜欢交朋友/,
  /兴趣广泛/,
];

/**
 * 职业内容关键词（如果包含这些词，说明评价中有职业内容，不全部替换）
 */
const PROFESSIONAL_INDICATORS = [
  '经历', '项目', '工作', '实习', '团队', '管理', '协调', '分析', '设计',
  '开发', '运营', '策划', '执行', '优化', '负责', '主导', '参与', '完成',
  '成果', '业绩', '能力', '技能', '专业', '岗位', '匹配', '相关',
  '组织', '沟通', '协作', '解决问题', '数据', '用户', '产品', '技术',
  'leadership', 'experience', 'project', 'team', 'management',
];

/**
 * 检查文本是否仅包含非职业内容
 */
function isPurelyNonProfessional(text: string): boolean {
  if (!text || text.trim().length === 0) return true;

  // 检查是否包含任何职业内容指标
  const hasProfessional = PROFESSIONAL_INDICATORS.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasProfessional) return false;

  // 检查是否匹配非职业模式
  const nonProMatches = NON_PROFESSIONAL_PATTERNS.filter((pattern) =>
    pattern.test(text)
  );

  // 如果没有职业内容且匹配了非职业模式，则认为是纯非职业内容
  return nonProMatches.length > 0;
}

/**
 * 过滤个人优势内容
 *
 * 如果评价内容仅包含非职业信息（爱好、性格描述等），
 * 且用户有真实经历数据，则从真实经历中重新提炼职业能力。
 *
 * 不直接删除用户内容，而是用从真实经历中提炼的职业能力替换。
 */
export function filterEvaluationContent(
  data: ResumeData,
  targetPosition?: string
): ResumeData {
  if (!data) return data;

  const evaluation =
    data.evaluation ||
    data.sections?.find((s) => s.id === 'evaluation')?.items?.find((i) => i.type === 'text-item')?.content;

  if (!evaluation || !isPurelyNonProfessional(evaluation)) {
    return data;
  }

  // 评价内容纯非职业，尝试从真实经历中重新生成
  const hasRealExperience =
    (data.experience && data.experience.length > 0) ||
    (data.projects && data.projects.length > 0) ||
    (data.sections && data.sections.some((s) =>
      s.id !== 'evaluation' && s.items && s.items.some((i) =>
        i.type === 'experience-item' && (i.title || (i.description && i.description.length > 0))
      )
    ));

  if (!hasRealExperience || !targetPosition) {
    // 没有真实经历数据或没有目标岗位，不替换
    return data;
  }

  // 从真实经历中生成职业能力评价
  const newEvaluation = generateEvaluation(targetPosition, data);

  const result = { ...data };
  result.evaluation = newEvaluation;

  // 同步到 sections
  if (result.sections) {
    result.sections = result.sections.map((s) => {
      if (s.id === 'evaluation') {
        return {
          ...s,
          title: '个人优势',
          items: s.items.map((i) =>
            i.type === 'text-item'
              ? { ...i, content: newEvaluation }
              : i
          ),
        };
      }
      return s;
    });
  }

  return result;
}

// ============================================
// 工具函数
// ============================================

function getAbilityImportance(ability: string, position: string): number {
  const highImportance: Record<string, string[]> = {
    '产品经理': ['需求分析', '用户研究', '产品设计'],
    '运营': ['内容策划', '数据分析', '用户增长'],
    '前端开发': ['HTML/CSS', 'JavaScript', '框架使用'],
    '后端开发': ['编程语言', '数据库', 'API设计'],
  };

  const highList = highImportance[position] || [];
  if (highList.includes(ability)) return 5;
  return 3;
}

function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  // 简单的包含关系检查
  return a.includes(b) || b.includes(a);
}
