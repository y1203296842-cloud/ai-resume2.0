'use client';

import { useState, useCallback } from 'react';
import { FEEDBACK_CONFIG } from '@/config/content';
import { feedbackStore } from '@/lib/feedback/FeedbackService';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  /** 反馈来源页面路径，如 '/'、'/result' */
  page?: string;
  /** 功能入口标识，如 'landing'、'result' */
  featureId?: string;
}

export function FeedbackModal({ open, onClose, page, featureId }: FeedbackModalProps) {
  const [type, setType] = useState<string>(FEEDBACK_CONFIG.types[0].value);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await feedbackStore.save({ type, content: content.trim(), contact: contact.trim() || undefined, page, featureId, source: 'web' });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [type, content, contact]);

  const handleClose = useCallback(() => {
    setSubmitted(false);
    setContent('');
    setContact('');
    setType(FEEDBACK_CONFIG.types[0].value);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#34c759]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-base font-medium text-[#1d1d1f]">{FEEDBACK_CONFIG.successMessage}</p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 rounded-lg bg-[#0071e3] text-white text-sm font-medium hover:bg-[#0077ed] transition-colors"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1d1d1f] mb-4">{FEEDBACK_CONFIG.title}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">问题类型</label>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_CONFIG.types.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                          type === t.value
                            ? 'bg-[#0071e3] text-white'
                            : 'bg-[#f5f5f7] text-[#555] hover:bg-[#e5e5e7]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">反馈内容</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={FEEDBACK_CONFIG.contentPlaceholder}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-2">联系方式（选填）</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={FEEDBACK_CONFIG.contactPlaceholder}
                    maxLength={100}
                    className="w-full rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e5e5e7] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                  >
                    {submitting ? '提交中...' : FEEDBACK_CONFIG.submitButton}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
