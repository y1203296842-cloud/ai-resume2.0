/**
 * Markdown 解析器
 * 处理 .md 和 .txt 文件
 * 迁移时可直接复用
 */

export interface MarkdownParseResult {
  /** 提取的文本 */
  text: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 解析 Markdown/TXT 文件
 */
export function parseMarkdown(buffer: Buffer): MarkdownParseResult {
  try {
    const text = buffer.toString('utf-8');
    return {
      text,
      success: true,
    };
  } catch (error) {
    console.error('[MarkdownParser] 解析失败:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : '文件解析失败',
    };
  }
}
