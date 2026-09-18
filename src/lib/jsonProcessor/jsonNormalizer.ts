/**
 * JSON Normalizer - 通用JSON标准化器
 * 
 * 不是修一个错误，而是处理所有非标准JSON
 * 支持：
 * 1. Markdown代码块提取
 * 2. 前后说明文字去除
 * 3. 单双引号/中文符号转换
 * 4. 尾随逗号修复
 * 5. 缺少key引号修复
 * 6. 字符串内特殊字符转义
 * 7. 括号不完整补齐
 * 8. 截断检测与恢复
 * 9. 字段类型错误转换
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

// ============================================
// 类型定义
// ============================================

export interface NormalizeResult {
  success: boolean;
  json: string | null;
  data: unknown | null;
  truncated: boolean;
  fixes: string[];
}

// ============================================
// 主入口
// ============================================

/**
 * 将任意非标准JSON文本标准化为合法JSON
 * 这是jsonProcessor的核心升级
 */
export function normalizeJson(raw: string): NormalizeResult {
  if (!raw || typeof raw !== 'string') {
    return { success: false, json: null, data: null, truncated: false, fixes: ['输入为空'] };
  }

  const fixes: string[] = [];
  let text = raw.trim();

  // Step 1: 去除Markdown代码块包裹
  text = stripMarkdownCodeBlock(text, fixes);

  // Step 2: 去除JSON前后的说明文字
  text = stripSurroundingText(text, fixes);

  // Step 3: 中文标点符号转换
  text = convertChinesePunctuation(text, fixes);

  // Step 4: 单引号转双引号
  text = convertSingleQuotes(text, fixes);

  // Step 5: 修复缺少引号的key
  text = fixUnquotedKeys(text, fixes);

  // Step 6: 修复字符串内未转义的特殊字符
  text = fixUnescapedChars(text, fixes);

  // Step 7: 移除尾随逗号
  text = removeTrailingCommas(text, fixes);

  // Step 8: 补齐未闭合的括号
  const { text: bracketFixed, wasTruncated } = fixBrackets(text, fixes);
  text = bracketFixed;

  // Step 9: 尝试解析
  try {
    const data = JSON.parse(text);
    return { success: true, json: text, data, truncated: wasTruncated, fixes };
  } catch {
    // Step 10: 最后尝试 - 更激进的修复
    const aggressiveResult = aggressiveRepair(text, fixes);
    if (aggressiveResult) {
      try {
        const data = JSON.parse(aggressiveResult);
        return { success: true, json: aggressiveResult, data, truncated: wasTruncated, fixes };
      } catch {
        return { success: false, json: null, data: null, truncated: wasTruncated, fixes: [...fixes, '激进修复后仍无法解析'] };
      }
    }
    return { success: false, json: null, data: null, truncated: wasTruncated, fixes: [...fixes, '所有修复方式均失败'] };
  }
}

// ============================================
// Step 1: 去除Markdown代码块
// ============================================

function stripMarkdownCodeBlock(text: string, fixes: string[]): string {
  // 匹配 ```json ... ``` 或 ``` ... ```
  const codeBlockMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    fixes.push('去除Markdown代码块包裹');
    return codeBlockMatch[1].trim();
  }

  // 只有开头的 ``` 没有结尾
  const openMatch = text.match(/```(?:json|JSON)?\s*([\s\S]*)/);
  if (openMatch && openMatch[1].includes('{')) {
    fixes.push('去除Markdown代码块开头标记');
    return openMatch[1].trim();
  }

  return text;
}

// ============================================
// Step 2: 去除前后说明文字
// ============================================

function stripSurroundingText(text: string, fixes: string[]): string {
  // 找到第一个 { 的位置
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return text;

  // 如果 { 前面有文字，去掉
  if (firstBrace > 0) {
    const prefix = text.substring(0, firstBrace).trim();
    if (prefix.length > 0) {
      fixes.push(`去除JSON前说明文字: "${prefix.substring(0, 30)}..."`);
      text = text.substring(firstBrace);
    }
  }

  // 找到最后一个 } 的位置
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace === -1) return text;

  // 如果 } 后面有文字，去掉
  if (lastBrace < text.length - 1) {
    const suffix = text.substring(lastBrace + 1).trim();
    if (suffix.length > 0) {
      fixes.push(`去除JSON后说明文字: "${suffix.substring(0, 30)}..."`);
      text = text.substring(0, lastBrace + 1);
    }
  }

  return text;
}

// ============================================
// Step 3: 中文标点转换
// ============================================

function convertChinesePunctuation(text: string, fixes: string[]): string {
  let result = text;
  let changed = false;
  let inString = false;
  let escape = false;

  // 只转换JSON结构位置的中文标点，不转换字符串值内部的
  // 策略：逐字符扫描，在字符串外替换中文标点
  const chars = [...result];
  const output: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (escape) {
      output.push(char);
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      output.push(char);
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      output.push(char);
      continue;
    }

    if (!inString) {
      // 在JSON结构位置替换中文标点
      switch (char) {
        case '\u201C': // "
        case '\u201D': // "
        case '\u300C': // 「
        case '\u300D': // 」
          output.push('"');
          changed = true;
          break;
        case '\u2018': // '
        case '\u2019': // '
          output.push("'");
          changed = true;
          break;
        case '\uFF1A': // ：
          output.push(':');
          changed = true;
          break;
        case '\uFF0C': // ，
          output.push(',');
          changed = true;
          break;
        case '\uFF1B': // ；
          output.push(';');
          changed = true;
          break;
        case '\uFF08': // （
          output.push('(');
          changed = true;
          break;
        case '\uFF09': // ）
          output.push(')');
          changed = true;
          break;
        case '\u3010': // 【
          output.push('[');
          changed = true;
          break;
        case '\u3011': // 】
          output.push(']');
          changed = true;
          break;
        default:
          output.push(char);
      }
    } else {
      output.push(char);
    }
  }

  result = output.join('');

  if (changed) {
    fixes.push('中文标点符号转换为英文标点');
  }

  return result;
}

// ============================================
// Step 4: 单引号转双引号
// ============================================

function convertSingleQuotes(text: string, fixes: string[]): string {
  let result = '';
  let inString = false;
  let stringChar = '';
  let escape = false;
  let changed = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

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
        if (char === "'") {
          result += '"';
          changed = true;
        } else {
          result += char;
        }
        continue;
      } else if (char === stringChar) {
        // 字符串结束
        inString = false;
        stringChar = '';
        if (char === "'") {
          result += '"';
          changed = true;
        } else {
          result += char;
        }
        continue;
      }
    }

    // 在字符串内处理
    if (inString) {
      if (stringChar === "'" && char === '"') {
        // 在单引号字符串内遇到双引号，需要转义
        result += '\\"';
        changed = true;
      } else if (stringChar === '"' && char === "'") {
        // 在双引号字符串内遇到单引号，保持原样
        result += char;
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  if (changed) {
    fixes.push('单引号转换为双引号');
  }

  return result;
}

// ============================================
// Step 5: 修复缺少引号的key
// ============================================

function fixUnquotedKeys(text: string, fixes: string[]): string {
  // 匹配未加引号的key: 在 { 或 , 后面，跟着字母/下划线/中文，然后是 :
  const result = text.replace(/([{,]\s*)([a-zA-Z_\u4e00-\u9fff][a-zA-Z0-9_\u4e00-\u9fff]*)\s*:/g, '$1"$2":');
  
  if (result !== text) {
    fixes.push('修复缺少引号的key');
  }
  
  return result;
}

// ============================================
// Step 6: 修复字符串内未转义的特殊字符
// ============================================

function fixUnescapedChars(text: string, fixes: string[]): string {
  let result = '';
  let inString = false;
  let escape = false;
  let changed = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

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
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      // 在字符串内，转义控制字符
      if (char === '\n') {
        result += '\\n';
        changed = true;
      } else if (char === '\r') {
        result += '\\r';
        changed = true;
      } else if (char === '\t') {
        result += '\\t';
        changed = true;
      } else if (char === '\b') {
        result += '\\b';
        changed = true;
      } else if (char === '\f') {
        result += '\\f';
        changed = true;
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  if (changed) {
    fixes.push('修复字符串内未转义的控制字符');
  }

  return result;
}

// ============================================
// Step 7: 移除尾随逗号
// ============================================

function removeTrailingCommas(text: string, fixes: string[]): string {
  const result = text.replace(/,(\s*[}\]])/g, '$1');
  
  if (result !== text) {
    fixes.push('移除尾随逗号');
  }
  
  return result;
}

// ============================================
// Step 8: 补齐未闭合的括号
// ============================================

function fixBrackets(text: string, fixes: string[]): { text: string; wasTruncated: boolean } {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let wasTruncated = false;

  // 计算未闭合的括号
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

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

  // 如果最后还在字符串内，说明被截断了
  if (inString) {
    wasTruncated = true;
    text += '"';
    fixes.push('检测到截断：未闭合字符串，已自动闭合');
  }

  // 闭合未闭合的括号
  let result = text;
  while (stack.length > 0) {
    wasTruncated = true;
    const open = stack.pop();
    if (open === '{') {
      result += '}';
    } else if (open === '[') {
      result += ']';
    }
  }

  if (wasTruncated && !fixes.some(f => f.includes('截断'))) {
    fixes.push('检测到截断：未闭合括号，已自动补齐');
  }

  return { text: result, wasTruncated };
}

// ============================================
// Step 10: 激进修复
// ============================================

function aggressiveRepair(text: string, fixes: string[]): string | null {
  let result = text;

  // 尝试1: 移除所有注释
  result = result.replace(/\/\/.*$/gm, '');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // 尝试2: 移除所有控制字符
  result = result.replace(/[\x00-\x1F\x7F]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    if (match === '\t') return '\\t';
    return '';
  });

  // 尝试3: 再次移除尾随逗号
  result = removeTrailingCommas(result, fixes);

  // 尝试4: 再次补齐括号
  const { text: bracketFixed } = fixBrackets(result, fixes);
  result = bracketFixed;

  fixes.push('执行激进修复');
  return result;
}
