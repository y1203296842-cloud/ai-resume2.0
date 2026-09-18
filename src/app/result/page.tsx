'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ResumeData } from '@/lib/types';
import { getResumeTemplate } from '@/templates';
import { normalizeForRendering } from '@/lib/normalizeForRendering';
import type { TemplateId } from '@/config/templates';
import { getAllTemplateMetas } from '@/templates/registry';
import { exportPdf, exportDocx } from '@/lib/exportUtils';
import { FeedbackModal } from '@/components/FeedbackModal';
import { LEGAL_DOCUMENT_LIST } from '@/features/legal';
import { RESULT_PAGE_CONFIG, MAX_RESUME_REVISIONS } from '@/config/content';
import { BRAND_NAME } from '@/config/system';
import { hasApiKey } from '@/lib/apiKeyStore';

export default function ResultPage() {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [exporting, setExporting] = useState<string | null>(null);
  const [scale, setScale] = useState(0.65);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const [targetPosition, setTargetPosition] = useState<string | undefined>(undefined);
  const [hasKey, setHasKey] = useState(false);
  const [keyChecked, setKeyChecked] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 检查 API Key
    setHasKey(hasApiKey());
    setKeyChecked(true);

    const savedData = sessionStorage.getItem('resumeData');
    const savedSuggestion = sessionStorage.getItem('resumeSuggestion');
    if (savedData) {
      try {
        setResumeData(JSON.parse(savedData));
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
    if (savedSuggestion) setSuggestion(savedSuggestion);

    const savedPosition = sessionStorage.getItem('resumeTargetPosition');
    if (savedPosition) setTargetPosition(savedPosition);

    const revCount = parseInt(sessionStorage.getItem('resumeRevisionCount') || '0', 10);
    setRevisionCount(revCount);
  }, [router]);

  const handleReturnOptimize = () => {
    const mode = sessionStorage.getItem('resumeMode') || 'explore';
    const nextCount = revisionCount + 1;
    sessionStorage.setItem('resumeRevisionCount', String(nextCount));
    router.push(`/interview?mode=${mode}`);
  };

  const canReturnOptimize = MAX_RESUME_REVISIONS === Infinity || (MAX_RESUME_REVISIONS > 0 && revisionCount < MAX_RESUME_REVISIONS);

  // Auto-fit scale
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 48;
    const pageWidth = 210 * 3.78; // 210mm in px at 96dpi
    const newScale = Math.min(containerWidth / pageWidth, 0.85);
    setScale(Math.max(0.35, Math.min(newScale, 0.85)));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!resumeData) return;
    setExporting(format);
    try {
      const filename = `简历_${resumeData.personalInfo.name || '我的简历'}`;
      
      if (format === 'pdf') {
        // 捕获已渲染的 DOM 元素生成 PDF（与 Preview 完全一致）
        const resumeEl = document.querySelector('[data-resume-document]') as HTMLElement;
        if (!resumeEl) {
          alert('简历内容未找到，无法导出 PDF');
          return;
        }
        await exportPdf(resumeEl, filename);
      } else {
        // 使用客户端 DOCX 导出（数据经过统一规范化，与 Preview 一致）
        const normalizedData = normalizeForRendering(resumeData, targetPosition);
        const blob = await exportDocx(normalizedData, selectedTemplate, filename);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  // 未检查完 Key 时显示加载状态
  if (!keyChecked) {
    return (
      <div className="min-h-dvh-screen bg-white flex items-center justify-center">
        <div className="text-[#86868b] text-[15px]">加载中...</div>
      </div>
    );
  }

  // 没有 API Key 时显示提示
  if (!hasKey) {
    return (
      <div className="min-h-dvh-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#1d1d1f] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-[22px] font-[300] text-[#1d1d1f] tracking-tight mb-2">
            需要 API Key
          </h1>
          <p className="text-[14px] text-[#86868b] leading-relaxed mb-6">
            请先在首页输入你的 API Key
            <br />
            <span className="text-[13px]">Key 仅保存在你的浏览器中，不会上传服务器</span>
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-[15px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            前往首页输入 Key
            <svg className="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (!resumeData) return null;

  return (
    <div className="min-h-dvh-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e7] sticky top-0 z-10 pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors">
            {BRAND_NAME}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-lg hover:bg-[#f5f5f7] transition-colors disabled:opacity-50 touch-target"
            >
              {exporting === 'pdf' ? '导出中...' : '导出 PDF'}
            </button>
            {/* Word 导出暂时隐藏，后端代码保留，完善后恢复 */}
            {/* <button
              onClick={() => handleExport('docx')}
              disabled={!!exporting}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-50 touch-target"
            >
              {exporting === 'docx' ? '导出中...' : '导出 Word'}
            </button> */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left: Template selector + Suggestion */}
        <aside className="w-full lg:w-56 flex-shrink-0 space-y-4">
          {/* Template Selector */}
          <div className="bg-white rounded-xl border border-[#e5e5e7] p-4">
            <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-3">选择模板</h3>
            <div className="space-y-2">
              {getAllTemplateMetas().map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    selectedTemplate === t.id
                      ? 'border-[#0071e3] bg-[#0071e3]/5'
                      : 'border-[#e5e5e7] hover:border-[#c7c7cc] hover:bg-[#fafafa]'
                  }`}
                >
                  <div className={`text-sm font-medium ${selectedTemplate === t.id ? 'text-[#0071e3]' : 'text-[#1d1d1f]'}`}>
                    {t.name}
                  </div>
                  <div className="text-xs text-[#86868b] mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div className="bg-white rounded-xl border border-[#e5e5e7] p-4">
              <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-2">AI 建议</h3>
              <div className="text-sm text-[#3a3a3c] whitespace-pre-wrap leading-relaxed">
                {suggestion}
              </div>
            </div>
          )}
        </aside>

        {/* Center: A4 Preview */}
        <main className="flex-1 flex justify-center" ref={containerRef}>
          <div
            ref={previewRef}
            className="bg-white shadow-sm border border-[#e5e5e7] overflow-hidden"
            style={{
              width: `${210 * 3.78 * scale}px`,
              minHeight: `${297 * 3.78 * scale}px`,
              transformOrigin: 'top center',
            }}
          >
            <div data-resume-document style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${210 * 3.78}px`, minHeight: `${297 * 3.78}px` }}>
              {getResumeTemplate(selectedTemplate, resumeData, targetPosition)}
            </div>
          </div>
        </main>

        {/* Right: Action buttons */}
        <aside className="w-full lg:w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[#e5e5e7] p-4 space-y-2 lg:sticky lg:top-20">
            {canReturnOptimize && (
              <button
                onClick={handleReturnOptimize}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-lg hover:bg-[#0077ED] transition-colors"
              >
                {RESULT_PAGE_CONFIG.returnOptimize}
              </button>
            )}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full px-3 py-2 text-sm font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-lg hover:bg-[#f5f5f7] transition-colors"
            >
              {RESULT_PAGE_CONFIG.feedback}
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('resumeData');
                sessionStorage.removeItem('resumeSuggestion');
                sessionStorage.removeItem('resumeRevisionCount');
                sessionStorage.removeItem('resumeMode');
                sessionStorage.removeItem('resumeTargetPosition');
                router.push('/');
              }}
              className="w-full px-3 py-2 text-sm font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-lg hover:bg-[#f5f5f7] transition-colors"
            >
              {RESULT_PAGE_CONFIG.remake}
            </button>
          </div>
        </aside>
        </div>
      </div>

      {/* Legal Links */}
      <footer className="w-full px-4 py-4 border-t border-[#e5e5e7]">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {LEGAL_DOCUMENT_LIST.map((doc) => (
            <Link
              key={doc.id}
              href={`/legal/${doc.slug}`}
              className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
            >
              {doc.shortTitle}
            </Link>
          ))}
        </div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} page="/result" featureId="result" />
    </div>
  );
}
