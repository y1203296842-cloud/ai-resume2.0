/**
 * PDF 解析器 - 多级 Fallback 策略
 * 第一层：普通文字解析
 * 第二层：布局解析
 * 第三层：OCR 解析（扫描图片型 PDF）
 * 
 * 迁移时只需替换底层解析库，策略逻辑保持不变
 */

import { parsePdfText, type PdfTextParseResult } from './pdfTextParser';
import { parsePdfLayout, type PdfLayoutParseResult } from './pdfLayoutParser';
import { parsePdfOcr, type PdfOcrParseResult } from './pdfOcrParser';
import { checkPdfTextQuality, type QualityCheckResult } from './pdfQualityChecker';

export type { QualityCheckResult, PdfTextParseResult, PdfLayoutParseResult, PdfOcrParseResult };

export interface PdfParseResult {
  /** 最终提取的文本 */
  text: string;
  /** 页数 */
  pageCount: number;
  /** 使用的解析策略 */
  strategy: 'text' | 'layout' | 'ocr' | 'failed';
  /** 质量检查结果 */
  quality: QualityCheckResult;
  /** 解析过程日志 */
  logs: string[];
  /** 是否需要 OCR 但不可用 */
  ocrUnavailable: boolean;
}

/**
 * PDF 多级解析入口
 * 自动选择最佳解析策略
 */
export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const logs: string[] = [];

  // 第一层：普通文字解析
  logs.push('[PDF] 尝试第一层：文字解析');
  const textResult = await parsePdfText(buffer);
  
  if (!textResult.needsFallback && textResult.quality.passed) {
    logs.push('[PDF] 第一层解析成功');
    return {
      text: textResult.text,
      pageCount: textResult.pageCount,
      strategy: 'text',
      quality: textResult.quality,
      logs,
      ocrUnavailable: false,
    };
  }

  logs.push(`[PDF] 第一层质量不佳 (score: ${textResult.quality.score}), 进入第二层`);

  // 第二层：布局解析
  logs.push('[PDF] 尝试第二层：布局解析 (pdfjs-dist)');
  const layoutResult = await parsePdfLayout(buffer);
  
  // 添加布局解析日志
  if (layoutResult.logs) {
    logs.push(...layoutResult.logs);
  }
  
  if (layoutResult.quality.passed) {
    logs.push('[PDF] 第二层解析成功');
    return {
      text: layoutResult.structuredText,
      pageCount: layoutResult.pageCount,
      strategy: 'layout',
      quality: layoutResult.quality,
      logs,
      ocrUnavailable: false,
    };
  }

  logs.push(`[PDF] 第二层质量不佳 (score: ${layoutResult.quality.score}), 进入第三层`);

  // 第三层：OCR 解析（仅在判断为扫描图片型 PDF 时）
  if (textResult.needsOcr) {
    logs.push('[PDF] 检测到扫描型 PDF，尝试第三层：OCR 解析');
    const ocrResult = await parsePdfOcr(buffer);
    
    if (ocrResult.success && ocrResult.quality.passed) {
      logs.push('[PDF] 第三层 OCR 解析成功');
      return {
        text: ocrResult.text,
        pageCount: ocrResult.pageCount,
        strategy: 'ocr',
        quality: ocrResult.quality,
        logs,
        ocrUnavailable: false,
      };
    }
    
    logs.push('[PDF] OCR 解析失败或不可用');
    
    // 如果 OCR 不可用，返回布局解析的结果（即使质量不佳）
    if (!ocrResult.success) {
      return {
        text: layoutResult.structuredText || textResult.text,
        pageCount: textResult.pageCount || layoutResult.pageCount,
        strategy: layoutResult.structuredText ? 'layout' : 'failed',
        quality: layoutResult.quality,
        logs,
        ocrUnavailable: true,
      };
    }
  }

  // 所有层都失败，返回最佳结果
  logs.push('[PDF] 所有解析策略均不理想，返回最佳结果');
  const bestText = layoutResult.structuredText || textResult.text;
  const bestQuality = layoutResult.quality.passed ? layoutResult.quality : 
                      textResult.quality.passed ? textResult.quality : 
                      layoutResult.quality;

  return {
    text: bestText,
    pageCount: textResult.pageCount || layoutResult.pageCount,
    strategy: bestText ? 'layout' : 'failed',
    quality: bestQuality,
    logs,
    ocrUnavailable: textResult.needsOcr,
  };
}

// 导出子模块
export { parsePdfText } from './pdfTextParser';
export { parsePdfLayout } from './pdfLayoutParser';
export { parsePdfOcr } from './pdfOcrParser';
export { checkPdfTextQuality, isLikelyScannedPdf } from './pdfQualityChecker';
