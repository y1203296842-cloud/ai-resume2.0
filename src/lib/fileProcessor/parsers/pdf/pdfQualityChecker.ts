/**
 * PDF 文本质量检查器
 * 检测解析结果是否为乱码/无效文本
 * 迁移时可替换检测算法，接口保持不变
 */

export interface QualityCheckResult {
  /** 是否通过质量检查 */
  passed: boolean;
  /** 质量评分 0-100 */
  score: number;
  /** 检测到的问题 */
  issues: string[];
  /** 详细指标 */
  metrics: {
    /** 总字符数 */
    totalChars: number;
    /** 中文字符数 */
    chineseChars: number;
    /** 中文字符比例 */
    chineseRatio: number;
    /** 可读字符比例（中文+英文+数字+常见标点） */
    readableRatio: number;
    /** 空白字符比例 */
    whitespaceRatio: number;
    /** 特殊/乱码字符比例 */
    garbageRatio: number;
    /** 有效行数 */
    validLines: number;
    /** 平均行长度 */
    avgLineLength: number;
  };
}

/**
 * 检查 PDF 解析文本的质量
 * 用于判断是否需要切换到下一级解析策略
 */
export function checkPdfTextQuality(text: string): QualityCheckResult {
  const issues: string[] = [];
  
  if (!text || text.trim().length === 0) {
    return {
      passed: false,
      score: 0,
      issues: ['文本为空'],
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
    };
  }

  const totalChars = text.length;
  
  // 统计中文字符 (CJK Unified Ideographs)
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const chineseRatio = chineseChars / totalChars;
  
  // 统计可读字符（中文 + 英文 + 数字 + 常见中英文标点）
  const readablePattern = /[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9\s.,;:!?，。；：！？、（）()【】\[\]{}""''""—\-·/@#$%&*+=<>《》\n\r\t]/g;
  const readableChars = (text.match(readablePattern) || []).length;
  const readableRatio = readableChars / totalChars;
  
  // 统计空白字符
  const whitespaceChars = (text.match(/\s/g) || []).length;
  const whitespaceRatio = whitespaceChars / totalChars;
  
  // 乱码字符 = 总字符 - 可读字符
  const garbageChars = totalChars - readableChars;
  const garbageRatio = garbageChars / totalChars;
  
  // 统计有效行（长度 > 2 的行）
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  const validLines = lines.length;
  const avgLineLength = validLines > 0 
    ? lines.reduce((sum, line) => sum + line.length, 0) / validLines 
    : 0;

  // 计算质量评分
  let score = 100;
  
  // 乱码比例过高扣分
  if (garbageRatio > 0.3) {
    score -= 40;
    issues.push(`乱码字符比例过高: ${(garbageRatio * 100).toFixed(1)}%`);
  } else if (garbageRatio > 0.15) {
    score -= 20;
    issues.push(`存在较多乱码字符: ${(garbageRatio * 100).toFixed(1)}%`);
  }
  
  // 空白比例过高扣分
  if (whitespaceRatio > 0.6) {
    score -= 30;
    issues.push(`空白内容过多: ${(whitespaceRatio * 100).toFixed(1)}%`);
  }
  
  // 文本长度过短扣分
  if (totalChars < 50) {
    score -= 30;
    issues.push(`文本长度过短: ${totalChars} 字符`);
  } else if (totalChars < 200) {
    score -= 15;
    issues.push(`文本长度偏短: ${totalChars} 字符`);
  }
  
  // 有效行数过少扣分
  if (validLines < 3) {
    score -= 20;
    issues.push(`有效行数过少: ${validLines} 行`);
  }
  
  // 平均行长度异常扣分
  if (avgLineLength < 3 && validLines > 0) {
    score -= 15;
    issues.push(`行内容过短，可能是碎片化文本`);
  }

  const passed = score >= 50 && garbageRatio < 0.3 && totalChars >= 50;

  return {
    passed,
    score: Math.max(0, score),
    issues,
    metrics: {
      totalChars,
      chineseChars,
      chineseRatio,
      readableRatio,
      whitespaceRatio,
      garbageRatio,
      validLines,
      avgLineLength,
    },
  };
}

/**
 * 判断文本是否可能是扫描图片型 PDF（需要 OCR）
 */
export function isLikelyScannedPdf(qualityResult: QualityCheckResult): boolean {
  const { metrics } = qualityResult;
  
  // 文本为空或极短，很可能是扫描图片
  if (metrics.totalChars < 30) return true;
  
  // 乱码比例极高，可能是图片型 PDF 被错误解析
  if (metrics.garbageRatio > 0.5) return true;
  
  // 可读字符极少
  if (metrics.readableRatio < 0.2 && metrics.totalChars > 100) return true;
  
  return false;
}
