/**
 * PDF OCR 解析器 - 第三层
 * 当 PDF 是扫描图片时使用 OCR 提取文本
 * 迁移时接入真实 OCR 服务（如 Tesseract.js / 百度OCR / 腾讯OCR）
 */

import { checkPdfTextQuality, type QualityCheckResult } from './pdfQualityChecker';

export interface PdfOcrParseResult {
  /** OCR 提取的文本 */
  text: string;
  /** 页数 */
  pageCount: number;
  /** 质量检查结果 */
  quality: QualityCheckResult;
  /** OCR 引擎 */
  engine: string;
  /** 是否成功 */
  success: boolean;
}

/**
 * 第三层：PDF OCR 解析
 * 用于处理扫描图片型 PDF
 * 
 * 迁移说明：
 * 当前实现为降级处理（返回空结果+提示）
 * 生产环境应接入真实 OCR 服务：
 * - Tesseract.js (本地)
 * - 百度 OCR API
 * - 腾讯 OCR API
 * - Google Cloud Vision
 */
export async function parsePdfOcr(buffer: Buffer): Promise<PdfOcrParseResult> {
  // 检查是否有可用的 OCR 服务
  const ocrEngine = process.env.OCR_ENGINE || 'none';
  
  if (ocrEngine === 'none') {
    // 没有配置 OCR 服务，返回降级结果
    console.warn('[PdfOcrParser] 未配置 OCR 服务，跳过 OCR 解析');
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['未配置 OCR 服务，无法解析扫描型 PDF'],
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
      engine: 'none',
      success: false,
    };
  }

  // 根据配置的 OCR 引擎调用对应服务
  switch (ocrEngine) {
    case 'tesseract':
      return await parseWithTesseract(buffer);
    case 'baidu':
      return await parseWithBaiduOcr(buffer);
    default:
      return {
        text: '',
        pageCount: 0,
        quality: {
          passed: false,
          score: 0,
          issues: [`不支持的 OCR 引擎: ${ocrEngine}`],
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
        engine: ocrEngine,
        success: false,
      };
  }
}

/**
 * 使用 Tesseract.js 进行 OCR
 * 迁移时需要: pnpm add tesseract.js
 */
async function parseWithTesseract(buffer: Buffer): Promise<PdfOcrParseResult> {
  try {
    // Tesseract.js 需要图片输入，这里需要先将 PDF 转为图片
    // 迁移时实现 PDF 转图片逻辑
    console.warn('[PdfOcrParser] Tesseract OCR 尚未集成 PDF 转图片步骤');
    
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['Tesseract OCR 集成待完成'],
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
      engine: 'tesseract',
      success: false,
    };
  } catch (error) {
    console.error('[PdfOcrParser] Tesseract 解析失败:', error);
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['Tesseract OCR 解析异常'],
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
      engine: 'tesseract',
      success: false,
    };
  }
}

/**
 * 使用百度 OCR API
 * 迁移时需要配置环境变量: BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY
 */
async function parseWithBaiduOcr(buffer: Buffer): Promise<PdfOcrParseResult> {
  const apiKey = process.env.BAIDU_OCR_API_KEY;
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['百度 OCR API Key 未配置'],
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
      engine: 'baidu',
      success: false,
    };
  }

  try {
    // 迁移时实现百度 OCR API 调用
    // 1. 获取 access_token
    // 2. 将 PDF buffer 转为 base64
    // 3. 调用百度 OCR API
    // 4. 解析返回结果
    console.warn('[PdfOcrParser] 百度 OCR 集成待实现');
    
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['百度 OCR 集成待实现'],
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
      engine: 'baidu',
      success: false,
    };
  } catch (error) {
    console.error('[PdfOcrParser] 百度 OCR 解析失败:', error);
    return {
      text: '',
      pageCount: 0,
      quality: {
        passed: false,
        score: 0,
        issues: ['百度 OCR 解析异常'],
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
      engine: 'baidu',
      success: false,
    };
  }
}
