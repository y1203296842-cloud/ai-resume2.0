import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LEGAL_DOCUMENT_LIST, getLegalDocument } from '@/features/legal';

export function generateStaticParams() {
  return LEGAL_DOCUMENT_LIST.map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then((resolvedParams) => {
    const doc = getLegalDocument(resolvedParams.slug);
    if (!doc) return { title: '未找到文件' };
    return { title: doc.title };
  });
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#e5e5e7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#0071e3] hover:underline text-[14px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回首页
          </Link>
          <span className="text-[12px] text-[#86868b]">版本 {doc.version}</span>
        </div>
      </header>

      {/* Document Content */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] mb-4 tracking-tight">
          {doc.title}
        </h1>

        {/* Date Info */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#86868b] mb-8 pb-6 border-b border-[#e5e5e7]">
          <span>生效日期：{doc.effectiveDate}</span>
          <span>更新日期：{doc.updatedDate}</span>
        </div>

        {/* Intro */}
        <p className="text-[15px] text-[#1d1d1f] leading-[1.8] mb-8">
          {doc.intro}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {doc.sections.map((section, idx) => (
            <section key={idx}>
              {section.heading && (
                <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#1d1d1f] mb-3">
                  {section.heading}
                </h2>
              )}
              <div className="space-y-2.5">
                {section.paragraphs.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-[15px] text-[#1d1d1f] leading-[1.8]"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Other Documents */}
        <div className="mt-12 pt-8 border-t border-[#e5e5e7]">
          <h3 className="text-[15px] font-medium text-[#1d1d1f] mb-4">其他法律文件</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_DOCUMENT_LIST.filter((d) => d.slug !== slug).map((d) => (
              <Link
                key={d.id}
                href={`/legal/${d.slug}`}
                className="text-[14px] text-[#0071e3] hover:underline"
              >
                《{d.shortTitle}》
              </Link>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
