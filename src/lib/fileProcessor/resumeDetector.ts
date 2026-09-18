/**
 * 简历内容检测器 - 综合评分机制
 * 判断文本是否像简历，避免非简历文件消耗 Token
 * 迁移时可直接复用
 */

// 分类关键词
const KEYWORD_CATEGORIES = {
  contact: {
    keywords: ['电话', '手机', '邮箱', 'email', 'phone', 'tel', '联系', '微信', '地址', '籍贯', '@'],
    weight: 20, // 权重
  },
  education: {
    keywords: ['教育', '学历', '大学', '学院', '专业', '本科', '硕士', '博士', '学位', 'gpa', '绩点', '毕业', '学校', '高中'],
    weight: 20,
  },
  experience: {
    keywords: ['工作', '实习', '项目', '经历', '经验', '负责', '参与', '开发', '设计', '运营', '管理', '主导', '协助'],
    weight: 25,
  },
  skills: {
    keywords: ['技能', '技术', '掌握', '熟悉', '了解', '工具', '语言', '框架', '软件', 'python', 'java', 'javascript', 'react', 'vue', 'office', 'excel', 'ps', 'figma'],
    weight: 15,
  },
  personal: {
    keywords: ['姓名', '年龄', '性别', '出生', '民族', '政治面貌', '党员', '求职', '意向', '期望', '目标岗位', '自我评价', '个人优势', '个人评价'],
    weight: 10,
  },
  achievements: {
    keywords: ['证书', '资格', '荣誉', '获奖', '奖项', '奖学金', '优秀', '竞赛', '专利', '论文', '发表'],
    weight: 10,
  },
};

// 排除模式（如果包含这些，很可能不是简历）
const EXCLUDE_PATTERNS = [
  /^小说/,
  /^第一章/,
  /^前言/,
  /^序言/,
  /菜谱/,
  /食谱/,
  /新闻/,
  /公告/,
  /通知/,
  /合同/,
  /协议/,
];

export interface ResumeDetectionResult {
  isResume: boolean;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  matchedKeywords: string[];
  categoryScores: Record<string, number>;
}

/**
 * 检测文本是否为简历内容
 * 使用分类评分机制，综合判断
 */
export function detectResume(text: string): ResumeDetectionResult {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  const categoryScores: Record<string, number> = {};
  let totalScore = 0;

  // 检查排除模式
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isResume: false,
        confidence: 'high',
        score: 0,
        matchedKeywords: [],
        categoryScores: {},
      };
    }
  }

  // 按类别评分
  for (const [category, config] of Object.entries(KEYWORD_CATEGORIES)) {
    let categoryScore = 0;
    
    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = lowerText.match(regex);
      
      if (matches && matches.length > 0) {
        // 每个关键词最多计3次出现
        const count = Math.min(matches.length, 3);
        categoryScore += count * (config.weight / 3);
        matchedKeywords.push(keyword);
      }
    }

    // 类别得分上限为该类别的权重
    categoryScore = Math.min(categoryScore, config.weight);
    categoryScores[category] = Math.round(categoryScore);
    totalScore += categoryScore;
  }

  // 计算满分
  const maxScore = Object.values(KEYWORD_CATEGORIES).reduce((sum, c) => sum + c.weight, 0);
  const normalizedScore = Math.round((totalScore / maxScore) * 100);

  // 判断阈值
  // 至少需要覆盖3个类别，且总分达到30%
  const coveredCategories = Object.values(categoryScores).filter(s => s > 0).length;
  const isResume = coveredCategories >= 3 && normalizedScore >= 30;

  // 置信度
  let confidence: 'high' | 'medium' | 'low';
  if (normalizedScore >= 60 && coveredCategories >= 4) {
    confidence = 'high';
  } else if (normalizedScore >= 40 && coveredCategories >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    isResume,
    confidence,
    score: normalizedScore,
    matchedKeywords: [...new Set(matchedKeywords)],
    categoryScores,
  };
}
