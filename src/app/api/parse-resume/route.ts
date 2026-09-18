import { NextRequest, NextResponse } from 'next/server';
import { processResumeFile } from '@/lib/fileProcessor';

// 解析超时时间（毫秒）
const PARSE_TIMEOUT_MS = 30000; // 30秒

/**
 * 带超时的 Promise 包装器
 * 防止异常文件导致解析无限阻塞
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 简历文件解析 API
 * 使用模块化文件处理器：验证 → 解析 → 清洗 → 结构化 → 检测 → 缓存
 * 包含超时保护，防止异常文件消耗资源
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '未找到文件' }, { status: 400 });
    }

    // 转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 使用文件处理器，带超时保护
    const result = await withTimeout(
      processResumeFile(buffer, file.name),
      PARSE_TIMEOUT_MS,
      '文件解析超时，请尝试上传较小的文件或转换为PDF格式'
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        detection: result.detection,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      cached: result.cached,
      hash: result.hash,
      detection: result.detection,
    });
  } catch (error) {
    console.error('[Parse Resume API] 错误:', error);
    const errorMessage = error instanceof Error ? error.message : '文件解析失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: errorMessage.includes('超时') ? 408 : 500 }
    );
  }
}
