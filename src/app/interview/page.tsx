'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { ChatMessage, ResumeMode } from '@/lib/types';
import { processResumeJsonSync } from '@/lib/aiOutputGateway';
import { useSession } from '@/features/session';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { GuideModal } from '@/components/GuideModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { BRAND_NAME } from '@/config/system';
import { MAX_CONVERSATION_ROUNDS } from '@/config/content';
import { isConsentValid, LegalConsentModal } from '@/features/legal';
import { getApiKey, hasApiKey, getBaseUrl, getModel } from '@/lib/apiKeyStore';

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'explore') as ResumeMode;

  const [hasKey, setHasKey] = useState(false);
  const [keyChecked, setKeyChecked] = useState(false);

  // 检查本地是否已保存 API Key
  useEffect(() => {
    setHasKey(hasApiKey());
    setKeyChecked(true);
  }, []);

  const {
    sessionId,
    messages,
    setMessages,
    resumeText,
    setResumeText,
    restored,
    createNewSession,
    initStatus,
    setInitStatus,
  } = useSession(mode);
  const networkStatus = useNetworkStatus();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [guideManualOpen, setGuideManualOpen] = useState(false);
  const [legalConsentNeeded, setLegalConsentNeeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  // Legal consent gate — checked on mount, does not interfere with session hooks
  useEffect(() => {
    if (!isConsentValid()) {
      setLegalConsentNeeded(true);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize conversation — globally idempotent across remounts, refreshes, and StrictMode
  //
  // Persistent gate: initStatus === 'success' (persisted in SessionData via localStorage)
  //   — survives page refresh, remount, StrictMode, network recovery
  //   — only reset to 'idle' by createNewSession() (user clicks "新建")
  //
  // Local lock: initRef.current (prevents concurrent triggers within same mount)
  //
  // Deps: [restored, sessionId, mode]
  //   — sessionId changes on createNewSession and on restore, triggering re-init when appropriate
  //   — initStatus and messages are intentionally NOT in deps to avoid re-triggering
  //     when we set them during the init flow
  useEffect(() => {
    if (!restored) return;
    if (initStatus === 'success') return;
    if (messages.length > 0) return;
    if (initRef.current) return;
    initRef.current = true;
    setInitStatus('loading');

    const abortController = new AbortController();

    const initChat = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-deepseek-api-key': getApiKey(),
            'x-api-base-url': getBaseUrl(),
            'x-api-model': getModel(),
          },
          body: JSON.stringify({
            mode,
            messages: [],
            action: 'init',
          }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error('Failed to initialize');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullText += parsed.content;
                }
              } catch {
                // skip
              }
            }
          }
        }

        setMessages([{ role: 'assistant', content: fullText }]);
        setInitStatus('success');
      } catch (err) {
        if (abortController.signal.aborted) return;
        setMessages([
          {
            role: 'assistant',
            content: `你好！我是${BRAND_NAME} 简历顾问。让我们开始吧！请告诉我你想应聘什么岗位，或者你目前的情况。`,
          },
        ]);
        setInitStatus('success');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    initChat();

    return () => {
      abortController.abort();
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, sessionId, mode]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setIsUploading(true);

    // Add parsing status message
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `[正在解析简历文件: ${file.name}...]` },
    ]);

    try {
      // Use the parse-resume API for all file types
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
        headers: {
          'x-deepseek-api-key': getApiKey(),
          'x-api-base-url': getBaseUrl(),
          'x-api-model': getModel(),
        },
      });
      const data = await res.json();

      if (!res.ok) {
        // Handle specific error messages from API
        throw new Error(data.error || '解析失败');
      }

      // Check if the file is detected as a resume
      if (data.detection?.isResume === false) {
        setMessages((prev) => [
          ...prev.slice(0, -1), // Remove the parsing status message
          { role: 'assistant', content: '这个文件可能不是个人简历，请上传你的求职简历，我才能帮你优化。' },
        ]);
        setIsUploading(false);
        return;
      }

      setResumeText(data.text || '');
      // Replace the parsing status message with the actual file info
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove the parsing status message
        { role: 'user', content: `[已上传简历文件: ${file.name}]` },
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '文件解析失败';
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove the parsing status message
        { role: 'assistant', content: `${errorMsg}，请尝试上传其他格式的文件，或直接告诉我你的经历～` },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  // 统一的简历JSON解析入口（通过AI Output Gateway）
  // 完整链路：类型判断 → 提取 → 标准化 → Schema验证 → 质量检测
  const parseResumeJson = (text: string): unknown | null => {
    // 使用AI Output Gateway处理
    const result = processResumeJsonSync(text);

    if (result.success && result.resumeData) {
      if (result.wasRepaired) {
        console.info('[Gateway] JSON已自动修复:', result.fixesApplied);
      }
      if (result.wasTruncated) {
        console.warn('[Gateway] 检测到AI输出被截断，已自动补齐');
      }
      return result.resumeData;
    }

    // 本地处理失败
    console.warn('[Gateway] 本地解析失败:', result.error);
    return null;
  };

  // 后端修复API调用（客户端修复失败时的兜底 - Stage 2/3）
  const tryBackendRepair = async (rawText: string): Promise<unknown | null> => {
    try {
      const res = await fetch('/api/repair-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepseek-api-key': getApiKey(),
          'x-api-base-url': getBaseUrl(),
          'x-api-model': getModel(),
        },
        body: JSON.stringify({ rawJson: rawText }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  // Independent resume generation — calls /api/generate-resume, not /api/chat
  const handleGenerateResume = async (currentMessages?: ChatMessage[]) => {
    const msgs = currentMessages || messages;
    if (msgs.length === 0) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(0);

    // Start animation in background (pure UI, no data dependency)
    const animSteps = [
      '正在分析目标岗位需求...',
      '正在匹配职业关键词...',
      '正在优化你的经历表达...',
      '正在生成专属简历...',
    ];
    const animationPromise = (async () => {
      for (let i = 0; i < animSteps.length; i++) {
        setGenerationStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    })();

    // Detect target position from conversation
    const positionKeywords = [
      '产品经理', '产品', '运营', '新媒体', '前端', '后端', '开发',
      '设计', 'UI', 'UX', '数据', '分析', '销售', '市场', '人力',
      'HR', '行政', '财务', '会计', '客服', '电商',
    ];
    const allText = msgs.map(m => m.content).join(' ');
    const detectedPosition = positionKeywords.find(k => allText.includes(k));

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepseek-api-key': getApiKey(),
          'x-api-base-url': getBaseUrl(),
          'x-api-model': getModel(),
        },
        body: JSON.stringify({
          mode,
          messages: msgs,
          targetPosition: detectedPosition || undefined,
          resumeText: resumeText || undefined,
        }),
      });

      const data = await response.json();

      // Wait for animation to finish before transitioning
      await animationPromise;

      if (data.success && data.resumeData) {
        sessionStorage.setItem('resumeData', JSON.stringify(data.resumeData));
        sessionStorage.setItem('resumeMode', mode);
        sessionStorage.setItem('resumeTargetPosition', detectedPosition || '');
        router.push('/result');
        return;
      }

      // Generation failed — show error, stop animation
      setIsGenerating(false);
      const errorMap: Record<string, string> = {
        INSUFFICIENT_BALANCE: 'AI 服务余额不足，请联系管理员充值后重试。',
        INVALID_API_KEY: 'AI 服务 API Key 无效，请检查配置。',
        RATE_LIMITED: 'AI 服务请求过于频繁，请稍后重试。',
        EMPTY_OUTPUT: 'AI 返回了空内容，请重试或补充更多信息。',
        EMPTY_RESUME: '生成的简历内容为空，请补充更多经历信息后重试。',
        JSON_PARSE_FAILED: '简历生成格式异常，请重试。',
        STREAM_ERROR: '网络连接中断，请检查网络后重试。',
      };
      setGenerationError(errorMap[data.errorCode] || data.error || '简历生成失败，请重试。');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMap[data.errorCode] || data.error || '简历生成失败，请重试。' },
      ]);
    } catch (error) {
      await animationPromise;
      setIsGenerating(false);
      setGenerationError('网络错误，请检查网络连接后重试。');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '网络错误，请检查网络连接后重试。' },
      ]);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // 对话轮次限制检查（当前 unlimited，不影响使用）
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    if (MAX_CONVERSATION_ROUNDS !== Infinity && userMessageCount >= MAX_CONVERSATION_ROUNDS) {
      return;
    }

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user' as const, content: text },
    ];
    // Push user message + empty assistant placeholder BEFORE fetch
    // so thinking animation shows during network round-trip
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    // Extract target position from conversation for knowledge base loading
    const positionKeywords = [
      '产品经理', '产品', '运营', '新媒体', '前端', '后端', '开发',
      '设计', 'UI', 'UX', '数据', '分析', '销售', '市场', '人力',
      'HR', '行政', '财务', '会计', '客服', '电商',
    ];
    const allText = newMessages.map(m => m.content).join(' ');
    const detectedPosition = positionKeywords.find(k => allText.includes(k));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepseek-api-key': getApiKey(),
          'x-api-base-url': getBaseUrl(),
          'x-api-model': getModel(),
        },
        body: JSON.stringify({
          mode,
          messages: newMessages,
          resumeText: resumeText || undefined,
          targetPosition: detectedPosition || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';
      let generateDetected = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullText += parsed.content;

                // Detect generation trigger — immediately stop chat stream and call generate API
                if (!generateDetected && (fullText.includes('[GENERATE_RESUME]') || fullText.includes('正在生成专属简历') || fullText.includes('正在为您生成'))) {
                  generateDetected = true;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: '好的，信息已经足够了！我来为你生成专属简历，请稍候...',
                    };
                    return updated;
                  });
                  // Break out of chat stream — generation will be handled by independent API
                  break;
                }

                // Normal chat display
                if (!generateDetected) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: fullText,
                    };
                    return updated;
                  });
                }
              }
            } catch {
              // skip invalid JSON chunks
            }
          }
        }
        if (generateDetected) break;
      }

      // If generation was detected, call the independent generate API (not the chat stream)
      if (generateDetected) {
        setIsLoading(false);
        handleGenerateResume(newMessages);
        return;
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ''),
        {
          role: 'assistant',
          content: networkStatus === 'offline'
            ? '网络连接已断开。历史消息已保留，恢复连接后可以继续对话。'
            : '抱歉，遇到了网络问题。历史消息已保留，请重试。',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const modeLabels: Record<ResumeMode, string> = {
    optimize: '优化简历',
    apply: '应聘岗位',
    explore: '探索方向',
  };

  // 未检查完 Key 时显示加载状态
  if (!keyChecked) {
    return (
      <div className="h-dvh-screen flex items-center justify-center bg-white">
        <div className="text-[#86868b] text-[15px]">加载中...</div>
      </div>
    );
  }

  // 没有 API Key 时显示提示
  if (!hasKey) {
    return (
      <div className="h-dvh-screen flex flex-col items-center justify-center bg-white px-4 sm:px-6">
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

  return (
    <div className="h-dvh-screen flex flex-col bg-white">
      {/* Generation Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center animate-fade-in">
          <div className="max-w-sm w-full px-8 text-center">
            {/* Animated icon */}
            <div className="mb-8 relative">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1d1d1f] flex items-center justify-center animate-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="absolute -inset-4 rounded-3xl bg-[#0071e3]/5 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            
            {/* Steps */}
            <div className="space-y-3 mb-8">
              {['正在分析目标岗位需求...', '正在匹配职业关键词...', '正在优化你的经历表达...', '正在生成专属简历...'].map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-[14px] transition-all duration-500 ${
                    i <= generationStep ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < generationStep ? 'bg-[#34c759]' : i === generationStep ? 'bg-[#0071e3] animate-pulse' : 'bg-[#e5e5e7]'
                  }`}>
                    {i < generationStep ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={i <= generationStep ? 'text-[#1d1d1f]' : 'text-[#86868b]'}>{step}</span>
                </div>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1 bg-[#e5e5e7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${((generationStep + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Offline Banner */}
      {networkStatus === 'offline' && (
        <div className="flex-shrink-0 px-4 py-2 bg-[#ff9500]/10 border-b border-[#ff9500]/20 text-center">
          <span className="text-[12px] text-[#ff9500]">网络连接已断开，历史消息仍然保留，恢复连接后可继续对话</span>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 w-full px-4 sm:px-6 py-4 border-b border-[#e5e5e7] pt-safe">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-[14px]">返回</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#1d1d1f] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-[14px] font-medium text-[#1d1d1f]">
              {modeLabels[mode]}
            </span>
          </div>
          <button
            onClick={createNewSession}
            className="flex items-center gap-1 text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            title="新建简历"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span className="text-[13px] hidden sm:inline">新建</span>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Persistent info reminder - always visible */}
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#f5f5f7]/60 border border-[#e5e5e7]/40">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-[12px] leading-relaxed text-[#86868b]">
                请尽量详细描述你的过往经历、项目成果与个人优势，信息越充分，简历越完整饱满～
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {messages.length === 0 && isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-[14px] sm:text-[15px] leading-relaxed bg-[#f5f5f7] text-[#1d1d1f] rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#86868b]">思考中</span>
                    <div className="flex items-center gap-1">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite' }} />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite 0.15s' }} />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite 0.3s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0071e3] text-white rounded-br-md'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] rounded-bl-md'
                  }`}
                >
                  {msg.content || (
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#86868b]">思考中</span>
                      <div className="flex items-center gap-1">
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite' }} />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite 0.15s' }} />
                        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0071e3] inline-block" style={{ animation: 'typing-dot 1.2s ease-in-out infinite 0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 w-full border-t border-[#e5e5e7] bg-white pb-safe">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* File upload hint for optimize mode */}
          {mode === 'optimize' && !resumeText && (
            <div className="mb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e5e5e7] text-[13px] text-[#86868b] hover:border-[#d1d1d6] hover:text-[#1d1d1f] transition-colors cursor-pointer touch-target"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isUploading ? '解析中...' : '上传简历（PDF / Word / TXT）'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="mt-1.5 text-[11px] text-[#86868b]">
                请勿上传身份证、银行卡等敏感资料，仅上传求职简历文件
              </p>
            </div>
          )}

          {resumeText && (
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f5f5f7] text-[13px] text-[#1d1d1f]">
              {isUploading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  正在解析 {resumeFile?.name || '简历文件'}...
                </>
              ) : resumeText ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {resumeFile?.name || '已恢复的简历'} 已解析
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {resumeFile?.name || '已恢复的简历'}
                </>
              )}
              <button
                onClick={() => {
                  setResumeFile(null);
                  setResumeText('');
                }}
                className="text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= 5000) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入你的回答..."
              maxLength={5000}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || networkStatus === 'offline'}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                input.trim() && !isLoading && networkStatus === 'online'
                  ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-95'
                  : 'bg-[#e5e5e7] text-[#86868b] cursor-not-allowed'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating action buttons — outside chat content area */}
      <div className="fixed right-3 bottom-28 z-30 flex flex-col gap-2 sm:right-6">
        <button
          onClick={() => setGuideManualOpen(true)}
          aria-label="使用提示"
          title="使用提示"
          className="flex flex-col items-center gap-0.5 cursor-pointer touch-target"
        >
          <span className="w-9 h-9 rounded-full bg-white shadow-md border border-[#e5e5e7] flex items-center justify-center hover:bg-[#f5f5f7] hover:border-[#d1d1d6] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span className="text-[9px] text-[#86868b] font-medium leading-none">使用提示</span>
        </button>
        <button
          onClick={() => setFeedbackOpen(true)}
          aria-label="问题反馈"
          title="问题反馈"
          className="flex flex-col items-center gap-0.5 cursor-pointer touch-target"
        >
          <span className="w-9 h-9 rounded-full bg-white shadow-md border border-[#e5e5e7] flex items-center justify-center hover:bg-[#f5f5f7] hover:border-[#d1d1d6] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="text-[9px] text-[#86868b] font-medium leading-none">问题反馈</span>
        </button>
      </div>

      {/* Guide Modal — manual open from floating button (no delay) */}
      <GuideModal open={guideManualOpen} onClose={() => setGuideManualOpen(false)} skipMinDisplay />

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} page="/interview" featureId="interview" />

      {/* Legal Consent Modal — gate before using AI features */}
      <LegalConsentModal
        open={legalConsentNeeded}
        onConsented={() => setLegalConsentNeeded(false)}
        onCancel={() => {
          setLegalConsentNeeded(false);
          router.push('/');
        }}
      />
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh-screen flex items-center justify-center bg-white">
          <div className="text-[#86868b] text-[15px]">加载中...</div>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
