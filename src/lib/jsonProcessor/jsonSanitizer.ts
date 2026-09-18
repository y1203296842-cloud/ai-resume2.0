/**
 * JSON Sanitizer - 模型输出JSON清洗层
 * 
 * 功能：
 * 1. 去除Markdown代码块包裹
 * 2. 提取JSON主体内容
 * 3. 修复常见模型输出错误（多余逗号、未闭合等）
 * 4. 提供安全的JSON解析入口
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

/**
 * 清洗原始JSON字符串
 * 去除Markdown包裹、注释、多余空白等
 */
export function sanitizeJsonString(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw.trim();

  // 1. 去除Markdown代码块包裹
  // 匹配 ```json ... ``` 或 ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 2. 提取第一个 { 到最后一个 } 之间的内容
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. 移除JSON中的单行注释 (// ...)
  // 注意：不能移除字符串内的 //
  cleaned = removeJsonComments(cleaned);

  // 4. 移除对象/数组末尾的多余逗号
  // 匹配 ,} 或 ,] 模式
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // 5. 修复常见的引号问题
  // 将中文引号转换为英文引号（仅在JSON key/value位置）
  cleaned = cleaned.replace(/["""]/g, '"');
  cleaned = cleaned.replace(/['']/g, "'");

  // 6. 修复未转义的控制字符
  cleaned = fixUnescapedControlChars(cleaned);

  return cleaned.trim();
}

/**
 * 移除JSON中的注释
 * 保留字符串内的 // 和 /*
 */
function removeJsonComments(json: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  let i = 0;

  while (i < json.length) {
    const char = json[i];
    const nextChar = json[i + 1];

    if (escape) {
      result += char;
      escape = false;
      i++;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escape = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (!inString) {
      // 检查单行注释
      if (char === '/' && nextChar === '/') {
        // 跳过到行尾
        while (i < json.length && json[i] !== '\n') {
          i++;
        }
        continue;
      }
      // 检查多行注释
      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) {
          i++;
        }
        i += 2; // 跳过 */
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * 修复未转义的控制字符
 * JSON字符串内不允许有未转义的换行、制表符等
 */
function fixUnescapedControlChars(json: string): string {
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
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      // 在字符串内，转义控制字符
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char === '\b') {
        result += '\\b';
      } else if (char === '\f') {
        result += '\\f';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * 安全解析JSON
 * 先清洗，再解析，失败时返回null
 */
export function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    const cleaned = sanitizeJsonString(raw);
    if (!cleaned) return null;
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * 验证JSON字符串是否合法
 */
export function isValidJson(raw: string): boolean {
  return safeJsonParse(raw) !== null;
}

/**
 * 从文本中提取JSON部分
 * 用于从Agent输出中提取 [GENERATE_RESUME] 后的JSON
 */
export function extractJsonFromText(text: string): string | null {
  if (!text) return null;

  // 查找 [GENERATE_RESUME] 标记
  const markerIndex = text.indexOf('[GENERATE_RESUME]');
  if (markerIndex === -1) {
    // 没有标记，尝试直接提取JSON
    return extractJsonObject(text);
  }

  // 提取标记后的内容
  const afterMarker = text.substring(markerIndex + '[GENERATE_RESUME]'.length);
  return extractJsonObject(afterMarker);
}

/**
 * 从文本中提取第一个完整的JSON对象
 * 使用括号计数法，正确处理嵌套
 */
function extractJsonObject(text: string): string | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < text.length; i++) {
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
      if (char === '{') depth++;
      if (char === '}') depth--;
      if (depth === 0) {
        return text.substring(firstBrace, i + 1);
      }
    }
  }

  // 未闭合，返回从第一个{到最后一个}
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * 简历JSON Schema验证
 * 确保生成的JSON符合预期结构
 */
export function validateResumeJsonSchema(obj: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    errors.push('JSON必须是一个对象');
    return { valid: false, errors };
  }

  const data = obj as Record<string, unknown>;

  // 检查必要字段
  const requiredFields = ['personalInfo', 'education', 'skills'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`缺少必要字段: ${field}`);
    }
  }

  // 检查personalInfo结构
  if (data.personalInfo && typeof data.personalInfo === 'object') {
    const pi = data.personalInfo as Record<string, unknown>;
    if (pi.name !== undefined && typeof pi.name !== 'string') {
      errors.push('personalInfo.name 必须是字符串');
    }
  }

  // 检查education是数组
  if (data.education !== undefined && !Array.isArray(data.education)) {
    errors.push('education 必须是数组');
  }

  // 检查skills是数组
  if (data.skills !== undefined && !Array.isArray(data.skills)) {
    errors.push('skills 必须是数组');
  }

  // 检查experience是数组（如果存在）
  if (data.experience !== undefined && !Array.isArray(data.experience)) {
    errors.push('experience 必须是数组');
  }

  // 检查projects是数组（如果存在）
  if (data.projects !== undefined && !Array.isArray(data.projects)) {
    errors.push('projects 必须是数组');
  }

  // 检查evaluation是字符串（如果存在）
  if (data.evaluation !== undefined && typeof data.evaluation !== 'string') {
    errors.push('evaluation 必须是字符串');
  }

  return { valid: errors.length === 0, errors };
}
