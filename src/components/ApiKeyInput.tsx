'use client';

import { useState, useEffect } from 'react';
import {
  getApiKey, setApiKey,
  getBaseUrl, setBaseUrl,
  getModel, setModel,
  validateApiKey,
  DEFAULT_BASE_URL, DEFAULT_MODEL,
} from '@/lib/apiKeyStore';
import { BRAND_NAME } from '@/config/system';
import { GuideModal } from '@/components/GuideModal';

interface ApiKeyInputProps {
  onEnter?: () => void;
}

export function ApiKeyInput({ onEnter }: ApiKeyInputProps) {
  const [key, setKey] = useState('');
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 加载已保存的值
  useEffect(() => {
    setMounted(true);
    const savedKey = getApiKey();
    if (savedKey) {
      setKey(savedKey);
    }
    setBaseUrlState(getBaseUrl());
    setModelState(getModel());
    // 如果用户之前填过 Key，默认展开高级设置，方便查看/修改
    if (savedKey && (getBaseUrl() !== DEFAULT_BASE_URL || getModel() !== DEFAULT_MODEL)) {
      setShowAdvanced(true);
    }
  }, []);

  // 每次进入 API 设置页都弹出必读提示
  useEffect(() => {
    if (!mounted) return;
    setGuideOpen(true);
  }, [mounted]);

  const handleGuideClose = () => {
    setGuideOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedKey = key.trim();

    if (!trimmedKey) {
      setError('请输入 API Key');
      return;
    }

    if (!validateApiKey(trimmedKey)) {
      setError('API Key 不能为空');
      return;
    }

    setIsSubmitting(true);
    setApiKey(trimmedKey);
    setBaseUrl(baseUrl.trim() || DEFAULT_BASE_URL);
    setModel(model.trim() || DEFAULT_MODEL);

    setTimeout(() => {
      if (onEnter) {
        onEnter();
      } else {
        window.location.reload();
      }
    }, 300);
  };

  return (
    <div className="min-h-dvh-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#1d1d1f] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 className="text-[28px] font-[300] text-[#1d1d1f] tracking-tight mb-2">
            {BRAND_NAME}
          </h1>
          <p className="text-[15px] text-[#86868b] leading-relaxed">
            API 设置
            <br />
            <span className="text-[13px]">Key 仅保存在你的浏览器中，不会上传到任何服务器</span>
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (error) setError('');
              }}
              placeholder="请输入你的 API Key"
              autoFocus={!key}
              className={`w-full px-4 py-3.5 rounded-xl border text-[15px] text-[#1d1d1f] placeholder:text-[#c7c7cc] focus:outline-none transition-all ${
                error
                  ? 'border-[#ff3b30] bg-[#fff] focus:border-[#ff3b30]'
                  : 'border-[#e5e5e7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
              }`}
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer p-1"
              aria-label={showKey ? '隐藏 Key' : '显示 Key'}
            >
              {showKey ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-[#ff3b30]">{error}</p>
          )}

          {/* Advanced settings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[13px] text-[#0071e3] hover:underline cursor-pointer"
          >
            {showAdvanced ? '收起高级设置' : '高级设置（Base URL / 模型）'}
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 rounded-xl bg-[#f5f5f7]">
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrlState(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#e5e5e7] bg-white text-[13px] text-[#1d1d1f] placeholder:text-[#c7c7cc] focus:outline-none focus:border-[#0071e3] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                  模型名称
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModelState(e.target.value)}
                  placeholder={DEFAULT_MODEL}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#e5e5e7] bg-white text-[13px] text-[#1d1d1f] placeholder:text-[#c7c7cc] focus:outline-none focus:border-[#0071e3] transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#aeaeb2] leading-relaxed">
                默认使用 DeepSeek。如需使用其他 OpenAI 兼容 API，请修改以上配置。
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !key.trim()}
            className={`w-full py-3.5 rounded-xl text-[15px] font-medium transition-all duration-200 ${
              key.trim() && !isSubmitting
                ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] cursor-pointer'
                : 'bg-[#e5e5e7] text-[#86868b] cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '保存中...' : '进入'}
          </button>
        </form>

        {/* Help link */}
        <div className="mt-6 text-center">
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#0071e3] hover:underline"
          >
            获取 API Key / 前往 DeepSeek →
          </a>
        </div>

        {/* Recommendation note */}
        <div className="mt-4 p-3 rounded-xl bg-[#f5f5f7]">
          <p className="text-[12px] text-[#86868b] leading-relaxed text-center">
            推荐使用 DeepSeek，价格较低，适合个人使用。
            <br />
            本工具支持任何兼容 OpenAI API 格式的模型服务。
          </p>
        </div>

        {/* Privacy note */}
        <div className="mt-4 p-4 rounded-xl bg-[#f5f5f7]">
          <div className="flex items-start gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-[12px] text-[#86868b] leading-relaxed">
              你的 API Key 及配置仅保存在本地浏览器中，不会上传到任何服务器。
              <br />
              清除浏览器数据或更换设备后需要重新输入。
            </p>
          </div>
        </div>
      </div>

      {/* 必读提示弹窗（每次显示，无强制等待） */}
      <GuideModal open={guideOpen} onClose={handleGuideClose} skipMinDisplay />
    </div>
  );
}
