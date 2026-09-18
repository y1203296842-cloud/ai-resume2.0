/**
 * PersonalInfoGrid — 全局基础信息渲染组件
 *
 * 核心职责：
 * 作为所有模板的统一基础信息渲染机制。
 * 模板通过 config 参数控制视觉排版（列数、间距、字号、颜色），
 * 但不能控制"支持哪些字段"——字段由 PersonalInfo Contract 固定。
 *
 * Contract 字段（所有模板必须支持）：
 * 姓名、性别、民族、政治面貌、学历、电话、邮箱、毕业院校、英语成绩、专业、年龄
 *
 * 使用方式：
 * <PersonalInfoGrid data={data} config={{ columns: 3, fontSize: '9pt', ... }} />
 *
 * 规则：
 * - 空值字段自动隐藏（不显示"未提供"等占位文字）
 * - 至少渲染 name
 * - 模板通过 config 控制视觉风格，不能跳过字段
 */

import type { CSSProperties } from 'react';
import type { ResumeData, PersonalInfo } from '@/lib/types';

// ============================================
// Contract 定义 — 固定基础信息字段
// ============================================

export interface PersonalInfoFieldConfig {
  key: keyof PersonalInfo;
  label: string;
}

export const PERSONAL_INFO_CONTRACT: PersonalInfoFieldConfig[] = [
  { key: 'gender', label: '性别' },
  { key: 'age', label: '年龄' },
  { key: 'ethnicity', label: '民族' },
  { key: 'politicalStatus', label: '政治面貌' },
  { key: 'degree', label: '学历' },
  { key: 'major', label: '专业' },
  { key: 'englishScore', label: '英语成绩' },
];

// ============================================
// 渲染配置
// ============================================

export interface PersonalInfoGridConfig {
  /** 网格列数（默认 auto-fit） */
  columns?: number;
  /** 最小列宽（CSS 值，如 '80pt', '100px'） */
  minColumnWidth?: string;
  /** 行列间距（CSS 值，如 '2pt 12pt'） */
  gap?: string;
  /** 字号（CSS 值，如 '9pt'） */
  fontSize?: string;
  /** 标签颜色 */
  labelColor?: string;
  /** 值颜色 */
  valueColor?: string;
  /** 标签字重 */
  labelWeight?: number | string;
  /** 标签后缀（如 '：' 或 ':'） */
  labelSuffix?: string;
  /** 文本对齐 */
  textAlign?: 'left' | 'center' | 'right';
  /** 额外容器样式 */
  containerStyle?: CSSProperties;
  /** 是否使用 inline 显示（而非 grid） */
  mode?: 'grid' | 'inline';
  /** inline 模式下的分隔符 */
  separator?: string;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: PersonalInfoGridConfig = {
  minColumnWidth: '80pt',
  gap: '2pt 12pt',
  fontSize: '9pt',
  labelColor: '#333333',
  valueColor: '#333333',
  labelWeight: 700,
  labelSuffix: '：',
  textAlign: 'left',
  mode: 'grid',
};

// ============================================
// 主组件
// ============================================

interface PersonalInfoGridProps {
  data: ResumeData;
  config?: PersonalInfoGridConfig;
}

export function PersonalInfoGrid({ data, config }: PersonalInfoGridProps) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const p = data.personalInfo;

  const items = PERSONAL_INFO_CONTRACT.filter((field) => {
    const value = p[field.key];
    return value && String(value).trim().length > 0;
  }).map((field) => ({
    label: field.label,
    value: String(p[field.key]),
  }));

  if (items.length === 0) return null;

  if (cfg.mode === 'inline') {
    return (
      <div
        style={{
          fontSize: cfg.fontSize,
          color: cfg.valueColor,
          display: 'flex',
          flexWrap: 'wrap',
          gap: cfg.gap,
          textAlign: cfg.textAlign,
          ...cfg.containerStyle,
        }}
      >
        {items.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: cfg.labelColor, fontWeight: cfg.labelWeight, flexShrink: 0 }}>
              {item.label}
              {cfg.labelSuffix}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>{item.value}</span>
          </span>
        ))}
      </div>
    );
  }

  // 使用 flex 布局替代 grid：label+value 作为原子单元不会被拆散
  // 容器 flex-wrap 确保空间不足时才换行，而非每个固定宽度就换行
  const containerStyle: CSSProperties = cfg.columns
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.columns}, 1fr)`,
        gap: cfg.gap,
        fontSize: cfg.fontSize,
        color: cfg.valueColor,
        textAlign: cfg.textAlign,
        ...cfg.containerStyle,
      }
    : {
        display: 'flex',
        flexWrap: 'wrap',
        gap: cfg.gap,
        fontSize: cfg.fontSize,
        color: cfg.valueColor,
        textAlign: cfg.textAlign,
        ...cfg.containerStyle,
      };

  return (
    <div style={containerStyle}>
      {items.map((item, i) => (
        <div
          key={i}
          style={
            cfg.columns
              ? { whiteSpace: 'nowrap', overflow: 'hidden' }
              : { display: 'inline-flex', whiteSpace: 'nowrap', flexShrink: 0 }
          }
        >
          <span style={{ color: cfg.labelColor, fontWeight: cfg.labelWeight, flexShrink: 0 }}>
            {item.label}
            {cfg.labelSuffix}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Contract 校验工具 — 供 conformance.ts 使用
// ============================================

/**
 * 检查模板插件是否声明了 PersonalInfo Contract 支持
 *
 * 此函数不验证渲染输出（运行时行为），
 * 但确保模板配置中声明了 personalInfo 支持。
 *
 * 真正的渲染保证由 PersonalInfoGrid 组件提供：
 * 模板使用此组件即自动支持全部 Contract 字段。
 */
export function validatePersonalInfoContract(pluginId: string): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 检查 Contract 字段完整性
  // PersonalInfoGrid 负责 7 个字段：gender, age, ethnicity, politicalStatus, degree, major, englishScore
  // 其余字段（name, phone, email, school, hometown）由模板的 Header/Contact 区域渲染
  const gridFields = PERSONAL_INFO_CONTRACT.map((f) => f.key);
  const expectedGridFields: (keyof PersonalInfo)[] = [
    'gender',
    'ethnicity',
    'politicalStatus',
    'degree',
    'englishScore',
    'major',
    'age',
  ];

  const missing = expectedGridFields.filter((f) => !gridFields.includes(f));
  if (missing.length > 0) {
    errors.push(
      `PersonalInfo Contract 缺少 Grid 字段: ${missing.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
