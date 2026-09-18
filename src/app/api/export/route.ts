import { NextRequest } from 'next/server';
import type { ResumeData } from '@/lib/types';
import type { TemplateId } from '@/config/templates';
import { getDefaultTemplateId } from '@/templates/registry';
import { exportDocx } from '@/lib/exportUtils';

export async function POST(request: NextRequest) {
  const { resumeData, format, templateId } = (await request.json()) as {
    resumeData: ResumeData;
    format: 'pdf' | 'docx';
    templateId?: string;
  };

  const effectiveTemplateId: TemplateId = (templateId as TemplateId) || getDefaultTemplateId();

  if (format === 'docx') {
    const blob = await exportDocx(resumeData, effectiveTemplateId);
    const arrayBuffer = await blob.arrayBuffer();
    return new Response(new Uint8Array(arrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="resume.docx"`,
      },
    });
  }

  return new Response(
    JSON.stringify({ error: 'PDF export is client-side only. Use the browser print engine.' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
