/**
 * 开源版 - 配置保留用于类型兼容，全部功能免费
 *
 * 本文件保留定价相关类型结构，以兼容现有代码导入。
 * 所有功能价格均为 0，标记为免费，不存在任何付费项。
 */

export interface PricingPlan {
  /** 功能名称 */
  name: string;
  /** 功能标识 */
  key: string;
  /** 当前价格 (0 = 免费) */
  price: number;
  /** 原价 (用于展示划线价) */
  originalPrice: number;
  /** 是否免费 */
  isFree: boolean;
  /** 描述 */
  description: string;
}

/**
 * 开源版定价配置表 - 全部免费
 */
export const PRICING: Record<string, PricingPlan> = {
  resume_optimize: {
    name: '简历优化',
    key: 'resume_optimize',
    price: 0,
    originalPrice: 0,
    isFree: true,
    description: '上传简历，AI分析并优化',
  },
  resume_generate: {
    name: '简历生成',
    key: 'resume_generate',
    price: 0,
    originalPrice: 0,
    isFree: true,
    description: '对话式生成专业简历',
  },
  career_recommend: {
    name: '岗位推荐',
    key: 'career_recommend',
    price: 0,
    originalPrice: 0,
    isFree: true,
    description: 'AI根据你的背景推荐适合岗位',
  },
  export_pdf: {
    name: 'PDF导出',
    key: 'export_pdf',
    price: 0,
    originalPrice: 0,
    isFree: true,
    description: '导出高质量PDF简历',
  },
  export_word: {
    name: 'Word导出',
    key: 'export_word',
    price: 0,
    originalPrice: 0,
    isFree: true,
    description: '导出可编辑Word简历',
  },
};

/**
 * 检查功能是否免费（开源版始终返回 true）
 */
export function isFeatureFree(_featureKey: string): boolean {
  return true;
}

/**
 * 获取功能价格（开源版始终返回 0）
 */
export function getFeaturePrice(_featureKey: string): number {
  return 0;
}
