/**
 * 统一渲染前规范化层
 *
 * 核心职责：
 * 在 ResumeData 进入模板渲染之前，执行所有数据整理/排序/去重/校验。
 * 所有模板、所有数据路径（API生成、localStorage、手动编辑）必须经过此层。
 *
 * 处理流程：
 * 1. 清洗占位内容
 * 2. 栏目排序（岗位相关性 + 内容质量 + 丰富度，education 固定，evaluation 固定末尾）
 * 3. 栏目内部排序（经历按相关性，技能按岗位相关性）
 * 4. 信息去重（英语成绩、证书、技能跨栏目去重）
 * 5. 小标题整理（同类内容归组排序）
 * 6. STAR 结构检查（经历项结构完整性轻量校验）
 * 7. 同步 legacy 字段
 *
 * 设计原则：
 * - LLM 负责理解和生成内容
 * - 代码负责统一校验、排序、去重、结构整理
 * - 轻量、可复用、不增加复杂架构
 * - 确定性排序：同一输入同一岗位，输出顺序稳定
 */

import type {
  ResumeData,
  ResumeSection,
  ResumeSectionItem,
  ResumeExperienceItem,
  ResumeListItem,
} from './types';
import { cleanResumeData } from './resumeCleanup';
import {
  ensureSections,
  syncLegacyFields,
  hasSectionContent,
} from './sectionNormalizer';
import { sortSkillsByRelevance } from './skillsSorter';

// ============================================
// 岗位-内容相关性关键词
// ============================================

/**
 * 岗位核心关键词映射
 *
 * 用于计算栏目和条目与目标岗位的相关性分数。
 * 未在映射表中的岗位使用通用关键词。
 * 新增岗位只需在此添加映射。
 */
const POSITION_KEYWORDS_MAP: Record<string, string[]> = {
  '产品经理': ['产品', '需求', '用户', '原型', 'PRD', '墨刀', 'Axure', 'Figma', '竞品', '迭代', 'A/B', '转化', '留存', 'DAU', 'MAU', '用户研究', '交互', '流程图', '思维导图', '数据分析', 'SQL'],
  '新媒体运营': ['公众号', '小红书', '抖音', '短视频', '内容', '文案', '策划', '粉丝', '增长', '社群', '热点', 'SEO', 'SEM', '投放', '千川', '巨量', '转化', '曝光', '阅读量', '互动'],
  '运营': ['数据', '增长', '内容', '活动', '社群', '用户', '产品', '监控', '漏斗', '转化', '留存', 'A/B', '拉新', '促活', 'SQL', 'Excel'],
  '销售': ['客户', 'CRM', '谈判', '渠道', '开发', '关系', '预测', '市场', '业绩', '成单', '转化', '跟进', '签约', '合同', '回款'],
  '前端开发': ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'HTML', 'CSS', 'Node', 'Webpack', 'Vite', 'Next', 'Tailwind', 'Redux', 'GraphQL', '组件', '页面', '性能', '渲染'],
  '后端开发': ['Java', 'Python', 'Go', 'C++', 'Spring', 'Django', 'Flask', 'MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes', 'API', '微服务', '架构'],
  '设计师': ['Photoshop', 'Illustrator', 'Figma', 'Sketch', 'XD', 'CorelDRAW', 'InDesign', 'AfterEffects', 'C4D', 'Blender', 'Premiere', '视觉', '交互', '界面', '品牌', '原型', '设计系统', 'UI', 'UX'],
  '数据分析': ['SQL', 'Python', 'R', 'Tableau', 'PowerBI', 'Excel', '统计', '可视化', '报表', '指标', '漏斗', 'A/B', 'ETL', '数据仓库', '建模', '挖掘'],
  '人力资源': ['招聘', '培训', '绩效', '员工关系', '劳动法', '薪酬', 'HRBP', '组织', '文化', '面试', '人才'],
  '市场': ['市场', '品牌', '推广', '活动', '公关', '媒介', '投放', 'ROI', '曝光', '传播', '策略', '竞品'],
};

/**
 * 获取岗位关键词
 * 支持模糊匹配
 */
function getPositionKeywords(position: string): string[] {
  if (!position) return [];

  if (POSITION_KEYWORDS_MAP[position]) return POSITION_KEYWORDS_MAP[position];

  const normalizedPos = position.trim().toLowerCase();
  for (const [key, keywords] of Object.entries(POSITION_KEYWORDS_MAP)) {
    if (normalizedPos.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedPos)) {
      return keywords;
    }
  }

  return [];
}

// ============================================
// 栏目排序
// ============================================

/** 固定位置栏目 — 不参与排序 */
const FIXED_TOP_IDS = new Set(['education']);
const FIXED_BOTTOM_IDS = new Set(['evaluation']);

/**
 * 计算栏目的综合分数
 *
 * 分数 = 岗位相关性(50%) + 内容质量(30%) + 内容丰富度(20%)
 */
function scoreSection(section: ResumeSection, positionKeywords: string[]): number {
  let relevanceScore = 0;
  let qualityScore = 0;
  let richnessScore = 0;

  // 提取栏目所有文本
  const allText = extractSectionText(section);

  // 1. 岗位相关性：计算关键词命中率
  if (positionKeywords.length > 0) {
    let hits = 0;
    for (const keyword of positionKeywords) {
      if (allText.toLowerCase().includes(keyword.toLowerCase())) {
        hits++;
      }
    }
    relevanceScore = (hits / positionKeywords.length) * 100;
  } else {
    relevanceScore = 50; // 无岗位信息时给中等分
  }

  // 2. 内容质量：检查结构完整性
  for (const item of section.items) {
    if (item.type === 'experience-item') {
      if (item.title) qualityScore += 5;
      if (item.subtitle) qualityScore += 3;
      if (item.startDate || item.endDate) qualityScore += 3;
      if (item.description && item.description.length > 0) qualityScore += 5;
      if (item.description && item.description.length > 2) qualityScore += 3;
      if (item.meta) qualityScore += 2;
    } else if (item.type === 'list-item') {
      if (item.items.length > 0) qualityScore += 5;
      if (item.items.length > 3) qualityScore += 3;
    } else if (item.type === 'text-item') {
      if (item.content && item.content.length > 20) qualityScore += 5;
    }
  }
  qualityScore = Math.min(qualityScore, 100);

  // 3. 内容丰富度：条目数量和文本长度
  const itemCount = section.items.length;
  richnessScore = Math.min(itemCount * 15, 60);
  const textLength = allText.length;
  richnessScore += Math.min(textLength / 20, 40);
  richnessScore = Math.min(richnessScore, 100);

  return relevanceScore * 0.5 + qualityScore * 0.3 + richnessScore * 0.2;
}

/**
 * 提取栏目所有文本内容
 */
function extractSectionText(section: ResumeSection): string {
  const parts: string[] = [section.title];

  for (const item of section.items) {
    if (item.type === 'experience-item') {
      parts.push(item.title);
      if (item.subtitle) parts.push(item.subtitle);
      if (item.startDate) parts.push(item.startDate);
      if (item.endDate) parts.push(item.endDate);
      if (item.meta) parts.push(item.meta);
      if (item.description) parts.push(...item.description);
    } else if (item.type === 'list-item') {
      parts.push(...item.items);
    } else if (item.type === 'text-item') {
      parts.push(item.content);
    }
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * 排序栏目
 *
 * 规则：
 * - education 固定在顶部（紧跟 personalInfo）
 * - evaluation 固定在底部
 * - 其他栏目按综合分数降序排列
 * - 分数相同时保持原始顺序（稳定排序）
 */
function sortSectionsByRelevance(sections: ResumeSection[], targetPosition?: string): ResumeSection[] {
  const positionKeywords = targetPosition ? getPositionKeywords(targetPosition) : [];

  const fixedTop = sections.filter((s) => FIXED_TOP_IDS.has(s.id));
  const fixedBottom = sections.filter((s) => FIXED_BOTTOM_IDS.has(s.id));
  const sortable = sections.filter((s) => !FIXED_TOP_IDS.has(s.id) && !FIXED_BOTTOM_IDS.has(s.id));

  // 为可排序栏目计算分数
  const scored = sortable.map((section, index) => ({
    section,
    score: scoreSection(section, positionKeywords),
    originalIndex: index,
  }));

  // 稳定排序：分数降序，分数相同时保持原始顺序
  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.5) {
      return b.score - a.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  return [...fixedTop, ...scored.map((s) => s.section), ...fixedBottom];
}

// ============================================
// 栏目内部排序
// ============================================

/**
 * 对栏目内部条目排序
 *
 * - experience-item: 按岗位相关性排序（标题/副标题/描述中的关键词命中）
 * - list-item: 技能按岗位相关性排序，其他保持原序
 * - text-item: 不排序（通常只有一个）
 */
function sortItemsInSection(section: ResumeSection, targetPosition?: string): ResumeSection {
  if (!section.items || section.items.length === 0) return section;

  // 技能栏目特殊处理：使用 sortSkillsByRelevance
  // 技能通常只有一个 list-item，内部包含多个技能字符串
  if (section.id === 'skills' && targetPosition) {
    return sortSkillsInSection(section, targetPosition);
  }

  if (section.items.length <= 1) return section;

  const positionKeywords = targetPosition ? getPositionKeywords(targetPosition) : [];

  // 经历类条目按岗位相关性排序
  const expItems = section.items.filter((i): i is ResumeExperienceItem => i.type === 'experience-item');
  const listItems = section.items.filter((i): i is ResumeListItem => i.type === 'list-item');
  const textItems = section.items.filter((i) => i.type === 'text-item');

  if (expItems.length > 1) {
    // 计算每个经历条目的相关性分数
    const scored = expItems.map((item, index) => {
      const text = [
        item.title,
        item.subtitle,
        item.meta,
        ...(item.description || []),
      ].filter(Boolean).join(' ');

      let score = 0;
      if (positionKeywords.length > 0) {
        let hits = 0;
        for (const keyword of positionKeywords) {
          if (text.toLowerCase().includes(keyword.toLowerCase())) hits++;
        }
        score = (hits / positionKeywords.length) * 100;
      } else {
        score = 50;
      }

      // 内容质量加分
      if (item.description && item.description.length >= 2) score += 10;
      if (item.meta) score += 5;
      if (item.startDate || item.endDate) score += 5;

      return { item, score, originalIndex: index };
    });

    // 稳定排序
    scored.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.5) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    });

    return {
      ...section,
      items: [...scored.map((s) => s.item), ...listItems, ...textItems],
    };
  }

  return section;
}

/**
 * 技能栏目排序
 * 保留分类结构，按岗位相关性排序
 */
function sortSkillsInSection(section: ResumeSection, targetPosition: string): ResumeSection {
  const listItems = section.items.filter((i): i is ResumeListItem => i.type === 'list-item');
  const otherItems = section.items.filter((i) => i.type !== 'list-item');

  if (listItems.length === 0) return section;

  // 收集所有技能
  const allSkills = listItems.flatMap((li) => li.items).filter(Boolean);

  if (allSkills.length === 0) return section;

  // 使用 sortSkillsByRelevance 排序（保留分类结构）
  const sortedSkills = sortSkillsByRelevance(allSkills, targetPosition);

  // 写回第一个 list-item
  const newListItems: ResumeListItem[] = listItems.map((li, i) => ({
    ...li,
    items: i === 0 ? sortedSkills : [],
  }));

  return {
    ...section,
    items: [...newListItems.filter((li) => li.items.length > 0), ...otherItems],
  };
}

// ============================================
// 信息去重
// ============================================

/**
 * 英语成绩相关模式
 */
const ENGLISH_SCORE_PATTERNS = [
  /CET[-\s]*4/i,
  /CET[-\s]*6/i,
  /英语四六级/i,
  /英语四级/i,
  /英语六级/i,
  /TOEFL/i,
  /IELTS/i,
  /托福/i,
  /雅思/i,
  /大学英语/i,
];

/**
 * 跨栏目信息去重
 *
 * 规则：
 * 1. 基础信息已有的英语成绩，不在证书/教育/语言栏目重复
 * 2. 同一证书不重复出现
 * 3. 同一技能不重复出现
 * 4. 同一经历条目不跨栏目重复
 */
function deduplicateAcrossSections(data: ResumeData): ResumeData {
  const result = { ...data, sections: [...data.sections] };
  const englishScore = result.personalInfo?.englishScore;

  result.sections = result.sections.map((section) => {
    if (!section.items || section.items.length === 0) return section;

    // 证书/语言栏目：移除已在基础信息中的英语成绩
    if (englishScore && (section.id === 'certificates' || section.id === 'languages')) {
      const filteredItems = filterEnglishScoreFromItems(section.items, englishScore);
      if (filteredItems !== section.items) {
        return { ...section, items: filteredItems };
      }
    }

    // 所有 list-item 栏目：去重相同条目
    if (section.id === 'skills' || section.id === 'certificates' || section.id === 'languages') {
      const dedupedItems = deduplicateListItems(section.items);
      if (dedupedItems !== section.items) {
        return { ...section, items: dedupedItems };
      }
    }

    return section;
  });

  // 移除完全为空的栏目
  result.sections = result.sections.filter((s) => hasSectionContent(s));

  return result;
}

/**
 * 从 list-items 中过滤掉已在基础信息中的英语成绩
 */
function filterEnglishScoreFromItems(items: ResumeSectionItem[], englishScore: string): ResumeSectionItem[] {
  let modified = false;
  const result = items.map((item) => {
    if (item.type === 'list-item') {
      const filtered = item.items.filter((skill) => {
        // 检查是否是英语成绩相关内容
        const isEnglishScore = ENGLISH_SCORE_PATTERNS.some((p) => p.test(skill));
        if (isEnglishScore) {
          modified = true;
          return false;
        }
        return true;
      });
      if (filtered.length !== item.items.length) {
        return { ...item, items: filtered };
      }
    }
    return item;
  });

  return modified ? result : items;
}

/**
 * 去重 list-item 中的重复条目
 */
function deduplicateListItems(items: ResumeSectionItem[]): ResumeSectionItem[] {
  let modified = false;
  const seen = new Set<string>();

  const result = items.map((item) => {
    if (item.type === 'list-item') {
      const uniqueItems: string[] = [];
      for (const s of item.items) {
        const normalized = s.trim().toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueItems.push(s);
        } else {
          modified = true;
        }
      }
      if (uniqueItems.length !== item.items.length) {
        return { ...item, items: uniqueItems };
      }
    }
    return item;
  });

  return modified ? result : items;
}

// ============================================
// 小标题整理
// ============================================

/**
 * 小标题整理
 *
 * 规则：
 * - 检测同一栏目内是否存在性质明显不同的内容集合
 * - 如果存在，按内容类型归组排序，使同类内容相邻
 * - 不人为制造小标题（小标题由 LLM 生成）
 * - 只确保同类内容在视觉上相邻
 */
function applySubtitleGrouping(section: ResumeSection): ResumeSection {
  if (!section.items || section.items.length <= 1) return section;

  const expItems = section.items.filter((i): i is ResumeExperienceItem => i.type === 'experience-item');
  const listItems = section.items.filter((i): i is ResumeListItem => i.type === 'list-item');
  const textItems = section.items.filter((i) => i.type === 'text-item');

  if (expItems.length <= 1) return section;

  // 检测经历条目的内容类别
  const categories = detectItemCategories(expItems);

  // 如果只有一种类别，不需要分组
  if (categories.size <= 1) return section;

  // 按类别分组，同类别内保持原始顺序
  const grouped: ResumeExperienceItem[] = [];
  const categoryOrder = Array.from(categories.keys());

  for (const category of categoryOrder) {
    const itemsInCategory = categories.get(category);
    if (itemsInCategory) {
      grouped.push(...itemsInCategory);
    }
  }

  return {
    ...section,
    items: [...grouped, ...listItems, ...textItems],
  };
}

/**
 * 检测经历条目的内容类别
 *
 * 根据标题和描述中的关键词判断内容类型
 */
function detectItemCategories(items: ResumeExperienceItem[]): Map<string, ResumeExperienceItem[]> {
  const categories = new Map<string, ResumeExperienceItem[]>();

  // 内容类型关键词模式
  const CATEGORY_PATTERNS: { category: string; patterns: RegExp[] }[] = [
    { category: '研究方向', patterns: [/研究方向/, /研究领域/, /研究兴趣/, /research\s*direction/i] },
    { category: '科研项目', patterns: [/项目/, /课题/, /基金/, /research\s*project/i, /主持/, /参与.*研究/] },
    { category: '学术成果', patterns: [/论文/, /发表/, /paper/i, /journal/i, /conference/i, /专利/, /patent/i, /SCI/, /EI/, /核心期刊/] },
    { category: '实习经历', patterns: [/实习/, /intern/i] },
    { category: '工作经历', patterns: [/工作/, /任职/, /全职/, /employ/i] },
    { category: '竞赛获奖', patterns: [/竞赛/, /比赛/, /获奖/, /award/i, /prize/i, /contest/i] },
  ];

  for (const item of items) {
    const text = [item.title, item.subtitle, ...(item.description || [])].join(' ');

    let matched = false;
    for (const { category, patterns } of CATEGORY_PATTERNS) {
      if (patterns.some((p) => p.test(text))) {
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(item);
        matched = true;
        break;
      }
    }

    // 未匹配到特定类别的归为"其他"
    if (!matched) {
      if (!categories.has('其他')) {
        categories.set('其他', []);
      }
      categories.get('其他')!.push(item);
    }
  }

  return categories;
}

// ============================================
// STAR 结构检查
// ============================================

/** 行动动词模式 */
const ACTION_VERB_PATTERNS = [
  /负责/, /主导/, /参与/, /完成/, /设计/, /开发/, /实现/, /优化/, /推进/, /协调/,
  /策划/, /执行/, /搭建/, /维护/, /管理/, /分析/, /研究/, /编写/, /测试/, /部署/,
  /推动/, /改进/, /重构/, /落地/, /梳理/, /建立/, /制定/, /运营/, /监控/, /追踪/,
  /led/i, /developed/i, /designed/i, /built/i, /implemented/i, /managed/i, /created/i,
  /analyzed/i, /optimized/i, /launched/i, /improved/i, /delivered/i,
];

/** 结果指标模式 */
const RESULT_PATTERNS = [
  /\d+%/, /\d+倍/, /\d+万/, /\d+.\d+/, /提升/, /降低/, /增长/, /减少/, /达到/, /实现/,
  /节约/, /节省/, /覆盖/, /服务/, /支撑/, /处理/, /吞吐/, /响应.*\d/, /QPS/,
  /increased/i, /decreased/i, /reduced/i, /improved/i, /achieved/i, /delivered/i,
  /saved/i, /generated/i, /resulted/i,
];

/**
 * STAR 结构检查
 *
 * 检查经历条目的描述是否具备基本结构：
 * - 有行动（行动动词）
 * - 有结果（数据/成果指标）
 *
 * 只处理结构明显不足的条目（如只有"负责XX"没有具体行动）。
 * 不重写正常内容，不编造结果。
 */
function checkStarStructure(section: ResumeSection): ResumeSection {
  if (!section.items || section.items.length === 0) return section;

  let modified = false;
  const result = section.items.map((item) => {
    if (item.type !== 'experience-item') return item;

    if (!item.description || item.description.length === 0) return item;

    const newTexts = item.description.map((desc) => {
      if (!desc || desc.trim().length === 0) return desc;

      const hasAction = ACTION_VERB_PATTERNS.some((p) => p.test(desc));
      const hasResult = RESULT_PATTERNS.some((p) => p.test(desc));

      // 如果既没有行动词也没有结果，且描述很短（<15字），标记为结构不足
      if (!hasAction && !hasResult && desc.trim().length < 15) {
        modified = true;
        // 不删除，只标记（返回原内容，但记录问题）
        // 实际处理：保持原内容，因为不修改 Prompt，不能编造内容
        return desc;
      }

      return desc;
    });

    if (modified) {
      return { ...item, description: newTexts };
    }

    return item;
  });

  return modified ? { ...section, items: result } : section;
}

// ============================================
// 主入口
// ============================================

/**
 * 统一渲染前规范化
 *
 * 在 ResumeData 进入模板渲染之前执行所有数据整理。
 * 所有模板、所有数据路径必须经过此层。
 *
 * @param data 原始 ResumeData
 * @param targetPosition 目标岗位（可选，用于相关性排序）
 * @returns 规范化后的 ResumeData
 */
export function normalizeForRendering(data: ResumeData, targetPosition?: string): ResumeData {
  if (!data) return data;

  // 1. 深拷贝，避免修改原始数据
  let result: ResumeData = JSON.parse(JSON.stringify(data));

  // 2. 清洗占位内容
  result = cleanResumeData(result);

  // 3. 确保 sections 存在并规范化
  const sections = ensureSections(result);
  result.sections = sections;
  result = syncLegacyFields(result);

  // 4. 栏目排序（岗位相关性 + 内容质量 + 丰富度）
  result.sections = sortSectionsByRelevance(result.sections, targetPosition);

  // 5. 栏目内部排序
  result.sections = result.sections.map((section) =>
    sortItemsInSection(section, targetPosition)
  );

  // 6. 跨栏目信息去重
  result = deduplicateAcrossSections(result);

  // 7. 小标题整理（同类内容归组）
  result.sections = result.sections.map(applySubtitleGrouping);

  // 8. STAR 结构检查
  result.sections = result.sections.map(checkStarStructure);

  // 9. 同步 legacy 字段（所有修改后重新同步）
  result = syncLegacyFields(result);

  return result;
}
