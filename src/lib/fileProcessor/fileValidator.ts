/**
 * 文件验证器 - 检查文件类型、大小、页数等
 * 迁移时只需修改此文件中的限制配置
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileType?: 'pdf' | 'docx' | 'doc' | 'txt' | 'md';
  fileSize?: number;
}

// 文件限制配置（迁移时可直接修改）
export const FILE_LIMITS = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxPages: 10,
  allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'text/markdown'] as string[],
  allowedExtensions: ['.pdf', '.docx', '.doc', '.txt', '.md'] as string[],
} as const;

// 危险文件类型（明确禁止）
export const BLOCKED_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'video/',
  'audio/',
  'image/',
] as const;

/**
 * 验证上传文件
 */
export function validateFile(file: { name: string; type: string; size: number }): FileValidationResult {
  const { name, type, size } = file;
  const extension = '.' + name.split('.').pop()?.toLowerCase();

  // 检查文件大小
  if (size > FILE_LIMITS.maxSizeBytes) {
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${Math.round(FILE_LIMITS.maxSizeBytes / 1024 / 1024)}MB），请上传简历文件或压缩后重新上传。`,
    };
  }

  // 检查是否为空文件
  if (size === 0) {
    return {
      valid: false,
      error: '文件为空，请选择有效的简历文件。',
    };
  }

  // 检查危险文件类型
  for (const blocked of BLOCKED_TYPES) {
    if (type.startsWith(blocked)) {
      return {
        valid: false,
        error: '不支持的文件类型，请上传 PDF 或 Word 格式的简历文件。',
      };
    }
  }

  // 检查文件扩展名
  if (!FILE_LIMITS.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件格式（${extension}），仅支持 PDF、DOCX、DOC、TXT 文件。`,
    };
  }

  // 确定文件类型
  let fileType: FileValidationResult['fileType'];
  if (extension === '.pdf') fileType = 'pdf';
  else if (extension === '.docx') fileType = 'docx';
  else if (extension === '.doc') fileType = 'doc';
  else if (extension === '.txt') fileType = 'txt';
  else if (extension === '.md') fileType = 'md';

  return {
    valid: true,
    fileType,
    fileSize: size,
  };
}

/**
 * 验证文件页数（PDF）
 */
export function validatePageCount(pageCount: number): { valid: boolean; error?: string } {
  if (pageCount > FILE_LIMITS.maxPages) {
    return {
      valid: false,
      error: `当前文件页数较多（${pageCount}页），请确认上传的是简历文件。`,
    };
  }
  return { valid: true };
}
