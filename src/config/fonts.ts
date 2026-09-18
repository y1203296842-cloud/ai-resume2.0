/**
 * 全局字体配置
 *
 * 所有模板的默认字体策略：
 * - CSS（React Preview + PDF 捕获 DOM）：使用字体栈，CJK 安全
 * - DOCX：使用系统字体名，确保 Word 中中文正常显示
 *
 * 模板可以在 style.font 中覆盖，但必须确保 CJK 安全。
 */

export const GLOBAL_FONT = {
  /** CSS 字体栈 —— 用于 React Preview 和 PDF 导出（捕获 DOM） */
  cssStack:
    "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', -apple-system, BlinkMacSystemFont, sans-serif",

  /** DOCX 字体名 —— 用于 Word 导出（必须是系统已安装字体） */
  docx: 'Microsoft YaHei',
} as const;
