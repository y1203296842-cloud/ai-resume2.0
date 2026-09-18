/**
 * 文件处理模块 - 主入口
 * 统一文件验证、解析、清洗、缓存、简历检测
 * 迁移时可直接复用
 */

import { createHash } from 'crypto';
import { validateFile, type FileValidationResult } from './fileValidator';
import { parsePDF } from './pdfParser';
import { parseDOCX } from './docxParser';
import { extractAndStructure, smartCompress } from './textExtractor';
import { detectResume, type ResumeDetectionResult } from './resumeDetector';
import { getDefaultCache } from './fileCacheService';
import { parsePdf as parsePdfAdvanced } from './parsers/pdf';

// 解析超时时间（毫秒）
const PARSE_TIMEOUT_MS = 30000; // 30秒

/**
 * 带超时的 Promise 包装
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 计算文件哈希（用于缓存）
 */
function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

export interface ProcessFileOptions {
  /** 是否跳过缓存检查 */
  skipCache?: boolean;
  /** 是否跳过简历检测 */
  skipResumeDetection?: boolean;
  /** 最大内容长度 */
  maxLength?: number;
}

export interface ProcessFileResult {
  success: boolean;
  text?: string;
  error?: string;
  isResume?: boolean;
  detection?: ResumeDetectionResult;
  cached?: boolean;
  hash?: string;
}

/**
 * 处理上传的简历文件
 * 完整流程：验证 → 缓存检查 → 解析 → 清洗 → 结构化 → 简历检测 → 智能压缩 → 缓存
 */
export async function processResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  options: ProcessFileOptions = {}
): Promise<ProcessFileResult> {
  const { skipCache = false, skipResumeDetection = false, maxLength = 8000 } = options;

  // 1. 文件验证
  const validation = validateFile({ name: fileName, type: '', size: fileBuffer.length });
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. 计算哈希，检查缓存
  const hash = computeFileHash(fileBuffer);
  const cache = getDefaultCache();

  if (!skipCache) {
    const cached = await cache.get(hash);
    if (cached) {
      // 即使使用缓存，也需要做简历检测（缓存的是已处理的内容）
      const detection: ResumeDetectionResult = skipResumeDetection 
        ? { isResume: true, confidence: 'high' as const, score: 100, matchedKeywords: [], categoryScores: { contact: 0, education: 0, experience: 0, skills: 0, personal: 0 } }
        : detectResume(cached);
      
      return {
        success: true,
        text: cached,
        isResume: detection.isResume,
        detection,
        cached: true,
        hash,
      };
    }
  }

  // 3. 解析文件（带超时保护）
  let rawText = '';
  let parseLogs: string[] = [];
  try {
    if (validation.fileType === 'pdf') {
      // 使用多级 PDF 解析器
      const parsePromise = parsePdfAdvanced(fileBuffer);
      const result = await withTimeout(
        parsePromise,
        PARSE_TIMEOUT_MS,
        'PDF 解析超时，请尝试上传较小的文件或转换为 TXT 格式。'
      );
      rawText = result.text || '';
      parseLogs = result.logs || [];
      
      // 记录解析策略
      if (result.strategy !== 'text') {
        console.log(`[FileProcessor] PDF 使用 ${result.strategy} 策略解析`);
      }
      if (result.ocrUnavailable) {
        console.warn('[FileProcessor] PDF 可能需要 OCR，但 OCR 服务不可用');
      }
    } else if (validation.fileType === 'docx' || validation.fileType === 'doc') {
      const parsePromise = parseDOCX(fileBuffer);
      const result = await withTimeout(
        parsePromise,
        PARSE_TIMEOUT_MS,
        'DOCX 解析超时，请尝试上传较小的文件或转换为 TXT 格式。'
      );
      rawText = result.text || '';
    } else {
      // TXT / MD - 直接读取，限制大小
      const textContent = fileBuffer.toString('utf-8');
      rawText = textContent.slice(0, 100000); // 限制原始输入大小
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '文件解析失败';
    return { success: false, error: errorMessage };
  }

  if (!rawText.trim()) {
    return { success: false, error: '文件内容为空，请确认文件正确。' };
  }

  // 4. 清洗 + 结构化
  const structuredText = extractAndStructure(rawText);

  // 5. 简历检测（可选跳过）
  let detection: ResumeDetectionResult;
  if (!skipResumeDetection) {
    detection = detectResume(structuredText);
    if (!detection.isResume) {
      return {
        success: false,
        error: '这个文件可能不是个人简历，请上传你的求职简历，我才能帮你优化。',
        detection,
      };
    }
  } else {
    detection = { isResume: true, confidence: 'high', score: 100, matchedKeywords: [], categoryScores: {} };
  }

  // 6. 智能压缩（优先保留核心简历内容）
  const finalText = smartCompress(structuredText, maxLength);

  // 7. 存入缓存
  await cache.set(hash, finalText, { fileName, processedAt: Date.now() });

  return {
    success: true,
    text: finalText,
    isResume: true,
    detection,
    cached: false,
    hash,
  };
}

// 导出子模块
export { validateFile, validatePageCount } from './fileValidator';
export { parsePDF } from './pdfParser';
export { parseDOCX } from './docxParser';
export { extractAndStructure, cleanText, truncateText, smartCompress } from './textExtractor';
export { detectResume } from './resumeDetector';
export { FileCacheService, getDefaultCache, createCache, type ICacheService } from './fileCacheService';
