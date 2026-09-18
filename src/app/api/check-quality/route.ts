import { NextResponse } from 'next/server';
import { checkResumeQuality, type QualityCheckOptions } from '@/lib/resumeQuality';
import type { ResumeData } from '@/lib/types';

/**
 * 简历质量检测 API
 * 
 * POST /api/check-quality
 * 
 * 请求体：
 * {
 *   resumeData: ResumeData,
 *   targetPosition?: string,
 *   userProfile?: { type, major, yearsOfExperience }
 * }
 * 
 * 响应：
 * {
 *   score: number,
 *   pass: boolean,
 *   dimensions: [...],
 *   problems: [...],
 *   suggestions: [...]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeData, targetPosition, userProfile } = body as {
      resumeData: ResumeData;
      targetPosition?: string;
      userProfile?: QualityCheckOptions['userProfile'];
    };

    if (!resumeData) {
      return NextResponse.json(
        { error: '缺少简历数据' },
        { status: 400 }
      );
    }

    const result = checkResumeQuality(resumeData, {
      targetPosition,
      userProfile,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Check Quality API] Error:', error);
    return NextResponse.json(
      { error: '质量检测失败' },
      { status: 500 }
    );
  }
}
