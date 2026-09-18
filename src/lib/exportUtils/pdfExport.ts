/**
 * PDF 导出 — 浏览器原生 Print 引擎
 *
 * 核心原则：
 * Preview 是唯一视觉来源。PDF 不重新画简历，只把 Preview DOM 交给浏览器 print 引擎。
 *
 * 架构变更：
 * 旧方案：DOM → html2canvas → 长图 → 按固定像素高度切片 → jsPDF
 *   问题：canvas/image 不理解字符、行、段落，会把一行文字从像素中间切开。
 *
 * 新方案：DOM → 克隆 → 注入 print CSS → 浏览器原生 print 引擎
 *   优势：浏览器 print 引擎理解 text flow、line box、paragraph boundary，
 *         不会把一行文字切成上下两半；@page margin 提供每页统一安全区；
 *         break-after/break-inside 实现语义级分页。
 *
 * 导出链路：
 *   Preview DOM [data-resume-document]
 *     → 等待字体 + 图片加载
 *     → 创建隐藏 iframe
 *     → 复制主文档所有样式表
 *     → 克隆 DOM + 重置 transform/scale/width
 *     → 注入 @page + break CSS
 *     → iframe.contentWindow.print()
 *     → 用户选择 "保存为 PDF"
 *     → 清理 iframe
 *
 * 所有模板自动继承：无需模板特定配置。
 */

/**
 * 统一 Print CSS — 所有模板自动继承
 *
 * 原则：
 * - @page margin 提供每页统一安全区（top/bottom/left/right）
 * - 标题不孤立在页底（break-after: avoid）
 * - 图片、列表项不被拆分（break-inside: avoid）
 * - 长文本可自然分页（浏览器在 line box 边界分页，不会切半行）
 * - [data-resume-document] 及其直接子元素重置 padding/margin/transform
 *   避免与 @page margin 叠加产生双倍边距
 */
const PRINT_CSS = `
  /*
   * 全局 PDF 分页规则：
   * - @page margin 控制每页内容边距
   * - 第一页 margin: 0（模板自身 padding 提供页面边距）
   * - 后续页 margin-top: 8mm（适量顶部空白行，避免内容贴顶）
   *   这是全局 continuation-page rule，所有模板自动继承
   */
  @page {
    size: A4 portrait;
    margin: 8mm 0 0 0;
  }
  @page :first {
    margin: 0;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }

  /*
   * 重置 Preview 容器的 transform/scale/width，但保留模板自身的 padding。
   * @page margin: 0 确保浏览器不注入日期/URL/页码等 UI。
   * 每个模板的 padding 提供页面内容边距，与 Preview 完全一致。
   */
  [data-resume-document] {
    transform: none !important;
    zoom: 1 !important;
    width: 210mm !important;
    min-width: 0 !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  /*
   * 模板根元素：只重置固定像素尺寸（来自 Preview wrapper 的 inline style），
   * 保留模板自身的 padding/margin — 这是每个模板设计的页面边距。
   */
  [data-resume-document] > * {
    width: 210mm !important;
    min-width: 0 !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
  }

  /* 标题不孤立在页底 */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* 图片、列表项不被拆分 */
  img {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  li {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* 隐藏屏幕专用元素 */
  .no-print, [data-no-print] {
    display: none !important;
  }
`;

/**
 * 通过隐藏 iframe 调用浏览器原生 print 引擎生成 PDF
 *
 * 优势：
 * 1. 浏览器 print 引擎理解 text flow → 不会把文字切成上下两半
 * 2. @page margin → 每页统一安全区，文字不会顶到页面边缘
 * 3. break-after: avoid → 标题不会孤立在页底
 * 4. break-inside: avoid → 图片/列表项不会被拆分
 * 5. 文本可选中、可搜索（不是图片）
 * 6. 所有模板自动继承，无需模板特定配置
 */
export async function exportPdf(element: HTMLElement, filename: string = '简历'): Promise<void> {
  // 1. 等待字体加载完成
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // 字体加载失败不阻塞导出
    }
  }

  // 2. 验证 DOM 有实际内容
  const elementText = element.textContent?.trim() || '';
  if (element.offsetHeight < 50 || element.offsetWidth < 50) {
    throw new Error(
      `简历 DOM 尺寸异常：宽=${element.offsetWidth}px，高=${element.offsetHeight}px。无法生成 PDF。`
    );
  }
  if (elementText.length < 10) {
    throw new Error(
      `简历 DOM 文本内容为空（长度=${elementText.length}）。无法生成 PDF。`
    );
  }

  // 3. 创建隐藏 iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // iframe 可能已被移除
    }
  };

  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      throw new Error('无法创建打印 iframe');
    }

    // 4. 复制主文档的所有样式表到 iframe
    //    确保模板的 Tailwind CSS 和自定义样式在 iframe 中生效
    const styleSheets = document.querySelectorAll('style, link[rel="stylesheet"]');
    for (const sheet of styleSheets) {
      try {
        doc.head.appendChild(sheet.cloneNode(true));
      } catch {
        // 某些跨域样式表可能无法克隆，跳过
      }
    }

    // 5. 注入 Print CSS
    const printStyle = doc.createElement('style');
    printStyle.textContent = PRINT_CSS;
    doc.head.appendChild(printStyle);

    // 6. 克隆简历 DOM
    const clone = element.cloneNode(true) as HTMLElement;

    // 7. 重置 Preview 容器的 transform/scale
    //    Preview 在屏幕上使用 transform: scale() 缩放显示
    //    Print 时需要还原为原始尺寸
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.zoom = '1';

    doc.body.appendChild(clone);

    // 8. 等待 iframe 中的字体和图片加载
    if (doc.fonts && doc.fonts.ready) {
      try {
        await doc.fonts.ready;
      } catch {
        // 字体加载失败不阻塞
      }
    }

    const images = clone.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 5000);
          const done = () => {
            clearTimeout(timeout);
            resolve();
          };
          img.onload = done;
          img.onerror = done;
        });
      })
    );

    // 9. 等待两帧确保 DOM 完成渲染
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // 10. 设置文档标题（print 对话框会用此作为默认文件名）
    doc.title = filename;

    // 11. 调用浏览器 print 引擎
    win.focus();

    await new Promise<void>((resolve) => {
      const onAfterPrint = () => {
        win.removeEventListener('afterprint', onAfterPrint);
        resolve();
      };
      win.addEventListener('afterprint', onAfterPrint);

      // 安全超时：某些浏览器在打印取消后不触发 afterprint
      const timeout = setTimeout(() => {
        win.removeEventListener('afterprint', onAfterPrint);
        resolve();
      }, 120000);

      // 清理超时当 afterprint 触发
      win.addEventListener('afterprint', () => clearTimeout(timeout), { once: true });

      // 触发打印
      win.print();
    });
  } finally {
    cleanup();
  }
}
