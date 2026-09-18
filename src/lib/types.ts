import type { TemplateId } from '@/config/templates';

export type ResumeMode = 'optimize' | 'apply' | 'explore';

export type UserType = 'student' | 'fresh_graduate' | 'experienced' | 'career_change' | 'job_hopper';

export type CurrentStatus = '在校大学生' | '应届毕业生' | '在职' | '离职' | '转行中';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  mode: ResumeMode;
  messages: ChatMessage[];
  resumeText?: string;
  targetPosition?: string;
}

/** 固定基础信息字段 - 每个人都有，未提供则留空占位 */
export interface PersonalInfo {
  name: string;
  gender?: string;
  ethnicity?: string;
  politicalStatus?: string;
  phone?: string;
  email?: string;
  hometown?: string;
  school?: string;
  major?: string;
  degree?: string;
  englishScore?: string;
  age?: string;
  photo?: string;
  /** 当前状态 - 不展示在简历，但影响生成策略 */
  currentStatus?: CurrentStatus;
}

// ============================================
// 动态栏目系统（Dynamic Sections）
//
// 核心原则：内容决定栏目，而不是栏目决定内容。
// AI 根据用户真实经历进行语义归纳，自动生成最合理的栏目组合。
// ============================================

/**
 * 动态栏目条目类型
 * experience-item: 经历型条目（公司/机构 + 职位/角色 + 时间 + 描述列表）
 * list-item: 列表型条目（技能、证书等纯文本列表）
 * text-item: 文本型条目（个人优势等纯段落）
 */
export type ResumeSectionItemType = 'experience-item' | 'list-item' | 'text-item';

export interface ResumeExperienceItem {
  type: 'experience-item';
  /** 主标题（公司名/项目名/组织名等） */
  title: string;
  /** 副标题（职位/角色等） */
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  /** 要点描述列表 */
  description: string[];
  /** 额外标签信息（技术栈、成果等） */
  meta?: string;
}

export interface ResumeListItem {
  type: 'list-item';
  items: string[];
}

export interface ResumeTextItem {
  type: 'text-item';
  content: string;
}

export type ResumeSectionItem = ResumeExperienceItem | ResumeListItem | ResumeTextItem;

export interface ResumeSection {
  /** 栏目唯一标识（英文，语义化） */
  id: string;
  /** 栏目显示标题（中文，面向用户） */
  title: string;
  /** 栏目类型 - 决定渲染方式 */
  itemType: ResumeSectionItemType;
  /** 栏目内容条目 */
  items: ResumeSectionItem[];
  /** 优先级权重（越大越靠前，AI根据岗位相关性和内容价值自动计算） */
  priority?: number;
  /** 建议放置位置 - sidebar/main（双栏模板使用） */
  placement?: 'sidebar' | 'main';
}

export interface ResumeData {
  personalInfo: PersonalInfo;

  /**
   * 动态栏目数组 — 简历的主体内容结构
   *
   * 核心原则：内容决定栏目，而不是栏目决定内容。
   * AI 根据用户真实经历进行语义归纳，自动生成最合理的栏目组合。
   *
   * 旧固定字段（experience/projects/skills/certificates/languages/evaluation）
   * 仅作为向后兼容的别名，模板和导出器优先使用 sections。
   */
  sections: ResumeSection[];

  // ========== 以下为向后兼容的固定字段 ==========
  // 新逻辑以 sections 为主，这些字段仅作为 legacy 兼容层
  // 当 sections 为空时，从这些字段构建
  // ================================================

  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  education?: Array<{
    school: string;
    degree?: string;
    major?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    description?: string;
  }>;
  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  experience?: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    description: string[];
  }>;
  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  projects?: Array<{
    name: string;
    role?: string;
    description: string[];
    techStack?: string;
  }>;
  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  skills?: string[];
  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  certificates?: string[];
  /** @deprecated 请使用 sections，保留仅用于向后兼容 */
  languages?: string[];
  /**
   * 个人优势 - Agent根据目标岗位自动生成
   * @deprecated 请使用 sections 中 itemType === 'text-item' 且 id === 'evaluation' 的栏目
   */
  evaluation?: string;
}

export interface AgentState {
  mode: ResumeMode;
  step: number;
  userType?: UserType;
  collectedInfo: Record<string, string>;
  recommendedPositions?: Array<{
    title: string;
    reason: string;
    matchScore: number;
  }>;
  resumeData?: ResumeData;
  isComplete: boolean;
}

export interface ExportRequest {
  resumeData: ResumeData;
  format: 'pdf' | 'docx';
  templateId?: TemplateId;
}
