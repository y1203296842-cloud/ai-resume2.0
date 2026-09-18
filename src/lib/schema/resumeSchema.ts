/**
 * Resume Schema Contract
 *
 * 简历数据的唯一标准定义
 * 所有AI输出必须经过此Schema验证和标准化
 *
 * 动态栏目支持：
 * - sections 是主结构，支持任意数量、任意名称的动态栏目
 * - 固定字段（experience/projects/skills 等）保留仅用于向后兼容
 * - 验证完成后自动同步 sections 和 legacy 字段
 */

import type { ResumeData, PersonalInfo } from '../types';
import { normalizeResumeData } from '../sectionNormalizer';
import { cleanResumeData } from '../resumeCleanup';

// ============================================
// Schema 字段定义
// ============================================

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: unknown;
  description: string;
  /** 类型不匹配时的转换策略 */
  coerce?: (value: unknown) => unknown;
}

export interface SchemaDefinition {
  name: string;
  fields: Record<string, SchemaField>;
}

// ============================================
// 简历Schema定义
// ============================================

export const RESUME_SCHEMA: SchemaDefinition = {
  name: 'ResumeData',
  fields: {
    personalInfo: {
      name: 'personalInfo',
      type: 'object',
      required: true,
      default: {},
      description: '个人基础信息',
      coerce: (v) => {
        if (typeof v === 'string') return { name: v };
        if (v === null || v === undefined) return {};
        if (typeof v === 'object') return v;
        return {};
      },
    },
    sections: {
      name: 'sections',
      type: 'array',
      required: false,
      default: [],
      description: '动态栏目数组 - 简历主体内容结构，AI根据内容自动归纳生成',
      coerce: (v) => {
        if (Array.isArray(v)) return v.filter((s) => s && typeof s === 'object');
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    education: {
      name: 'education',
      type: 'array',
      required: false,
      default: [],
      description: '教育经历（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return [{ school: v, degree: '', major: '' }];
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    experience: {
      name: 'experience',
      type: 'array',
      required: false,
      default: [],
      description: '工作/实习经历（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return [{ company: v, position: '', description: [] }];
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    projects: {
      name: 'projects',
      type: 'array',
      required: false,
      default: [],
      description: '项目经历（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return [{ name: v, description: [] }];
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    skills: {
      name: 'skills',
      type: 'array',
      required: false,
      default: [],
      description: '技能列表（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return v.split(/[,，、;；\n]/).map((s: string) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    certificates: {
      name: 'certificates',
      type: 'array',
      required: false,
      default: [],
      description: '证书列表（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return v.split(/[,，、;；\n]/).map((s: string) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    languages: {
      name: 'languages',
      type: 'array',
      required: false,
      default: [],
      description: '语言能力（legacy，与sections同步）',
      coerce: (v) => {
        if (typeof v === 'string') {
          if (v === '' || v === '无' || v === '暂无') return [];
          return v.split(/[,，、;；\n]/).map((s: string) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(v)) return v;
        if (v === null || v === undefined) return [];
        return [];
      },
    },
    evaluation: {
      name: 'evaluation',
      type: 'string',
      required: false,
      default: '',
      description: '个人评价（legacy，与sections同步）',
      coerce: (v) => {
        if (Array.isArray(v)) return v.join('；');
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        if (v === null || v === undefined) return '';
        return String(v);
      },
    },
  },
};

// ============================================
// PersonalInfo Schema
// ============================================

export const PERSONAL_INFO_SCHEMA: SchemaDefinition = {
  name: 'PersonalInfo',
  fields: {
    name: { name: 'name', type: 'string', required: true, default: '', description: '姓名' },
    gender: { name: 'gender', type: 'string', required: false, default: '', description: '性别' },
    ethnicity: { name: 'ethnicity', type: 'string', required: false, default: '', description: '民族' },
    politicalStatus: { name: 'politicalStatus', type: 'string', required: false, default: '', description: '政治面貌' },
    phone: { name: 'phone', type: 'string', required: false, default: '', description: '电话' },
    email: { name: 'email', type: 'string', required: false, default: '', description: '邮箱' },
    hometown: { name: 'hometown', type: 'string', required: false, default: '', description: '籍贯' },
    school: { name: 'school', type: 'string', required: false, default: '', description: '学校' },
    major: { name: 'major', type: 'string', required: false, default: '', description: '专业' },
    degree: { name: 'degree', type: 'string', required: false, default: '', description: '学历' },
    englishScore: { name: 'englishScore', type: 'string', required: false, default: '', description: '英语成绩' },
    age: { name: 'age', type: 'string', required: false, default: '', description: '年龄' },
    currentStatus: { name: 'currentStatus', type: 'string', required: false, default: '', description: '当前状态' },
  },
};

// ============================================
// Schema 验证与标准化
// ============================================

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** 经过标准化处理后的数据 */
  normalized: ResumeData | null;
}

/**
 * 根据Schema验证并标准化简历数据
 * 缺失字段自动补默认值，类型错误自动转换
 * 最终输出：sections 与 legacy 字段双向同步
 */
export function validateAndNormalize(rawData: unknown): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawData || typeof rawData !== 'object') {
    return { valid: false, errors: ['数据必须是一个对象'], warnings: [], normalized: null };
  }

  const data = rawData as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  // 遍历Schema字段
  for (const [fieldName, fieldDef] of Object.entries(RESUME_SCHEMA.fields)) {
    const value = data[fieldName];

    if (value === undefined || value === null) {
      if (fieldDef.required) {
        warnings.push(`必填字段 "${fieldName}" 缺失，使用默认值`);
        normalized[fieldName] = fieldDef.default;
      } else {
        normalized[fieldName] = fieldDef.default;
      }
      continue;
    }

    // 类型检查与转换
    const expectedType = fieldDef.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      if (fieldDef.coerce) {
        try {
          normalized[fieldName] = fieldDef.coerce(value);
          warnings.push(`字段 "${fieldName}" 类型不匹配(${actualType}→${expectedType})，已自动转换`);
        } catch {
          errors.push(`字段 "${fieldName}" 类型转换失败(${actualType}→${expectedType})`);
          normalized[fieldName] = fieldDef.default;
        }
      } else {
        errors.push(`字段 "${fieldName}" 类型错误: 期望${expectedType}，实际${actualType}`);
        normalized[fieldName] = fieldDef.default;
      }
    } else {
      normalized[fieldName] = value;
    }
  }

  // 特殊处理 personalInfo
  if (normalized.personalInfo && typeof normalized.personalInfo === 'object') {
    normalized.personalInfo = normalizePersonalInfo(normalized.personalInfo as Record<string, unknown>);
  }

  // 特殊处理 sections 数组内的子对象（标准化每个 section 的结构）
  if (Array.isArray(normalized.sections)) {
    normalized.sections = (normalized.sections as Record<string, unknown>[]).map(normalizeSection);
  }

  // 特殊处理 legacy 数组内的子对象（向后兼容）
  if (Array.isArray(normalized.experience)) {
    normalized.experience = (normalized.experience as Record<string, unknown>[]).map(normalizeExperience);
  }
  if (Array.isArray(normalized.projects)) {
    normalized.projects = (normalized.projects as Record<string, unknown>[]).map(normalizeProject);
  }
  if (Array.isArray(normalized.education)) {
    normalized.education = (normalized.education as Record<string, unknown>[]).map(normalizeEducation);
  }

  // 收集未识别字段作为 warning（不忽略，提示有新字段）
  for (const key of Object.keys(data)) {
    if (!(key in RESUME_SCHEMA.fields)) {
      warnings.push(`检测到未知字段 "${key}"，已保留在原始数据中`);
    }
  }

  // 关键步骤：通过 normalizer 同步 sections 和 legacy 字段
  const synced = normalizeResumeData(normalized as unknown as ResumeData);

  // 关键步骤：清洗占位内容（"未提供"、"暂无"、"N/A" 等）
  // 此规则全局生效，自动适用于所有模板、所有栏目、所有未来新增字段
  const cleaned = cleanResumeData(synced);

  const valid = errors.length === 0;

  return { valid, errors, warnings, normalized: cleaned };
}

/**
 * 标准化单个 section 对象
 */
function normalizeSection(raw: Record<string, unknown>): Record<string, unknown> {
  const id = typeof raw.id === 'string' ? raw.id : `section_${Math.random().toString(36).slice(2, 8)}`;
  const title = typeof raw.title === 'string' ? raw.title : '其他';
  const itemType = (raw.itemType === 'experience-item' || raw.itemType === 'list-item' || raw.itemType === 'text-item')
    ? raw.itemType
    : 'experience-item';
  const priority = typeof raw.priority === 'number' ? raw.priority : 50;
  const placement = raw.placement === 'sidebar' || raw.placement === 'main' ? raw.placement : undefined;

  let items: unknown[] = [];
  if (Array.isArray(raw.items)) {
    items = raw.items;
  } else if (typeof raw.items === 'object' && raw.items !== null) {
    items = [raw.items];
  }

  const normalizedItems = items.map((item) => {
    // 处理原始字符串：根据 itemType 转换为正确的 item 对象
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) return null;
      if (itemType === 'list-item') {
        return { type: 'list-item' as const, items: [trimmed] };
      }
      if (itemType === 'text-item') {
        return { type: 'text-item' as const, content: trimmed };
      }
      if (itemType === 'experience-item') {
        return { type: 'experience-item' as const, title: trimmed, description: [] };
      }
      return null;
    }

    if (!item || typeof item !== 'object') {
      return null;
    }
    const obj = item as Record<string, unknown>;

    // 尊重 item 自身的 type 字段，不强制使用 section 的 itemType
    const actualType = obj.type === 'experience-item' || obj.type === 'list-item' || obj.type === 'text-item'
      ? obj.type
      : itemType;

    if (actualType === 'experience-item') {
      return {
        type: 'experience-item' as const,
        title: String(obj.title ?? ''),
        subtitle: obj.subtitle !== undefined ? String(obj.subtitle) : undefined,
        startDate: obj.startDate !== undefined ? String(obj.startDate) : undefined,
        endDate: obj.endDate !== undefined ? String(obj.endDate) : undefined,
        description: normalizeDescriptionArray(obj.description),
        meta: obj.meta !== undefined ? String(obj.meta) : undefined,
      };
    }
    if (actualType === 'list-item') {
      // 处理 items 可能是字符串、数组或对象
      let rawItems: unknown[] = [];
      if (Array.isArray(obj.items)) {
        rawItems = obj.items;
      } else if (typeof obj.items === 'string') {
        rawItems = obj.items.split(/[,，、;；\n]/).map((s: string) => s.trim()).filter(Boolean);
      } else if (obj.items !== undefined && obj.items !== null) {
        rawItems = [String(obj.items)];
      }
      return {
        type: 'list-item' as const,
        items: rawItems.filter((s): s is string => typeof s === 'string' && s.trim().length > 0),
      };
    }
    if (actualType === 'text-item') {
      return {
        type: 'text-item' as const,
        content: String(obj.content ?? ''),
      };
    }
    return null;
  }).filter(Boolean) as Record<string, unknown>[];

  return {
    id,
    title,
    itemType,
    items: normalizedItems,
    priority,
    placement,
  };
}

/**
 * 标准化PersonalInfo
 */
function normalizePersonalInfo(raw: Record<string, unknown>): PersonalInfo {
  const info: Record<string, string> = { name: '' };

  for (const [fieldName, fieldDef] of Object.entries(PERSONAL_INFO_SCHEMA.fields)) {
    const value = raw[fieldName];
    if (value === undefined || value === null) {
      info[fieldName] = (fieldDef.default as string) ?? '';
    } else if (typeof value !== 'string') {
      info[fieldName] = String(value);
    } else {
      info[fieldName] = value;
    }
  }

  return info as unknown as PersonalInfo;
}

/**
 * 标准化工作经历（legacy）
 */
function normalizeExperience(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    company: typeof raw.company === 'string' ? raw.company : String(raw.company ?? ''),
    position: typeof raw.position === 'string' ? raw.position : String(raw.position ?? ''),
    startDate: typeof raw.startDate === 'string' ? raw.startDate : String(raw.startDate ?? ''),
    endDate: typeof raw.endDate === 'string' ? raw.endDate : String(raw.endDate ?? ''),
    description: normalizeDescriptionArray(raw.description),
  };
}

/**
 * 标准化项目经历（legacy）
 */
function normalizeProject(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    name: typeof raw.name === 'string' ? raw.name : String(raw.name ?? ''),
    role: typeof raw.role === 'string' ? raw.role : String(raw.role ?? ''),
    description: normalizeDescriptionArray(raw.description),
    techStack: typeof raw.techStack === 'string' ? raw.techStack : String(raw.techStack ?? ''),
  };
}

/**
 * 标准化教育经历（legacy）
 */
function normalizeEducation(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    school: typeof raw.school === 'string' ? raw.school : String(raw.school ?? ''),
    degree: typeof raw.degree === 'string' ? raw.degree : String(raw.degree ?? ''),
    major: typeof raw.major === 'string' ? raw.major : String(raw.major ?? ''),
    startDate: typeof raw.startDate === 'string' ? raw.startDate : String(raw.startDate ?? ''),
    endDate: typeof raw.endDate === 'string' ? raw.endDate : String(raw.endDate ?? ''),
    gpa: typeof raw.gpa === 'string' ? raw.gpa : String(raw.gpa ?? ''),
    description: typeof raw.description === 'string' ? raw.description : String(raw.description ?? ''),
  };
}

/**
 * 标准化描述数组
 * 处理字符串/数组/空值等情况
 */
function normalizeDescriptionArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item === null || item === undefined) return '';
      return String(item);
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    if (value === '' || value === '无') return [];
    return value.split(/[\n;；]/).map((s) => s.trim()).filter(Boolean);
  }
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,，、;；\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
