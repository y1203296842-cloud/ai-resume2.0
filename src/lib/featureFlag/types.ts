/**
 * 功能开关系统 - 类型定义
 * Feature Flag System - Type Definitions
 */

/** 功能ID */
export type FeatureId =
  | 'resume_optimize'      // 简历优化
  | 'resume_generate'      // 目标岗位生成
  | 'career_analysis'      // 职业分析
  | 'interview_simulation' // 面试模拟
  | 'cover_letter'         // Cover Letter
  | 'template_premium'     // 高级模板
  | 'export_pdf'           // PDF导出
  | 'export_docx'          // Word导出
  | 'file_upload'          // 文件上传
  | 'quality_check'        // 质量检测
  | 'auto_enhance'         // 自动补强
  | 'history_save'         // 历史保存
  | 'user_system'          // 用户系统
  | 'payment_system'       // 支付系统
  | 'admin_panel';         // 管理后台

/** 功能配置 */
export interface FeatureConfig {
  /** 功能ID */
  id: FeatureId;
  /** 功能名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 备注 */
  notes?: string;
}

/** 功能开关存储 */
export interface FeatureFlagStore {
  [featureId: string]: FeatureConfig;
}

/** 功能开关更新参数 */
export interface UpdateFeatureParams {
  enabled?: boolean;
  notes?: string;
}
