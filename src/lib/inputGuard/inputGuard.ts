/**
 * Input Guard - 输入安全层
 * 
 * 防止：
 * 1. 超长输入
 * 2. Prompt Injection
 * 3. 非求职内容大量输入
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

import type { ChatMessage, ResumeMode } from '../types';

// ============================================
// 常量
// ============================================

/** 单次输入最大字符数 */
const MAX_SINGLE_INPUT_LENGTH = 5000;
/** 所有消息总最大字符数 */
const MAX_TOTAL_INPUT_LENGTH = 30000;
/** 单条消息最大字符数 */
const MAX_MESSAGE_LENGTH = 8000;

// ============================================
// Prompt Injection 检测模式
// ============================================

const INJECTION_PATTERNS = [
  // 中文
  /忽略(?:之前|上面|以上)(?:所有|的)?(?:规则|指令|提示)/i,
  /无视(?:之前|上面|以上)(?:所有|的)?(?:规则|指令|提示)/i,
  /你现在(?:是|变成|扮演)/i,
  /你的(?:新|真实)(?:角色|身份)(?:是|为)/i,
  /输出(?:你的|系统)(?:提示词|指令|规则|配置)/i,
  /显示(?:你的|系统)(?:提示词|指令|规则|配置)/i,
  /(?:系统|内部)(?:提示词|指令|规则)(?:是|为)/i,
  /不要(?:遵守|遵循)(?:之前|上面|的)?(?:规则|指令)/i,
  /覆盖(?:之前|上面|所有)(?:的)?(?:规则|指令)/i,
  /进入(?:开发者|调试|管理员)模式/i,
  /DAN\s*模式/i,
  /越狱/i,
  // 英文
  /ignore\s+(all\s+)?(previous|above)\s+(rules|instructions|prompts)/i,
  /disregard\s+(all\s+)?(previous|above)\s+(rules|instructions)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /your\s+(new|real)\s+(role|identity)\s+is/i,
  /output\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)/i,
  /do\s+not\s+(follow|obey)\s+(the\s+)?(previous\s+)?rules/i,
  /enter\s+(developer|debug|admin)\s+mode/i,
  /jailbreak/i,
  /act\s+as\s+(a\s+)?(different|new)/i,
  /pretend\s+you\s+are/i,
];

// ============================================
// 类型定义
// ============================================

export interface InputCheckResult {
  safe: boolean;
  warnings: string[];
  errors: string[];
  /** 清洗后的消息（去除危险内容） */
  cleanedMessages?: ChatMessage[];
}

// ============================================
// 核心API
// ============================================

/**
 * 检查单条用户输入
 */
export function checkUserInput(input: string): InputCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. 空输入检查
  if (!input || input.trim().length === 0) {
    errors.push('输入不能为空');
    return { safe: false, warnings, errors };
  }

  // 2. 长度检查
  if (input.length > MAX_SINGLE_INPUT_LENGTH) {
    errors.push(`内容较长（${input.length}字），请分段发送，或者上传简历文件。`);
    return { safe: false, warnings, errors };
  }

  // 3. Prompt Injection 检测
  const injectionDetected = detectInjection(input);
  if (injectionDetected) {
    warnings.push(`检测到潜在的指令注入尝试: "${injectionDetected}"`);
    // 不直接拒绝，而是添加防护提示
    // 实际的防护在system prompt中已经实现
  }

  // 4. 非求职内容检测（仅在对话初期）
  const nonJobContent = detectNonJobContent(input);
  if (nonJobContent) {
    warnings.push(`检测到非求职相关内容: ${nonJobContent}`);
  }

  return {
    safe: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * 检查完整对话历史
 */
export function checkConversation(messages: ChatMessage[], _mode: ResumeMode): InputCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. 总长度检查
  const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  if (totalLength > MAX_TOTAL_INPUT_LENGTH) {
    errors.push(`对话内容过长（${totalLength}字），建议开始新的对话。`);
    return { safe: false, warnings, errors };
  }

  // 2. 单条消息长度检查
  for (const msg of messages) {
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      warnings.push(`有消息内容过长（${msg.content.length}字），可能影响处理效果。`);
    }
  }

  // 3. 消息数量检查
  if (messages.length > 30) {
    warnings.push('对话轮次较多，建议开始新的对话以获取更好的效果。');
  }

  // 4. 检查所有用户消息的注入尝试
  const userMessages = messages.filter(m => m.role === 'user');
  for (const msg of userMessages) {
    const injection = detectInjection(msg.content);
    if (injection) {
      warnings.push(`检测到潜在的指令注入: "${injection}"`);
    }
  }

  return {
    safe: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * 清洗用户输入（去除危险内容）
 */
export function sanitizeInput(input: string): string {
  let cleaned = input;

  // 移除常见的注入前缀
  cleaned = cleaned.replace(/^(?:system|assistant|ai)[\s:：]+/gi, '');
  
  // 移除markdown代码块包裹（防止伪装成系统指令）
  // 但如果内容看起来像简历内容则保留
  if (cleaned.startsWith('```') && !isResumeContent(cleaned)) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }

  return cleaned.trim();
}

// ============================================
// 内部检测函数
// ============================================

/**
 * 检测Prompt Injection
 * 返回匹配的模式描述，未检测到返回null
 */
function detectInjection(input: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

/**
 * 检测非求职内容
 */
function detectNonJobContent(input: string): string | null {
  const lowerInput = input.toLowerCase();
  
  // 明显的非求职内容模式
  const nonJobPatterns = [
    { pattern: /(?:写|帮我写|生成).{0,5}(?:小说|故事|诗歌|作文|论文|作业)/i, desc: '创作类请求' },
    { pattern: /(?:翻译|translate).{0,10}(?:文章|段落|句子)/i, desc: '翻译请求' },
    { pattern: /(?:今天|明天|昨天).{0,5}(?:天气|新闻|热点)/i, desc: '信息查询' },
    { pattern: /(?:讲个|说个).{0,5}(?:笑话|故事|段子)/i, desc: '娱乐请求' },
    { pattern: /(?:陪我|跟我).{0,5}(?:聊天|说话|谈心)/i, desc: '闲聊请求' },
  ];

  for (const { pattern, desc } of nonJobPatterns) {
    if (pattern.test(lowerInput)) {
      return desc;
    }
  }

  return null;
}

/**
 * 判断内容是否像简历内容
 */
function isResumeContent(input: string): boolean {
  const resumeKeywords = [
    '教育', '经历', '技能', '项目', '工作', '实习',
    '专业', '学校', '公司', '职位', '证书', '评价',
    'education', 'experience', 'skills', 'projects',
  ];

  const lowerInput = input.toLowerCase();
  const matchCount = resumeKeywords.filter(k => lowerInput.includes(k)).length;
  
  return matchCount >= 2;
}
