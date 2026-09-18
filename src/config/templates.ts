/**
 * 简历模板配置
 *
 * TemplateId 定义为开放式类型，允许未来新增模板而无需修改此文件。
 * 模板注册的唯一入口是 src/templates/registry.ts。
 * 模板渲染逻辑在 src/templates/ 目录下。
 */

/**
 * 内置模板 ID（保留联合类型以提供自动补全）
 */
export type BuiltinTemplateId = 'modern' | 'business' | 'campus' | 'wenneker' | 'altacv' | 'techresume' | 'basicresume' | 'pikaresume';

/**
 * 开放式 TemplateId —— 允许任意 string，同时为内置模板提供自动补全。
 * `(string & {})` 是 TypeScript 常用技巧，使联合类型同时接受已知值和任意 string。
 */
export type TemplateId = BuiltinTemplateId | (string & {});

export interface ResumeTemplate {
  id: TemplateId;
  name: string;
  description: string;
  suitedFor: string[];
  /** 开源版 - 所有模板免费，此字段保留用于类型兼容 */
  isPremium: boolean;
}

/**
 * 内置模板静态列表（向后兼容）
 *
 * 注意：模板选择页面应优先使用 src/templates/registry.ts 的 getAllTemplateMetas()。
 * 此数组保留用于不依赖 registry 的旧代码路径。
 */
export const TEMPLATES: ResumeTemplate[] = [
  {
    id: 'modern',
    name: '互联网简洁风',
    description: '简洁现代，适合互联网/科技行业',
    suitedFor: ['互联网', '科技', '产品', '运营', '设计'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'business',
    name: '商务正式风',
    description: '专业正式，适合传统行业/管理岗',
    suitedFor: ['金融', '咨询', '管理', '销售', '市场'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'campus',
    name: '应届生校园风',
    description: '清新活力，突出校园经历和潜力',
    suitedFor: ['大学生', '应届生', '实习', '转行'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'wenneker',
    name: '双栏专业风',
    description: '源自 LaTeX Wenneker 模板，双栏布局，左侧个人信息，右侧主体内容',
    suitedFor: ['技术', '开发', '工程', '研究', '学术', '设计', '学生', '应届生', '研究生', '职场人士'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'altacv',
    name: '学术专业风',
    description: '源自 LaTeX AltaCV 模板，左侧边栏个人信息，右侧主体内容，紫色强调风格',
    suitedFor: ['学术', '研究', '教育', '技术', '工程', '研究生', '职场人士', '应届生', '学生'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'techresume',
    name: '科技职场',
    description: '单栏、ATS 友好，适合技术与互联网岗位',
    suitedFor: ['软件工程', 'AI', '数据', '互联网', '技术产品'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'basicresume',
    name: '极简职场',
    description: '标准单栏 ATS 简历，适合广泛职场岗位',
    suitedFor: ['应届生', '互联网', '产品', '运营', '技术', '数据'],
    isPremium: false, // 开源版 - 所有模板免费
  },
  {
    id: 'pikaresume',
    name: '现代职场',
    description: '浅灰头部背景，蓝色标题，适合互联网/技术/产品岗位',
    suitedFor: ['互联网', '技术', '产品', '设计', '应届生', '社招'],
    isPremium: false, // 开源版 - 所有模板免费
  },
];

export function getTemplate(id: TemplateId): ResumeTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getDefaultTemplate(): ResumeTemplate {
  return TEMPLATES[0];
}
