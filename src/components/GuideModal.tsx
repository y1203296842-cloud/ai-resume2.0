'use client';

import { useState, useEffect, useCallback } from 'react';
import { GUIDE_MODAL_CONFIG, MODAL_MIN_DISPLAY_MS } from '@/config/content';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  skipMinDisplay?: boolean;
}

export function GuideModal({ open, onClose, skipMinDisplay }: GuideModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(MODAL_MIN_DISPLAY_MS / 1000));
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (skipMinDisplay) {
      setCanClose(true);
      setCountdown(0);
      return;
    }

    setCountdown(Math.ceil(MODAL_MIN_DISPLAY_MS / 1000));
    setCanClose(false);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MODAL_MIN_DISPLAY_MS - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      setCountdown(remainingSeconds);

      if (remaining <= 0) {
        setCanClose(true);
        clearInterval(timer);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [open, skipMinDisplay]);

  const handleClose = useCallback(() => {
    if (canClose) onClose();
  }, [canClose, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#1d1d1f] mb-1">{GUIDE_MODAL_CONFIG.title}</h2>
          {GUIDE_MODAL_CONFIG.intro && (
            <p className="text-sm text-[#86868b] mb-4">{GUIDE_MODAL_CONFIG.intro}</p>
          )}

          <div className="space-y-3 mb-6">
            {GUIDE_MODAL_CONFIG.sections.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">{section.heading}</h3>
                )}
                <p className="text-[13px] leading-relaxed text-[#555] whitespace-pre-line">{section.body}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
              canClose
                ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98]'
                : 'bg-[#e5e5e7] text-[#86868b] cursor-not-allowed'
            }`}
          >
            {canClose ? GUIDE_MODAL_CONFIG.button : GUIDE_MODAL_CONFIG.buttonCountdown(countdown)}
          </button>
        </div>
      </div>
    </div>
  );
}
