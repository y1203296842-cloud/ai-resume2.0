/**
 * 开源版 - 配置保留用于类型兼容，全部功能免费无限制
 *
 * 本文件保留产品、套餐、角色权限等类型结构，以兼容现有代码导入。
 * 所有价格均为 0，所有使用次数为无限，所有功能权限全部开放。
 * 不存在任何付费限制或功能门槛。
 */

// ============================================================================
// 产品功能定义
// ============================================================================

/** 产品功能类型 */
export type ProductFeature = 
  | 'resume_optimize'      // 优化已有简历
  | 'resume_generate'      // 有目标岗位生成简历
  | 'career_analysis'      // 职业分析（不知道投什么岗位）
  | 'template_premium';    // 高级模板权限

/** 产品功能配置 */
export interface ProductFeatureConfig {
  id: ProductFeature;
  name: string;
  description: string;
  basePrice: number;        // 基础价格（元）
  creditsPerUse: number;    // 每次使用消耗次数
}

/** 产品功能列表 - 开源版全部免费 */
export const PRODUCT_FEATURES: Record<ProductFeature, ProductFeatureConfig> = {
  resume_optimize: {
    id: 'resume_optimize',
    name: '优化简历',
    description: '上传已有简历，AI分析并优化，提升面试机会',
    basePrice: 0,
    creditsPerUse: 0,
  },
  resume_generate: {
    id: 'resume_generate',
    name: '目标岗位生成',
    description: '指定目标岗位，AI针对性收集信息并生成简历',
    basePrice: 0,
    creditsPerUse: 0,
  },
  career_analysis: {
    id: 'career_analysis',
    name: '职业分析',
    description: '分析个人背景，推荐适合的岗位方向',
    basePrice: 0,
    creditsPerUse: 0,
  },
  template_premium: {
    id: 'template_premium',
    name: '高级模板',
    description: '使用专业设计的高级简历模板',
    basePrice: 0,
    creditsPerUse: 0,
  },
};

// ============================================================================
// 套餐定义
// ============================================================================

/** 套餐类型 */
export type PackageId = 
  | 'single_optimize'      // 单次优化
  | 'single_generate'      // 单次生成
  | 'single_analysis'      // 单次分析
  | 'starter_pack'         // 体验包
  | 'pro_pack'             // 进阶包
  | 'premium_pack';        // 高级包

/** 套餐配置 */
export interface PackageConfig {
  id: PackageId;
  name: string;
  description: string;
  price: number;            // 套餐价格（元）
  originalPrice?: number;   // 原价（用于显示折扣）
  features: {
    feature: ProductFeature;
    credits: number;        // 包含次数
  }[];
  benefits: string[];       // 额外权益
  isPopular?: boolean;      // 是否热门推荐
  validDays: number;        // 有效期（天）
}

/** 套餐列表 - 开源版全部免费且无限次 */
export const PACKAGES: Record<PackageId, PackageConfig> = {
  // 单次购买
  single_optimize: {
    id: 'single_optimize',
    name: '单次优化',
    description: '优化一次已有简历',
    price: 0,
    features: [
      { feature: 'resume_optimize', credits: 999999 },
    ],
    benefits: ['完整简历预览', '质量评分报告', 'PDF/Word下载'],
    validDays: 99999,
  },
  single_generate: {
    id: 'single_generate',
    name: '单次生成',
    description: '针对目标岗位生成一次简历',
    price: 0,
    features: [
      { feature: 'resume_generate', credits: 999999 },
    ],
    benefits: ['完整简历预览', '质量评分报告', 'PDF/Word下载'],
    validDays: 99999,
  },
  single_analysis: {
    id: 'single_analysis',
    name: '单次职业分析',
    description: '分析个人背景，推荐岗位方向',
    price: 0,
    features: [
      { feature: 'career_analysis', credits: 999999 },
    ],
    benefits: ['岗位推荐报告', '能力分析报告'],
    validDays: 99999,
  },

  // 套餐包
  starter_pack: {
    id: 'starter_pack',
    name: '体验包',
    description: '适合初次体验，包含基础服务',
    price: 0,
    originalPrice: 0,
    features: [
      { feature: 'career_analysis', credits: 999999 },
      { feature: 'resume_optimize', credits: 999999 },
    ],
    benefits: ['完整简历预览', '质量评分报告', 'PDF/Word下载'],
    validDays: 99999,
  },
  pro_pack: {
    id: 'pro_pack',
    name: '进阶包',
    description: '适合求职中，包含完整服务',
    price: 0,
    originalPrice: 0,
    features: [
      { feature: 'career_analysis', credits: 999999 },
      { feature: 'resume_optimize', credits: 999999 },
      { feature: 'resume_generate', credits: 999999 },
    ],
    benefits: ['完整简历预览', '质量评分报告', 'PDF/Word下载', '无限次免费修改', '高级模板权限'],
    isPopular: true,
    validDays: 99999,
  },
  premium_pack: {
    id: 'premium_pack',
    name: '高级包',
    description: '适合深度求职，包含高级功能',
    price: 0,
    originalPrice: 0,
    features: [
      { feature: 'career_analysis', credits: 999999 },
      { feature: 'resume_optimize', credits: 999999 },
      { feature: 'resume_generate', credits: 999999 },
      { feature: 'template_premium', credits: 999999 },
    ],
    benefits: ['完整简历预览', '质量评分报告', 'PDF/Word下载', '无限次免费修改', '高级模板权限', '优先客服'],
    validDays: 99999,
  },
};

// ============================================================================
// 免费体验配置
// ============================================================================

/** 免费体验配置 */
export interface FreeTrialConfig {
  enabled: boolean;
  maxOptimizeRounds: number;    // 最多免费优化轮次
  canPreview: boolean;          // 可以预览
  canDownload: boolean;         // 可以下载
  canSeeQualityScore: boolean;  // 可以看到质量评分
}

/** 开源版 - 完全免费无限制 */
export const FREE_TRIAL: FreeTrialConfig = {
  enabled: true,
  maxOptimizeRounds: 999,       // 开源版无限优化轮次
  canPreview: true,             // 可以预览
  canDownload: true,            // 可以下载
  canSeeQualityScore: true,     // 可以看到质量评分
};

// ============================================================================
// 用户角色配置
// ============================================================================

/** 用户角色 */
export type UserRole = 'user' | 'tester' | 'vip' | 'admin';

/** 角色权限配置 */
export interface RolePermissions {
  role: UserRole;
  name: string;
  description: string;
  permissions: {
    canAccessAdmin: boolean;
    canUsePremiumTemplates: boolean;
    freeCredits: number;        // 免费额度
    maxResumes: number;         // 最大简历数量
    canExportPdf: boolean;
    canExportDocx: boolean;
  };
}

/** 开源版 - 所有角色拥有全部权限 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  user: {
    role: 'user',
    name: '普通用户',
    description: '开源版 - 全部功能免费无限制',
    permissions: {
      canAccessAdmin: false,
      canUsePremiumTemplates: true,
      freeCredits: 999999,
      maxResumes: 99999,
      canExportPdf: true,
      canExportDocx: true,
    },
  },
  tester: {
    role: 'tester',
    name: '测试用户',
    description: '开源版 - 全部功能免费无限制',
    permissions: {
      canAccessAdmin: false,
      canUsePremiumTemplates: true,
      freeCredits: 999999,
      maxResumes: 99999,
      canExportPdf: true,
      canExportDocx: true,
    },
  },
  vip: {
    role: 'vip',
    name: 'VIP用户',
    description: '开源版 - 全部功能免费无限制',
    permissions: {
      canAccessAdmin: false,
      canUsePremiumTemplates: true,
      freeCredits: 999999,
      maxResumes: 99999,
      canExportPdf: true,
      canExportDocx: true,
    },
  },
  admin: {
    role: 'admin',
    name: '管理员',
    description: '开源版 - 全部功能免费无限制',
    permissions: {
      canAccessAdmin: false,
      canUsePremiumTemplates: true,
      freeCredits: 999999,
      maxResumes: 99999,
      canExportPdf: true,
      canExportDocx: true,
    },
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算套餐总价值（开源版始终返回 0）
 */
export function calculatePackageValue(_packageId: PackageId): number {
  return 0;
}

/**
 * 计算套餐折扣率（开源版始终返回 100% 折扣）
 */
export function calculateDiscount(_packageId: PackageId): number {
  return 100;
}

/**
 * 获取所有套餐列表（按价格排序）
 */
export function getAllPackages(): PackageConfig[] {
  return Object.values(PACKAGES).sort((a, b) => a.price - b.price);
}

/**
 * 获取推荐套餐
 */
export function getPopularPackage(): PackageConfig | undefined {
  return Object.values(PACKAGES).find(pkg => pkg.isPopular);
}
