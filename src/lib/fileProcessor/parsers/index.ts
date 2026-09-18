/**
 * 文件解析器 - 统一入口
 * 根据文件类型自动选择对应的解析器
 * 迁移时只需替换底层解析库
 */

import { parsePdf, type PdfParseResult } from './pdf';
import { parseDocx, type DocxParseResult } from './docx';
import { parseMarkdown, type MarkdownParseResult } from './markdown/parser';

export type { PdfParseResult, DocxParseResult, MarkdownParseResult };

export interface UnifiedParseResult {
  /** 提取的文本 */
  text: string;
  /** 文件类型 */
  fileType: 'pdf' | 'docx' | 'markdown' | 'unknown';
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** PDF 特有：解析策略 */
  pdfStrategy?: 'text' | 'layout' | 'ocr' | 'failed';
  /** PDF 特有：是否需要 OCR 但不可用 */
  ocrUnavailable?: boolean;
  /** 解析日志 */
  logs?: string[];
}

/**
 * 根据文件扩展名判断文件类型
 */
function detectFileType(fileName: string): 'pdf' | 'docx' | 'markdown' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') return 'markdown';
  
  return 'unknown';
}

/**
 * 统一文件解析入口
 * 根据文件类型自动选择解析策略
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<UnifiedParseResult> {
  const fileType = detectFileType(fileName);

  switch (fileType) {
    case 'pdf': {
      const result = await parsePdf(buffer);
      return {
        text: result.text,
        fileType: 'pdf',
        success: result.strategy !== 'failed' && result.text.length > 0,
        error: result.strategy === 'failed' ? 'PDF 解析失败，所有策略均未成功' : undefined,
        pdfStrategy: result.strategy,
        ocrUnavailable: result.ocrUnavailable,
        logs: result.logs,
      };
    }

    case 'docx': {
      const result = await parseDocx(buffer);
      return {
        text: result.text,
        fileType: 'docx',
        success: result.success,
        error: result.error,
      };
    }

    case 'markdown': {
      const result = parseMarkdown(buffer);
      return {
        text: result.text,
        fileType: 'markdown',
        success: result.success,
        error: result.error,
      };
    }

    default:
      return {
        text: '',
        fileType: 'unknown',
        success: false,
        error: `不支持的文件类型: ${fileName}`,
      };
  }
}

// 导出子模块
export * from './pdf';
export * from './docx';
export { parseMarkdown } from './markdown/parser';
