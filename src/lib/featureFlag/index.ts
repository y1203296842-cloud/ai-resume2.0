/**
 * 功能开关系统（开源版）
 * Feature Flag System (Open Source Version)
 * 
 * 用于动态控制功能的开启/关闭
 * 开源版：所有业务功能默认开启，支付/管理后台/用户系统关闭
 */

import type { FeatureConfig, FeatureFlagStore, FeatureId, UpdateFeatureParams } from './types';

/** 默认功能配置 */
const DEFAULT_FEATURES: FeatureFlagStore = {
  resume_optimize: {
    id: 'resume_optimize',
    name: '简历优化',
    description: '上传已有简历，AI分析并优化',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  resume_generate: {
    id: 'resume_generate',
    name: '目标岗位生成',
    description: '指定目标岗位，AI生成针对性简历',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  career_analysis: {
    id: 'career_analysis',
    name: '职业分析',
    description: '分析个人背景，推荐适合岗位',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  interview_simulation: {
    id: 'interview_simulation',
    name: '面试模拟',
    description: 'AI模拟面试，提供反馈',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  cover_letter: {
    id: 'cover_letter',
    name: 'Cover Letter',
    description: '生成求职信',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  template_premium: {
    id: 'template_premium',
    name: '高级模板',
    description: '使用高级简历模板',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  export_pdf: {
    id: 'export_pdf',
    name: 'PDF导出',
    description: '导出简历为PDF格式',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  export_docx: {
    id: 'export_docx',
    name: 'Word导出',
    description: '导出简历为Word格式',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  file_upload: {
    id: 'file_upload',
    name: '文件上传',
    description: '上传简历文件进行解析',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  quality_check: {
    id: 'quality_check',
    name: '质量检测',
    description: '简历质量自动检测',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  auto_enhance: {
    id: 'auto_enhance',
    name: '自动补强',
    description: '简历内容自动补强',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  history_save: {
    id: 'history_save',
    name: '历史保存',
    description: '保存简历历史记录',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  user_system: {
    id: 'user_system',
    name: '用户系统',
    description: '用户注册登录系统',
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  payment_system: {
    id: 'payment_system',
    name: '支付系统',
    description: '在线支付功能',
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  admin_panel: {
    id: 'admin_panel',
    name: '管理后台',
    description: '管理员后台系统',
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

/** 功能开关存储 */
let featureStore: FeatureFlagStore = { ...DEFAULT_FEATURES };

/**
 * 检查功能是否启用
 */
export function isFeatureEnabled(featureId: FeatureId): boolean {
  const feature = featureStore[featureId];
  return feature?.enabled ?? false;
}

/**
 * 获取功能配置
 */
export function getFeature(featureId: FeatureId): FeatureConfig | undefined {
  return featureStore[featureId];
}

/**
 * 获取所有功能
 */
export function getAllFeatures(): FeatureConfig[] {
  return Object.values(featureStore);
}

/**
 * 获取已启用的功能
 */
export function getEnabledFeatures(): FeatureConfig[] {
  return Object.values(featureStore).filter(f => f.enabled);
}

/**
 * 更新功能配置
 */
export function updateFeature(featureId: FeatureId, params: UpdateFeatureParams): FeatureConfig | null {
  const feature = featureStore[featureId];
  if (!feature) return null;

  const updated: FeatureConfig = {
    ...feature,
    ...params,
    updatedAt: new Date().toISOString(),
  };

  featureStore[featureId] = updated;
  return updated;
}

/**
 * 启用功能
 */
export function enableFeature(featureId: FeatureId): boolean {
  const result = updateFeature(featureId, { enabled: true });
  return result !== null;
}

/**
 * 禁用功能
 */
export function disableFeature(featureId: FeatureId): boolean {
  const result = updateFeature(featureId, { enabled: false });
  return result !== null;
}

/**
 * 重置为默认配置
 */
export function resetFeatures(): void {
  featureStore = { ...DEFAULT_FEATURES };
}

/**
 * 导出功能配置
 */
export function exportFeatures(): FeatureFlagStore {
  return { ...featureStore };
}

/**
 * 导入功能配置
 */
export function importFeatures(config: FeatureFlagStore): void {
  featureStore = { ...config };
}

/**
 * 检查多个功能是否都启用
 */
export function areFeaturesEnabled(featureIds: FeatureId[]): boolean {
  return featureIds.every(id => isFeatureEnabled(id));
}

/**
 * 检查任一功能是否启用
 */
export function isAnyFeatureEnabled(featureIds: FeatureId[]): boolean {
  return featureIds.some(id => isFeatureEnabled(id));
}
