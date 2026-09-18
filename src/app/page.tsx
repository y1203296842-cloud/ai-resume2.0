'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BRAND_NAME } from '@/config/system';
import { FeedbackModal } from '@/components/FeedbackModal';
import { RESULT_PAGE_CONFIG } from '@/config/content';
import { LEGAL_DOCUMENT_LIST } from '@/features/legal';
import { ApiKeyInput } from '@/components/ApiKeyInput';

type Mode = 'optimize' | 'apply' | 'explore';

const modes: Array<{
  id: Mode;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'optimize',
    title: '优化我的简历',
    description: '上传已有简历，AI直接分析优化',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'apply',
    title: '我要应聘某个岗位',
    description: '输入目标岗位，Agent开始问问题',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    id: 'explore',
    title: '我不知道找什么工作',
    description: 'Agent根据你的背景推荐岗位并生成简历',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [keyChecked, setKeyChecked] = useState(false);

  // 检查本地是否已保存 API Key（仅在客户端执行）
  useEffect(() => {
    // 不管有没有 Key，都先显示 API 设置页，等用户点"进入"
    setKeyChecked(true);
  }, []);

  // 未检查完成前不渲染内容，避免 SSR 闪烁
  if (!keyChecked) {
    return (
      <div className="min-h-dvh-screen bg-white flex items-center justify-center">
        <div className="text-[#86868b] text-[15px]">加载中...</div>
      </div>
    );
  }

  // 未点击"进入"前，显示 API 设置页
  if (!entered) {
    return <ApiKeyInput onEnter={() => { setEntered(true); }} />;
  }

  const handleStart = () => {
    if (selectedMode) {
      router.push(`/interview?mode=${selectedMode}`);
    }
  };

  return (
    <div className="min-h-dvh-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 py-5 pt-safe">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1d1d1f] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-[15px] font-medium text-[#1d1d1f] tracking-tight">
              {BRAND_NAME}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 pt-6 sm:pt-14 pb-8">
        <div className="max-w-4xl w-full text-center">
          {/* Slogan */}
          <h1
            className="text-[clamp(2.2rem,5.5vw,3.8rem)] font-[200] leading-[1.15] tracking-tight text-[#1d1d1f] mb-10 animate-fade-in"
          >
            让每个人都有面试机会
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] leading-relaxed text-[#86868b] max-w-lg mx-auto mb-14 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            不知道适合什么岗位？不知道简历怎么写？
            <br />
            已经写好简历但总拿不到面试？交给{BRAND_NAME}。
          </p>

          {/* Mode Cards */}
          <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 max-w-4xl mx-auto mb-12">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`group relative p-8 sm:p-9 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  selectedMode === mode.id
                    ? 'border-[#0071e3] bg-[#f5f5f7] shadow-[0_0_0_1px_#0071e3]'
                    : 'border-[#e5e5e7] bg-white hover:border-[#d1d1d6] hover:bg-[#fafafa]'
                }`}
              >
                <div
                  className={`mb-3 transition-colors duration-200 ${
                    selectedMode === mode.id
                      ? 'text-[#0071e3]'
                      : 'text-[#86868b] group-hover:text-[#1d1d1f]'
                  }`}
                >
                  {mode.icon}
                </div>
                <h3 className="text-[15px] font-medium text-[#1d1d1f] mb-1.5">
                  {mode.title}
                </h3>
                <p className="text-[13px] text-[#86868b] leading-relaxed">
                  {mode.description}
                </p>
                {selectedMode === mode.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={!selectedMode}
            className={`inline-flex items-center justify-center px-10 py-3.5 rounded-full text-[16px] font-medium transition-all duration-200 ${
              selectedMode
                ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] cursor-pointer'
                : 'bg-[#e5e5e7] text-[#86868b] cursor-not-allowed'
            }`}
          >
            开始制作简历
            {selectedMode && (
              <svg className="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </main>

      {/* Why Choose Us Section */}
      <section className="w-full px-4 sm:px-6 py-6 sm:py-8 bg-[#f5f5f7]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-[200] text-center text-[#1d1d1f] mb-3 tracking-tight">
            为什么选择{BRAND_NAME} Resume Agent
          </h2>
          <p className="text-[15px] text-[#86868b] text-center mb-10 max-w-md mx-auto">
            我们不只是做简历，而是帮助你发现原本不知道的优势。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module 1: Job Analysis */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#e5e5e7]">
              <div className="w-10 h-10 rounded-xl bg-[#0071e3] flex items-center justify-center mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 className="text-[17px] font-medium text-[#1d1d1f] mb-2">
                懂岗位，更懂招聘逻辑
              </h3>
              <p className="text-[14px] text-[#86868b] leading-relaxed">
                深度拆解岗位需求与招聘标准，提炼真正影响简历竞争力的关键信息，帮你做出更贴合目标岗位、更容易被看到的职业针对性简历。
              </p>
            </div>

            {/* Module 2: Social Proof */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#e5e5e7]">
              <div className="w-10 h-10 rounded-xl bg-[#5856d6] flex items-center justify-center mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-[17px] font-medium text-[#1d1d1f] mb-2">
                数万人的选择
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-1.5">
                  {[
                    '/avatars/avatar1.png',
                    '/avatars/avatar2.png',
                    '/avatars/avatar3.png',
                    '/avatars/avatar4.png',
                    '/avatars/avatar5.png',
                    '/avatars/avatar6.jpg',
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`用户头像${i + 1}`}
                      className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm"
                      loading="lazy"
                    />
                  ))}
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-[#f5f5f7] flex items-center justify-center text-[10px] text-[#86868b] font-medium">
                    +9k
                  </div>
                </div>
              </div>
              {/* Scrolling testimonials */}
              <div className="h-[72px] overflow-hidden relative">
                <div className="space-y-2 animate-scroll-up">
                  {[
                    '刚毕业根本不了解岗位，也不知道能找到什么工作，没想到不仅能帮我做简历还能根据我的优势提供岗位和针对性优化，必须狠狠支持一波！',
                    `进面试啦！！接接接！用了${BRAND_NAME}生成的简历，HR说我简历写得特别针对性，终于不用海投了`,
                    '我去这个真神了吧，就生成了一份简历，第二天就收到面试通知了，之前投了二十多家都没回音',
                    '找到心仪的工作啦，接接接！之前完全不知道简历怎么写，Agent一步步引导我，连我自己都没想到有这些优势',
                    '转行用的，Agent帮我挖掘了很多之前工作中可以迁移的能力，新简历比之前专业太多了',
                  ].map((text, i) => (
                    <p key={i} className="text-[12px] text-[#86868b] leading-relaxed line-clamp-2">
                      &ldquo;{text}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Module 3: Experience Mining */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#e5e5e7]">
              <div className="w-10 h-10 rounded-xl bg-[#34c759] flex items-center justify-center mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3v1h6v-1c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-medium text-[#1d1d1f] mb-2">
                你的经历可能不差，只是没被正确表达
              </h3>
              <p className="text-[14px] text-[#86868b] leading-relaxed">
                帮你从项目、实习、校园经历中挖出容易被忽略的亮点，把普通经历写出价值，让招聘方更快看到你的优势。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-6 py-6 border-t border-[#e5e5e7] pb-safe">
        <div className="max-w-5xl mx-auto text-center space-y-2">
          <p className="text-[12px] text-[#86868b]">
            AI 驱动的智能简历制作，帮你获得心仪的面试机会
          </p>
          <p className="text-[11px] text-[#c7c7cc]">
            制作人：<span className="text-[#86868b]">@抖音杨枝甘霖</span>
          </p>
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
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            >
              {RESULT_PAGE_CONFIG.feedback}
            </button>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} page="/" featureId="home" />
    </div>
  );
}
