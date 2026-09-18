/**
 * PDF 文本解析器 - 第一层
 * 使用 pdf-parse 提取纯文本内容
 * 迁移时可替换为 pdfjs-dist 或其他 PDF 解析库
 */

import { checkPdfTextQuality, isLikelyScannedPdf, type QualityCheckResult } from './pdfQualityChecker';

// 动态加载 pdf-parse v2.x，避免 Next.js bundler 问题
// v2 API: import { PDFParse } from 'pdf-parse'; new PDFParse({ data: buffer }).getText()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PDFParseClass: any = null;
async function getPdfParseClass() {
  if (PDFParseClass) return PDFParseClass;
  try {
    const mod = await import('pdf-parse');
    // v2.x: named export { PDFParse } (class)
    // v1.x: default export (function) — fallback
    PDFParseClass = (mod as any).PDFParse || (mod as any).default || mod;
    return PDFParseClass;
  } catch (err) {
    console.error('[PdfTextParser] 加载 pdf-parse 模块失败:', err);
    throw err;
  }
}

export interface PdfTextParseResult {
  /** 提取的文本 */
  text: string;
  /** 页数 */
  pageCount: number;
  /** 质量检查结果 */
  quality: QualityCheckResult;
  /** 是否需要升级到下一层解析 */
  needsFallback: boolean;
  /** 是否需要 OCR */
  needsOcr: boolean;
  /** PDF 元信息 */
  info?: Record<string, unknown>;
}

/**
 * 第一层：普通文字 PDF 解析
 * 使用 pdf-parse 提取文本，并检查质量
 *
 * 兼容 v1（函数调用）和 v2（class + getText()）两种 API。
 * 项目当前安装 pdf-parse v2.4.5，使用 v2 API。
 */
export async function parsePdfText(buffer: Buffer): Promise<PdfTextParseResult> {
  try {
    const PDFParseClass = await getPdfParseClass();

    let text: string;
    let pageCount: number;
    let info: Record<string, unknown> | undefined;

    // v2 API: new PDFParse({ data }).getText() → TextResult { text, total, pages }
    // v1 API: pdfParse(buffer) → { text, numpages, info }
    const isV2Class =
      typeof PDFParseClass === 'function' &&
      PDFParseClass.prototype &&
      typeof PDFParseClass.prototype.getText === 'function';

    if (isV2Class) {
      const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = result.text || '';
        pageCount = result.total || 0;
      } finally {
        await parser.destroy?.();
      }
    } else {
      // v1 fallback
      const result = await PDFParseClass(buffer);
      text = result.text || '';
      pageCount = result.numpages || 0;
      info = result.info as Record<string, unknown> | undefined;
    }

    // 检查文本质量
    const quality = checkPdfTextQuality(text);

    // 判断是否需要 fallback
    const needsFallback = !quality.passed;
    const needsOcr = isLikelyScannedPdf(quality);

    return {
      text,
      pageCount,
      quality,
      needsFallback,
      needsOcr,
      info,
    };
  } catch (error) {
    console.error('[PdfTextParser] 解析失败:', error);
    // 解析失败，返回空结果并标记需要 fallback
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['PDF 解析库报错'],
        metrics: {
          totalChars: 0,
          chineseChars: 0,
          chineseRatio: 0,
          readableRatio: 0,
          whitespaceRatio: 0,
          garbageRatio: 1,
          validLines: 0,
          avgLineLength: 0,
        },
      },
      needsFallback: true,
      needsOcr: false, // 无法判断，交给下一层
      info: undefined,
    };
  }
}
