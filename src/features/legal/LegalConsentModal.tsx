'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LEGAL_DOCUMENT_LIST } from './legalDocuments';
import { recordConsent } from './LegalConsentStore';
import { getOutdatedDocuments } from './LegalConsentStore';
import type { LegalDocumentId } from './types';

interface LegalConsentModalProps {
  open: boolean;
  onConsented: () => void;
  onCancel: () => void;
}

export function LegalConsentModal({ open, onConsented, onCancel }: LegalConsentModalProps) {
  const [checked, setChecked] = useState(false);
  const [outdatedIds, setOutdatedIds] = useState<LegalDocumentId[]>([]);

  useEffect(() => {
    if (open) {
      setChecked(false);
      setOutdatedIds(getOutdatedDocuments());
    }
  }, [open]);

  if (!open) return null;

  const isUpdate = outdatedIds.length > 0 && outdatedIds.length < LEGAL_DOCUMENT_LIST.length;
  const outdatedDocs = outdatedIds
    .map((id) => LEGAL_DOCUMENT_LIST.find((d) => d.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#1d1d1f] mb-4">
            {isUpdate ? '我们更新了服务条款，请重新确认' : '开始使用前，请确认以下内容'}
          </h2>

          <p className="text-[14px] text-[#86868b] leading-relaxed mb-5">
            欢迎使用果核AI。在继续使用前，请确认您已经阅读并理解以下文件：
          </p>

          <div className="space-y-2.5 mb-5">
            {LEGAL_DOCUMENT_LIST.map((doc) => {
              const isOutdated = outdatedIds.includes(doc.id);
              return (
                <div key={doc.id} className="flex items-start gap-2">
                  {isOutdated && <span className="text-[#ff9500] text-[14px] mt-0.5">●</span>}
                  {!isOutdated && <span className="text-[#34c759] text-[14px] mt-0.5">●</span>}
                  <div className="flex-1">
                    <Link
                      href={`/legal/${doc.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-[#0071e3] hover:underline"
                    >
                      《{doc.title}》
                    </Link>
                    <p className="text-[12px] text-[#86868b] mt-0.5">
                      {doc.id === 'user-service' && '说明平台服务规则与双方权利义务'}
                      {doc.id === 'privacy-policy' && '说明我们如何处理和保护您的个人信息'}
                      {doc.id === 'disclaimer' && '说明AI服务的使用边界与用户注意事项'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {isUpdate && outdatedDocs.length > 0 && (
            <div className="bg-[#fff8e1] border border-[#ffe082] rounded-lg p-3 mb-5">
              <p className="text-[13px] text-[#86868b]">
                {outdatedDocs.map((d) => `《${d!.title}》`).join('、')}已更新，请重新阅读并确认。
              </p>
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0071e3] cursor-pointer flex-shrink-0"
            />
            <span className="text-[14px] text-[#1d1d1f] leading-relaxed">
              我已阅读并同意
              {LEGAL_DOCUMENT_LIST.map((d, i) => (
                <span key={d.id}>
                  <Link
                    href={`/legal/${d.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0071e3] hover:underline"
                  >
                    《{d.title}》
                  </Link>
                  {i < LEGAL_DOCUMENT_LIST.length - 1 && ''}
                </span>
              ))}
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-[15px] font-medium text-[#86868b] bg-[#f5f5f7] hover:bg-[#e5e5e7] transition-colors"
            >
              暂不使用
            </button>
            <button
              onClick={() => {
                if (checked) {
                  recordConsent();
                  onConsented();
                }
              }}
              disabled={!checked}
              className={`flex-1 py-3 rounded-xl text-[15px] font-medium transition-all ${
                checked
                  ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] cursor-pointer'
                  : 'bg-[#e5e5e7] text-[#86868b] cursor-not-allowed'
              }`}
            >
              同意并继续使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
