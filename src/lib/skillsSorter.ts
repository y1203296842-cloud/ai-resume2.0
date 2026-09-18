/**
 * 技能岗位相关性排序
 *
 * 核心原则：
 * - 保留已有分类结构（不把所有技能混成一串）
 * - 分类之间按岗位相关性排序
 * - 分类内部按岗位相关性排序
 * - 不硬编码"某些技能永远排第一"，根据目标岗位动态计算
 * - 支持任意岗位、任意技能，未来新增岗位/技能自动适用
 */

/**
 * 岗位-技能相关性映射表
 *
 * 每个岗位定义三级相关性：
 * - high: 强相关技能（岗位核心工具/能力）
 * - medium: 辅助相关技能（通用办公/分析能力）
 * - low: 弱相关但仍有价值的技能
 *
 * 未出现在任何级别中的技能默认为 medium。
 * 新增岗位只需在此添加映射，无需修改排序逻辑。
 */
const POSITION_SKILLS_MAP: Record<string, { high: string[]; medium: string[]; low: string[] }> = {
  '产品经理': {
    high: ['Figma', '墨刀', 'XMind', 'Axure', 'Sketch', 'PRD', '需求分析', '用户研究', '数据分析', 'SQL', '产品原型', '流程图', '思维导图', '竞品分析', 'A/B测试', '用户画像', '产品设计', '交互设计'],
    medium: ['Excel', 'Word', 'PPT', 'PowerPoint', 'Python', 'R', 'Tableau', 'PowerBI', 'Jira', 'Confluence', 'Trello', 'Notion', 'Slack', '飞书', '钉钉'],
    low: ['SU', 'Rhino', '犀牛', '3DMax', 'Maya', 'Blender', 'AutoCAD', 'CAD', 'V-Ray', 'Lumion', 'Enscape', 'PS', 'Photoshop', 'Illustrator', 'AI', 'CorelDRAW', 'Premiere', 'AE', 'AfterEffects', '剪映'],
  },
  '新媒体运营': {
    high: ['公众号', '小红书', '抖音', '短视频', '内容策划', '文案', '数据分析', '热点追踪', '社群运营', '用户增长', 'SEO', 'SEM', '投放', '巨量引擎', '千川', '磁力引擎'],
    medium: ['Excel', 'Word', 'PPT', 'PS', 'Photoshop', 'Canva', '创客贴', '剪映', 'PR', 'Premiere', '飞书', '钉钉'],
    low: ['SU', 'Rhino', '3DMax', 'AutoCAD', 'CAD', 'Python', 'Java', 'C++'],
  },
  '销售': {
    high: ['客户管理', 'CRM', '销售技巧', '商务谈判', '渠道拓展', '客户开发', '关系维护', '销售预测', '市场分析'],
    medium: ['Excel', 'Word', 'PPT', '飞书', '钉钉', '企业微信', 'Notion'],
    low: ['PS', 'Photoshop', 'SU', 'Rhino', '3DMax', 'AutoCAD', 'Python', 'Java'],
  },
  '前端开发': {
    high: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'HTML', 'CSS', 'Node.js', 'Webpack', 'Vite', 'Next.js', 'Nuxt.js', 'Tailwind', 'Redux', 'GraphQL'],
    medium: ['Git', 'Docker', 'Nginx', 'Linux', 'Python', 'SQL', 'MongoDB', 'Redis', 'Jest', 'Cypress'],
    low: ['PS', 'Photoshop', 'SU', 'Rhino', '3DMax', 'AutoCAD', 'Figma', '墨刀'],
  },
  '后端开发': {
    high: ['Java', 'Python', 'Go', 'C++', 'Spring', 'Django', 'Flask', 'MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes', 'Microservices'],
    medium: ['Git', 'Linux', 'Nginx', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'ELK'],
    low: ['PS', 'Photoshop', 'SU', 'Rhino', '3DMax', 'Figma', '墨刀', 'XMind'],
  },
  '设计师': {
    high: ['PS', 'Photoshop', 'AI', 'Illustrator', 'Figma', 'Sketch', 'XD', 'AdobeXD', 'CorelDRAW', 'InDesign', 'AfterEffects', 'AE', 'C4D', 'Cinema4D', 'Blender', 'Premiere', 'PR'],
    medium: ['SU', 'Rhino', '犀牛', '3DMax', 'Maya', 'AutoCAD', 'CAD', 'V-Ray', 'Lumion', 'Enscape', 'Word', 'Excel', 'PPT'],
    low: ['Python', 'Java', 'SQL', 'C++'],
  },
  '运营': {
    high: ['数据分析', '用户增长', '内容策划', '活动策划', '社群运营', '用户运营', '产品运营', '数据监控', 'SQL', 'Excel', 'A/B测试', '漏斗分析'],
    medium: ['Word', 'PPT', '飞书', '钉钉', 'Notion', 'Trello', 'Jira', 'PS', 'Photoshop', 'Canva'],
    low: ['SU', 'Rhino', '3DMax', 'AutoCAD', 'Python', 'Java', 'C++'],
  },
};

/**
 * 默认相关性（未在映射表中出现的岗位）
 */
const DEFAULT_RELEVANCE = { high: [] as string[], medium: [] as string[], low: [] as string[] };

/**
 * 获取岗位的技能相关性映射
 * 支持模糊匹配岗位名称
 */
function getPositionRelevance(position: string): { high: string[]; medium: string[]; low: string[] } {
  if (!position) return DEFAULT_RELEVANCE;

  // 精确匹配
  if (POSITION_SKILLS_MAP[position]) return POSITION_SKILLS_MAP[position];

  // 模糊匹配
  const normalizedPos = position.trim().toLowerCase();
  for (const [key, value] of Object.entries(POSITION_SKILLS_MAP)) {
    if (normalizedPos.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedPos)) {
      return value;
    }
    // 检查是否包含映射表中的关键词
    for (const k of Object.keys(POSITION_SKILLS_MAP)) {
      if (position.includes(k) || k.includes(position)) {
        return POSITION_SKILLS_MAP[k];
      }
    }
  }

  return DEFAULT_RELEVANCE;
}

/**
 * 计算单个技能的岗位相关性分数
 * 分数越高越相关
 */
function scoreSkill(skill: string, relevance: { high: string[]; medium: string[]; low: string[] }): number {
  const skillLower = skill.toLowerCase().trim();

  // 检查 high 相关性
  for (const s of relevance.high) {
    if (skillLower.includes(s.toLowerCase()) || s.toLowerCase().includes(skillLower)) return 100;
  }
  // 检查 medium 相关性
  for (const s of relevance.medium) {
    if (skillLower.includes(s.toLowerCase()) || s.toLowerCase().includes(skillLower)) return 50;
  }
  // 检查 low 相关性
  for (const s of relevance.low) {
    if (skillLower.includes(s.toLowerCase()) || s.toLowerCase().includes(skillLower)) return 10;
  }

  // 未出现在映射表中的技能默认给中等分数（不惩罚未知技能）
  return 30;
}

/**
 * 检测技能字符串是否包含分类前缀
 * 例如 "建模软件：SU、Rhino" → { category: "建模软件", skills: ["SU", "Rhino"] }
 */
function parseSkillCategory(skillStr: string): { category: string; skills: string[] } | null {
  // 匹配 "分类：技能1、技能2" 或 "分类: 技能1,技能2" 等格式
  const match = skillStr.match(/^(.+?)[：:]\s*(.+)$/);
  if (!match) return null;

  const category = match[1].trim();
  const skillsStr = match[2].trim();

  // 如果分类名太长（>10字符），可能不是分类而是普通描述
  if (category.length > 10) return null;

  const skills = skillsStr.split(/[,，、;；\/]/).map((s) => s.trim()).filter(Boolean);
  if (skills.length === 0) return null;

  return { category, skills };
}

/**
 * 计算分类的岗位相关性分数（取分类内所有技能的平均分）
 */
function scoreCategory(skills: string[], relevance: { high: string[]; medium: string[]; low: string[] }): number {
  if (skills.length === 0) return 30;
  const scores = skills.map((s) => scoreSkill(s, relevance));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return avg;
}

/**
 * 对技能列表按岗位相关性排序
 *
 * 保留分类结构，仅调整分类之间和分类内部的顺序
 *
 * @param skills 技能字符串数组
 * @param targetPosition 目标岗位
 * @returns 排序后的技能字符串数组
 */
export function sortSkillsByRelevance(skills: string[], targetPosition?: string): string[] {
  if (!skills || skills.length === 0) return skills;
  if (!targetPosition) return skills;

  const relevance = getPositionRelevance(targetPosition);

  // 如果没有岗位相关性数据，不排序
  if (relevance.high.length === 0 && relevance.medium.length === 0 && relevance.low.length === 0) {
    return skills;
  }

  // 尝试解析分类结构
  const categorized: { category: string; skills: string[]; rawStr: string }[] = [];
  const uncategorized: { skill: string; score: number; rawStr: string }[] = [];

  for (const s of skills) {
    const parsed = parseSkillCategory(s);
    if (parsed) {
      categorized.push({
        category: parsed.category,
        skills: parsed.skills,
        rawStr: s,
      });
    } else {
      uncategorized.push({
        skill: s,
        score: scoreSkill(s, relevance),
        rawStr: s,
      });
    }
  }

  const result: string[] = [];

  // 如果有分类结构，按分类相关性排序
  if (categorized.length > 0) {
    // 分类间排序
    const sortedCategories = categorized
      .map((c) => ({
        ...c,
        categoryScore: scoreCategory(c.skills, relevance),
        sortedSkills: sortSkillsInCategory(c.skills, relevance),
      }))
      .sort((a, b) => b.categoryScore - a.categoryScore);

    for (const c of sortedCategories) {
      result.push(`${c.category}：${c.sortedSkills.join('、')}`);
    }
  }

  // 无分类的技能按相关性排序
  uncategorized
    .sort((a, b) => b.score - a.score)
    .forEach((u) => result.push(u.rawStr));

  return result;
}

/**
 * 对分类内部的技能按岗位相关性排序
 */
function sortSkillsInCategory(skills: string[], relevance: { high: string[]; medium: string[]; low: string[] }): string[] {
  return skills
    .map((s) => ({ skill: s, score: scoreSkill(s, relevance) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.skill);
}
