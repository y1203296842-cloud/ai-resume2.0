/**
 * DOCX 解析器 - 提取 Word 文档文本内容
 * 迁移时可替换为其他 DOCX 解析库
 */

import mammoth from 'mammoth';

export interface DOCXParseResult {
  text: string;
  html?: string;
}

/**
 * 解析 DOCX 文件，提取文本内容
 */
export async function parseDOCX(buffer: Buffer): Promise<DOCXParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
    };
  } catch (error) {
    console.error('[DOCX Parser] 解析失败:', error);
    throw new Error('Word 文件解析失败，请确认文件格式正确。');
  }
}
