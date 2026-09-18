/**
 * DOCX 解析器
 * 使用 mammoth 提取 DOCX 文本内容
 * 迁移时可替换为其他 DOCX 解析库
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');

export interface DocxParseResult {
  /** 提取的文本 */
  text: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 解析 DOCX 文件，提取文本内容
 */
export async function parseDocx(buffer: Buffer): Promise<DocxParseResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (mammoth as any).extractRawText({ buffer });
    return {
      text: result.value || '',
      success: true,
    };
  } catch (error) {
    console.error('[DocxParser] 解析失败:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'DOCX 解析失败',
    };
  }
}
