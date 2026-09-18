/**
 * PDF 解析器 - 提取 PDF 文本内容
 * 迁移时可替换为其他 PDF 解析库
 */

export interface PDFParseResult {
  text: string;
  pageCount: number;
  info?: Record<string, unknown>;
}

/**
 * 解析 PDF 文件，提取文本内容
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    // 动态加载 pdf-parse，避免 Next.js bundler 问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('pdf-parse');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse: any = (mod as any).default || mod;
    const result = await pdfParse(buffer);
    return {
      text: result.text,
      pageCount: result.numpages,
      info: result.info as Record<string, unknown>,
    };
  } catch (error) {
    console.error('[PDF Parser] 解析失败:', error);
    throw new Error('PDF 文件解析失败，请确认文件格式正确且未加密。');
  }
}
