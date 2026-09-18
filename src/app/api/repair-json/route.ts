import { NextRequest, NextResponse } from 'next/server';
import { processResumeJsonSync } from '@/lib/aiOutputGateway';

/**
 * JSON修复API
 * 当前端JSON解析失败时，调用此接口尝试修复
 * 使用AI Output Gateway统一处理
 * 
 * 迁移说明：
 * 此接口独立于LLM provider，可直接迁移
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawJson } = body;

    if (!rawJson || typeof rawJson !== 'string') {
      return NextResponse.json(
        { success: false, error: '缺少rawJson参数' },
        { status: 400 }
      );
    }

    // 使用AI Output Gateway处理
    const result = processResumeJsonSync(rawJson);

    if (result.success && result.resumeData) {
      return NextResponse.json({
        success: true,
        data: result.resumeData,
        repaired: result.wasRepaired,
        fixesApplied: result.fixesApplied,
        truncated: result.wasTruncated,
      });
    }

    // 修复失败
    console.error('[repair-json] 修复失败:', result.error);
    return NextResponse.json({
      success: false,
      error: result.error,
      repaired: false,
    });
  } catch (error) {
    console.error('[repair-json] 服务器错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
