/**
 * 简历质量检测模块
 * 
 * 功能：
 * - 岗位匹配度检测（30分）
 * - 内容丰满度检测（25分）
 * - 经历深度检测（20分）
 * - 技能覆盖检测（15分）
 * - 基础信息完整性检测（10分）
 * 
 * 总分100分，>=85分为通过
 */

import type { ResumeData } from '../types';

// ============================================
// 类型定义
// ============================================

export interface QualityCheckResult {
  score: number;
  pass: boolean;
  dimensions: DimensionScore[];
  problems: string[];
  suggestions: string[];
}

export interface DimensionScore {
  name: string;
  maxScore: number;
  score: number;
  details: string[];
}

export interface QualityCheckOptions {
  targetPosition?: string;
  userProfile?: {
    type: 'student' | 'freshGraduate' | 'experienced' | 'careerChanger' | 'senior';
    major?: string;
    yearsOfExperience?: number;
  };
}

// ============================================
// 岗位关键词库（可扩展）
// ============================================

const POSITION_KEYWORDS: Record<string, string[]> = {
  '产品经理': ['需求分析', '用户研究', '产品设计', '项目推进', '数据分析', '原型', 'PRD', 'Figma', 'Axure', '用户体验', '功能设计', '竞品分析'],
  '产品': ['需求分析', '用户研究', '产品设计', '项目推进', '数据分析', '原型', 'PRD', 'Figma', 'Axure'],
  '运营': ['内容策划', '用户增长', '数据分析', '活动运营', '社群运营', '新媒体', '公众号', '小红书', '短视频', '内容运营'],
  '新媒体运营': ['内容策划', '公众号', '小红书', '短视频', '抖音', '内容创作', '粉丝增长', '数据分析', '选题策划'],
  '前端': ['React', 'Vue', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Webpack', '前端工程化', '响应式', '性能优化'],
  '前端开发': ['React', 'Vue', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Webpack', '前端工程化'],
  '后端': ['Java', 'Python', 'Go', 'MySQL', 'Redis', '微服务', 'API', '数据库', 'Spring', 'Docker'],
  '后端开发': ['Java', 'Python', 'Go', 'MySQL', 'Redis', '微服务', 'API', '数据库'],
  '设计': ['Figma', 'Sketch', 'PS', 'UI设计', '视觉设计', '交互设计', '设计系统', '用户体验'],
  'UI设计': ['Figma', 'Sketch', 'PS', 'UI设计', '视觉设计', '交互设计', '设计系统'],
  '数据分析': ['Python', 'SQL', 'Excel', '数据可视化', '统计分析', 'BI', 'Tableau', 'PowerBI'],
  '销售': ['客户开发', '商务谈判', '客户关系', '业绩', '渠道', '市场拓展', '签单'],
  '人力资源': ['招聘', '培训', '绩效', '员工关系', '薪酬', 'HRBP', '人才发展'],
  '市场': ['市场推广', '品牌', '活动策划', '渠道', '营销', '公关', 'SEM', 'SEO'],
  '会计': ['财务', '税务', '报表', '审计', '成本', '核算', '会计准则'],
  '客服': ['客户服务', '投诉处理', '用户满意度', '沟通', '问题解决'],
};

// ============================================
// 主检测函数
// ============================================

export function checkResumeQuality(
  resumeData: ResumeData,
  options: QualityCheckOptions = {}
): QualityCheckResult {
  const dimensions: DimensionScore[] = [];
  const problems: string[] = [];
  const suggestions: string[] = [];

  // 1. 岗位匹配度检测（30分）
  const positionMatch = checkPositionMatch(resumeData, options.targetPosition);
  dimensions.push(positionMatch);
  problems.push(...positionMatch.details.filter(d => d.startsWith('问题:')).map(d => d.replace('问题:', '')));
  suggestions.push(...positionMatch.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')));

  // 2. 内容丰满度检测（25分）
  const contentFullness = checkContentFullness(resumeData);
  dimensions.push(contentFullness);
  problems.push(...contentFullness.details.filter(d => d.startsWith('问题:')).map(d => d.replace('问题:', '')));
  suggestions.push(...contentFullness.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')));

  // 3. 经历深度检测（20分）
  const experienceDepth = checkExperienceDepth(resumeData);
  dimensions.push(experienceDepth);
  problems.push(...experienceDepth.details.filter(d => d.startsWith('问题:')).map(d => d.replace('问题:', '')));
  suggestions.push(...experienceDepth.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')));

  // 4. 技能覆盖检测（15分）
  const skillCoverage = checkSkillCoverage(resumeData, options.targetPosition);
  dimensions.push(skillCoverage);
  problems.push(...skillCoverage.details.filter(d => d.startsWith('问题:')).map(d => d.replace('问题:', '')));
  suggestions.push(...skillCoverage.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')));

  // 5. 基础信息完整性检测（10分）
  const basicInfo = checkBasicInfo(resumeData);
  dimensions.push(basicInfo);
  problems.push(...basicInfo.details.filter(d => d.startsWith('问题:')).map(d => d.replace('问题:', '')));
  suggestions.push(...basicInfo.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')));

  // 计算总分
  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);

  return {
    score: totalScore,
    pass: totalScore >= 85,
    dimensions,
    problems,
    suggestions,
  };
}

// ============================================
// 1. 岗位匹配度检测（30分）
// ============================================

function checkPositionMatch(resumeData: ResumeData, targetPosition?: string): DimensionScore {
  const details: string[] = [];
  let score = 30;

  if (!targetPosition) {
    details.push('问题:未指定目标岗位，无法检测岗位匹配度');
    return { name: '岗位匹配度', maxScore: 30, score: 15, details };
  }

  // 获取岗位关键词
  const keywords = getPositionKeywords(targetPosition);
  
  if (keywords.length === 0) {
    details.push(`建议:未找到"${targetPosition}"的岗位关键词库，将使用通用标准`);
    return { name: '岗位匹配度', maxScore: 30, score: 20, details };
  }

  // 检查简历内容是否包含岗位关键词
  const resumeText = JSON.stringify(resumeData).toLowerCase();
  const matchedKeywords = keywords.filter(kw => resumeText.includes(kw.toLowerCase()));
  const matchRate = matchedKeywords.length / keywords.length;

  if (matchRate < 0.2) {
    score = 10;
    details.push(`问题:简历内容与"${targetPosition}"岗位匹配度较低`);
    details.push(`建议:可增加岗位相关关键词，如：${keywords.slice(0, 5).join('、')}`);
  } else if (matchRate < 0.4) {
    score = 20;
    details.push(`建议:简历与岗位匹配度一般，可补充更多岗位相关内容`);
  } else {
    score = 30;
    details.push(`岗位关键词匹配良好：${matchedKeywords.slice(0, 5).join('、')}`);
  }

  // 检查技能是否包含岗位相关技能
  const skills = resumeData.skills || [];
  const skillText = skills.join(' ').toLowerCase();
  const skillMatch = keywords.filter(kw => skillText.includes(kw.toLowerCase()));
  
  if (skillMatch.length === 0 && keywords.length > 0) {
    score -= 5;
    details.push('问题:技能列表未体现岗位相关技能');
  }

  return { name: '岗位匹配度', maxScore: 30, score: Math.max(0, score), details };
}

// ============================================
// 2. 内容丰满度检测（25分）
// ============================================

function checkContentFullness(resumeData: ResumeData): DimensionScore {
  const details: string[] = [];
  let score = 25;

  // 检查教育背景
  if (!resumeData.education || resumeData.education.length === 0) {
    score -= 5;
    details.push('问题:缺少教育背景信息');
  }

  // 检查经历（工作/项目）
  const hasExperience = (resumeData.experience && resumeData.experience.length > 0) ||
                        (resumeData.projects && resumeData.projects.length > 0);
  
  if (!hasExperience) {
    score -= 10;
    details.push('问题:缺少工作/项目/校园经历');
    details.push('建议:补充至少一段相关经历，包括背景、职责、成果');
  } else {
    // 检查经历是否有详细描述
    const allDescriptions = [
      ...(resumeData.experience || []).flatMap(e => e.description || []),
      ...(resumeData.projects || []).flatMap(p => p.description || []),
    ];
    
    const hasDetailedDescription = allDescriptions.some(d => d && d.length > 20);
    if (!hasDetailedDescription) {
      score -= 5;
      details.push('问题:经历描述过于简略');
      details.push('建议:每段经历应包含具体工作内容、使用方法和成果价值');
    }
  }

  // 检查技能
  if (!resumeData.skills || resumeData.skills.length === 0) {
    score -= 5;
    details.push('问题:缺少专业技能');
  }

  // 检查个人优势
  if (!resumeData.evaluation || resumeData.evaluation.trim().length < 20) {
    score -= 3;
    details.push('建议:个人优势过于简略，建议2-3句话体现岗位相关能力特质');
  }

  // 检查整体内容量
  const contentLength = JSON.stringify(resumeData).length;
  if (contentLength < 500) {
    score -= 5;
    details.push('问题:简历内容过少，可能无法铺满A4页面75%');
  }

  return { name: '内容丰满度', maxScore: 25, score: Math.max(0, score), details };
}

// ============================================
// 3. 经历深度检测（20分）
// ============================================

function checkExperienceDepth(resumeData: ResumeData): DimensionScore {
  const details: string[] = [];
  let score = 20;

  // 收集所有经历描述
  const descriptions: string[] = [
    ...(resumeData.experience || []).flatMap(e => e.description || []),
    ...(resumeData.projects || []).flatMap(p => p.description || []),
  ].filter(Boolean);

  if (descriptions.length === 0) {
    score = 5;
    details.push('问题:没有任何经历描述');
    return { name: '经历深度', maxScore: 20, score, details };
  }

  // 检查描述质量
  const vaguePatterns = [
    /^负责.+工作$/,
    /^参与.+项目$/,
    /^协助.+$/,
  ];

  let vagueCount = 0;
  let goodCount = 0;

  for (const desc of descriptions) {
    const isVague = vaguePatterns.some(p => p.test(desc.trim()));
    if (isVague) {
      vagueCount++;
    }
    
    // 检查是否包含具体要素
    const hasMethod = /使用|运用|通过|采用/.test(desc);
    const hasResult = /提升|提高|完成|实现|降低|节省|\d+%|\d+个|\d+万/.test(desc);
    
    if (hasMethod || hasResult) {
      goodCount++;
    }
  }

  if (vagueCount > descriptions.length / 2) {
    score -= 8;
    details.push('问题:超过一半的经历描述过于空泛（如"负责XX工作"）');
    details.push('建议:每段经历应包含：做了什么 + 怎么做 + 使用什么方法/工具 + 产生什么价值');
  }

  if (goodCount === 0 && descriptions.length > 0) {
    score -= 5;
    details.push('建议:经历描述缺少具体方法或量化成果');
  }

  // 检查经历数量
  if (descriptions.length < 2) {
    score -= 3;
    details.push('建议:经历数量较少，建议补充更多相关经历');
  }

  return { name: '经历深度', maxScore: 20, score: Math.max(0, score), details };
}

// ============================================
// 4. 技能覆盖检测（15分）
// ============================================

function checkSkillCoverage(resumeData: ResumeData, targetPosition?: string): DimensionScore {
  const details: string[] = [];
  let score = 15;

  const skills = resumeData.skills || [];
  
  if (skills.length === 0) {
    score = 0;
    details.push('问题:没有填写任何技能');
    return { name: '技能覆盖', maxScore: 15, score, details };
  }

  if (!targetPosition) {
    // 没有目标岗位时，只检查技能数量
    if (skills.length < 3) {
      score -= 5;
      details.push('建议:技能数量较少，建议补充更多专业技能');
    }
    return { name: '技能覆盖', maxScore: 15, score, details };
  }

  // 检查技能是否包含岗位相关技能
  const keywords = getPositionKeywords(targetPosition);
  const skillText = skills.join(' ').toLowerCase();
  const matchedSkills = keywords.filter(kw => skillText.includes(kw.toLowerCase()));

  if (matchedSkills.length === 0 && keywords.length > 0) {
    score -= 8;
    details.push(`问题:技能列表未体现"${targetPosition}"岗位相关技能`);
    details.push(`建议:可补充岗位常见技能，如：${keywords.slice(0, 5).join('、')}`);
  } else if (matchedSkills.length < 2 && keywords.length >= 3) {
    score -= 3;
    details.push('建议:岗位相关技能较少，可适当补充');
  }

  // 检查技能数量
  if (skills.length < 3) {
    score -= 3;
    details.push('建议:技能数量较少，建议至少列出3-5项核心技能');
  }

  return { name: '技能覆盖', maxScore: 15, score: Math.max(0, score), details };
}

// ============================================
// 5. 基础信息完整性检测（10分）
// ============================================

function checkBasicInfo(resumeData: ResumeData): DimensionScore {
  const details: string[] = [];
  let score = 10;

  const info = resumeData.personalInfo || {};

  // 检查必填字段
  const requiredFields = ['name', 'phone', 'email'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = info[field as keyof typeof info];
    if (!value || value.includes('【请输入') || value.includes('【请填写')) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    score -= 5;
    details.push(`问题:缺少基础信息：${missingFields.join('、')}`);
    details.push('建议:基础信息可以选择性提供，但姓名和联系方式建议填写');
  }

  // 检查教育背景
  if (!resumeData.education || resumeData.education.length === 0) {
    score -= 3;
    details.push('问题:缺少教育背景');
  } else {
    const edu = resumeData.education[0];
    if (!edu.school || !edu.degree || !edu.major) {
      score -= 2;
      details.push('建议:教育背景建议包含学校、学历、专业');
    }
  }

  return { name: '基础信息', maxScore: 10, score: Math.max(0, score), details };
}

// ============================================
// 辅助函数
// ============================================

function getPositionKeywords(position: string): string[] {
  // 精确匹配
  if (POSITION_KEYWORDS[position]) {
    return POSITION_KEYWORDS[position];
  }

  // 模糊匹配
  for (const [key, keywords] of Object.entries(POSITION_KEYWORDS)) {
    if (position.includes(key) || key.includes(position)) {
      return keywords;
    }
  }

  return [];
}

// ============================================
// 生成优化建议
// ============================================

export function generateOptimizationSuggestions(result: QualityCheckResult): string {
  if (result.pass) {
    return '简历质量良好，可以生成。';
  }

  const suggestions: string[] = [];

  for (const dimension of result.dimensions) {
    if (dimension.score < dimension.maxScore * 0.7) {
      suggestions.push(`【${dimension.name}】${dimension.details.filter(d => d.startsWith('建议:')).map(d => d.replace('建议:', '')).join('；')}`);
    }
  }

  if (suggestions.length === 0) {
    return '简历质量基本合格，建议补充更多细节内容。';
  }

  return `简历需要优化，主要建议：\n${suggestions.join('\n')}`;
}
