/**
 * PDF 布局解析器 - 第二层
 * 当第一层文本解析质量不佳时，使用 pdfjs-dist 进行更深入的解析
 * 迁移时可替换为其他 PDF 解析库
 */

import { checkPdfTextQuality, type QualityCheckResult } from './pdfQualityChecker';

export interface PdfLayoutParseResult {
  /** 结构化文本（保留布局信息） */
  structuredText: string;
  /** 页数 */
  pageCount: number;
  /** 质量检查结果 */
  quality: QualityCheckResult;
  /** 解析策略 */
  strategy: 'layout-aware' | 'fallback-text';
  /** 解析日志 */
  logs: string[];
}

/**
 * 第二层：PDF 布局解析
 * 使用 pdfjs-dist 进行更深入的文本提取
 */
export async function parsePdfLayout(buffer: Buffer): Promise<PdfLayoutParseResult> {
  const logs: string[] = [];
  
  try {
    logs.push('[LayoutParser] 使用 pdfjs-dist 解析');
    
    // 动态导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // 设置 worker（使用内联 worker 避免路径问题）
    if (typeof window === 'undefined') {
      // Node.js 环境
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    
    // 将 Buffer 转换为 Uint8Array
    const uint8Array = new Uint8Array(buffer);
    
    // 加载 PDF
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      stopAtErrors: false,
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    logs.push(`[LayoutParser] PDF 页数: ${pageCount}`);
    
    // 提取所有页面的文本
    const pageTexts: string[] = [];
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // 按 Y 坐标排序，保留布局信息
      const items = textContent.items
        .filter((item): item is { str: string; transform: number[]; dir: string; width: number; height: number; fontName: string; hasEOL: boolean } => 
          'str' in item && 'transform' in item
        )
        .sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
          return a.transform[4] - b.transform[4];
        });
      
      // 构建页面文本
      let pageText = '';
      let lastY = -1;
      
      for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== -1 && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && pageText[pageText.length - 1] !== '\n') {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = y;
      }
      
      pageTexts.push(pageText.trim());
    }
    
    const structuredText = pageTexts.join('\n\n');
    logs.push(`[LayoutParser] 提取文本长度: ${structuredText.length}`);
    
    // 检查恢复后的质量
    const quality = checkPdfTextQuality(structuredText);
    
    return {
      structuredText,
      pageCount,
      quality,
      strategy: 'layout-aware',
      logs,
    };
  } catch (error) {
    console.error('[PdfLayoutParser] 解析失败:', error);
    logs.push(`[LayoutParser] 解析失败: ${error}`);
    
    return {
      structuredText: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['布局解析失败'],
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
      strategy: 'fallback-text',
      logs,
    };
  }
}
