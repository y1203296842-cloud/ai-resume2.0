/**
 * JSON Repair - 模型输出JSON修复层
 * 
 * 功能：
 * 当JSON.parse失败时，尝试修复常见错误
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

import { sanitizeJsonString } from './jsonSanitizer';

/**
 * 尝试修复损坏的JSON字符串
 * 返回修复后的JSON字符串，如果无法修复则返回null
 */
export function repairJson(brokenJson: string): string | null {
  if (!brokenJson || typeof brokenJson !== 'string') {
    return null;
  }

  // 先进行基础清洗
  let cleaned = sanitizeJsonString(brokenJson);
  if (!cleaned) return null;

  // 尝试1: 直接解析
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 尝试2: 修复未闭合的字符串
  cleaned = fixUnclosedStrings(cleaned);
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 尝试3: 修复未闭合的括号
  cleaned = fixUnclosedBrackets(cleaned);
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 尝试4: 修复单引号为双引号
  cleaned = fixSingleQuotes(cleaned);
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 尝试5: 修复缺少引号的key
  cleaned = fixUnquotedKeys(cleaned);
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 尝试6: 移除尾随逗号并修复括号
  cleaned = removeTrailingCommas(cleaned);
  cleaned = fixUnclosedBrackets(cleaned);
  if (tryParse(cleaned)) {
    return cleaned;
  }

  // 无法修复
  return null;
}

/**
 * 安全解析JSON，返回是否成功
 */
function tryParse(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * 修复未闭合的字符串
 */
function fixUnclosedStrings(json: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      if (inString) {
        // 字符串结束
        inString = false;
        result += char;
      } else {
        // 字符串开始
        inString = true;
        result += char;
      }
      continue;
    }

    if (inString) {
      // 在字符串内遇到换行，可能是未闭合的字符串
      if (char === '\n' || char === '\r') {
        // 尝试闭合字符串
        result += '"';
        inString = false;
        // 跳过换行
        if (char === '\r' && json[i + 1] === '\n') {
          i++;
        }
        continue;
      }
      result += char;
    } else {
      result += char;
    }
  }

  // 如果最后还在字符串内，尝试闭合
  if (inString) {
    result += '"';
  }

  return result;
}

/**
 * 修复未闭合的括号
 */
function fixUnclosedBrackets(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  // 计算未闭合的括号
  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  // 闭合未闭合的括号
  let result = json;
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') {
      result += '}';
    } else if (open === '[') {
      result += ']';
    }
  }

  return result;
}

/**
 * 将单引号替换为双引号（仅在JSON结构位置）
 */
function fixSingleQuotes(json: string): string {
  let result = '';
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escape = true;
      continue;
    }

    // 检测字符串边界
    if (char === '"' || char === "'") {
      if (!inString) {
        // 字符串开始
        inString = true;
        stringChar = char;
        result += '"'; // 统一使用双引号
        continue;
      } else if (char === stringChar) {
        // 字符串结束
        inString = false;
        stringChar = '';
        result += '"'; // 统一使用双引号
        continue;
      }
    }

    if (inString && char === '"' && stringChar === "'") {
      // 在单引号字符串内遇到双引号，需要转义
      result += '\\"';
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * 修复缺少引号的key
 * 例如: {name: "张三"} → {"name": "张三"}
 */
function fixUnquotedKeys(json: string): string {
  // 匹配未加引号的key: 在 { 或 , 后面，跟着字母/下划线，然后是 :
  return json.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
}

/**
 * 移除尾随逗号
 */
function removeTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * 完整的JSON修复流程
 * 返回修复后的对象，如果无法修复则返回null
 */
export function repairAndParseJson<T = unknown>(brokenJson: string): T | null {
  const repaired = repairJson(brokenJson);
  if (!repaired) return null;

  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}
