/**
 * 响应式断点配置
 *
 * 与 Tailwind v4 默认断点对齐。
 * JS 端（如 use-mobile.ts）应读取此配置，不再硬编码。
 */

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

/** 移动端断点（用于 JS matchMedia 判断） */
export const MOBILE_BREAKPOINT = BREAKPOINTS.tablet;
