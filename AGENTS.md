# AGENTS.md

## 项目概览

甘霖 AI Resume Agent - 帮助每个人都有面试机会的 AI 简历制作垂直 Agent。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **LLM**: coze-coding-dev-sdk (doubao-seed-2-0-lite-260215)，通过 `src/config/llm.ts` 抽象层调用
- **Export**: docx (Word) + jspdf (PDF)
- **Knowledge**: Markdown 文件知识库，按需加载

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页 (Landing)
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   ├── interview/page.tsx    # 问答页 (Agent对话)
│   ├── result/page.tsx       # 结果页 (简历预览+模板选择+导出)
│   └── api/
│       ├── chat/route.ts         # LLM流式对话API (含知识库注入+输入安全)
│       ├── export/route.ts       # 简历导出API (PDF/Word)
│       ├── parse-resume/route.ts # 简历文件解析API (PDF/DOCX/TXT)
│       └── repair-json/route.ts  # JSON修复API (AI Output Gateway兜底)
├── config/                   # 迁移就绪配置模块
│   ├── llm.ts                # LLM抽象层 (迁移时只需改此文件)
│   ├── admin.ts              # 管理员配置（通知/质量阈值/恢复策略/输入限制）
│   ├── permissions.ts        # 权限/角色配置 (预留)
│   ├── pricing.ts            # 定价配置 (预留)
│   └── templates.ts          # 模板注册表
├── templates/                # 简历模板系统
│   ├── index.tsx             # 模板渲染器
│   ├── modern.tsx            # 模板1: 互联网简洁风
│   ├── business.tsx          # 模板2: 商务正式风
│   └── campus.tsx            # 模板3: 应届生校园风
├── lib/
│   ├── types.ts              # 类型定义
│   ├── prompts.ts            # Agent系统提示词
│   ├── knowledge.ts          # 知识库加载器
│   ├── utils.ts              # 工具函数
│   ├── aiOutputGateway/      # AI输出统一网关（核心）
│   │   ├── index.ts          # 模块导出
│   │   └── gateway.ts        # 输出类型判断→清洗→标准化→Schema→质量检测→自动修复
│   ├── jsonProcessor/        # JSON安全处理模块
│   │   ├── index.ts          # 模块导出
│   │   ├── jsonSanitizer.ts  # JSON清洗（去Markdown、提取、基础修复）
│   │   ├── jsonNormalizer.ts # JSON标准化（中文标点、引号、截断恢复）
│   │   └── repairJson.ts     # JSON修复（括号补齐、类型转换）
│   ├── schema/               # Schema Contract系统
│   │   ├── index.ts          # 模块导出
│   │   └── resumeSchema.ts   # 简历Schema定义+验证+标准化
│   ├── resumeGeneration/     # 简历生成状态管理
│   │   ├── index.ts          # 模块导出
│   │   ├── stateMachine.ts   # 生成状态机（ANALYZING→BUILDING→...→COMPLETED）
│   │   └── autoEnhancement.ts # 自动补强机制（缺口分析+可迁移技能）
│   ├── resumeQuality/        # 简历质量检测
│   │   └── resumeQualityChecker.ts # 5维度评分（岗位匹配30+内容丰满25+经历深度20+技能15+基础10）
│   ├── monitor/              # 错误监控系统
│   │   ├── index.ts          # 模块导出
│   │   └── errorMonitor.ts   # 错误记录+统计+报告生成
│   ├── inputGuard/           # 输入安全层
│   │   ├── index.ts          # 模块导出
│   │   └── inputGuard.ts     # 长度限制+Prompt Injection检测+非求职内容检测
│   └── fileProcessor/        # 文件处理模块（迁移就绪）
│       ├── index.ts          # 主入口（集成多级PDF解析）
│       ├── fileValidator.ts  # 文件验证（类型/大小/页数）
│       ├── pdfParser.ts      # PDF文本提取（兼容旧接口）
│       ├── docxParser.ts     # DOCX文本提取（兼容旧接口）
│       ├── textExtractor.ts  # 文本清洗与结构化
│       ├── resumeDetector.ts # 简历内容检测
│       └── parsers/          # 多级解析器（新架构）
│           ├── index.ts      # 统一解析入口（自动选择策略）
│           ├── pdf/          # PDF多级解析
│           │   ├── index.ts        # PDF解析编排（text→layout→ocr fallback）
│           │   ├── pdfTextParser.ts    # 第一层：普通文字解析
│           │   ├── pdfLayoutParser.ts  # 第二层：布局结构解析
│           │   ├── pdfOcrParser.ts     # 第三层：OCR扫描解析
│           │   └── pdfQualityChecker.ts # 文本质量检测（乱码/空白/长度）
│           ├── docx/         # DOCX解析
│           │   ├── index.ts
│           │   └── docxParser.ts
│           └── markdown/     # Markdown/TXT解析
│               └── parser.ts
│   ├── templates/            # 模板系统（新架构）
│   │   ├── index.ts          # 模块导出
│   │   ├── templateTypes.ts  # 模板类型定义（Style/Layout/Meta/ContentAdapter）
│   │   ├── registry.ts       # 模板注册表（注册/查询/推荐/注销）
│   │   └── renderer.ts       # 模板渲染器（数据+模板→HTML）
│   ├── templateImporter/     # 外部模板导入系统
│   │   └── index.ts          # 支持LaTeX/Word/HTML/JSON导入→转换→注册
│   └── exportUtils/          # 导出工具模块（客户端）
│       ├── index.ts          # 模块导出
│       ├── pdfExport.ts      # PDF导出（html2pdf.js，支持中文）
│       └── docxExport.ts     # DOCX导出（docx库，支持中文）
├── components/ui/            # shadcn/ui组件库
knowledge/                    # 职业知识库 (10个Markdown文件)
├── 01_新媒体运营.md
├── 02_运营专员.md
├── ...
└── 10_客服客户成功.md
```

## 核心流程

1. 首页选择模式 → 2. 问答页Agent对话 → 3. 结果页预览+模板选择+导出

三种模式：
- `optimize`: 上传简历 → AI分析优化 → 生成
- `apply`: 指定岗位 → 针对性收集信息 → 生成
- `explore`: 了解背景 → 推荐岗位 → 选择后生成

## 架构设计（迁移就绪）

### LLM 抽象层
- `src/config/llm.ts`: 统一的 LLM 接口，当前使用 coze-coding-dev-sdk
- 迁移时只需修改此文件中的 `createLLMStream` 函数
- 业务逻辑不依赖任何特定模型

### 知识库系统
- Markdown 文件存储在 `knowledge/` 目录
- `src/lib/knowledge.ts` 负责按需加载（只加载匹配的1个文件）
- 迁移时可直接迁移到向量数据库/RAG系统

### 文件解析系统（多级 Fallback）
- `src/lib/fileProcessor/parsers/` 多级解析架构
- PDF 解析策略：文字解析 → 布局解析 → OCR解析（自动降级）
- 文本质量检测：乱码比例、空白比例、有效行数、文本长度
- 所有格式统一输出为结构化文本，经 ResumeDetector 检测后供 Agent 使用
- 迁移时只需替换底层解析库（pdf-parse → pdfjs-dist 等）

### 模板系统
- 3套内置简历模板：modern(互联网)、business(商务)、campus(校园)
- `src/lib/templates/` 新架构：类型定义 + 注册表 + 渲染器
- `src/lib/templateImporter/` 支持外部模板导入（LaTeX/Word/HTML/JSON）
- 模板选择完整传递：前端选择 → API → Renderer → PDF/Word输出
- 新增模板只需注册，不修改核心逻辑
- 迁移时可直接复用注册表和渲染器
- `src/templates/` 目录包含模板渲染组件
- 新增模板只需添加组件文件并注册

### 预留配置
- `src/config/permissions.ts`: admin/user/vip 角色配置
- `src/config/pricing.ts`: 定价配置（按次/按功能）

## 开发命令

```bash
pnpm dev          # 开发环境
pnpm build        # 构建
pnpm ts-check     # 类型检查
pnpm lint         # 代码检查
```

## 关键文件

- `src/config/llm.ts`: LLM抽象层，迁移时修改此文件
- `src/lib/prompts.ts`: Agent提示词，控制对话策略和简历生成格式
- `src/lib/knowledge.ts`: 知识库加载器，关键词匹配+按需加载
- `src/app/api/chat/route.ts`: SSE流式对话接口，集成知识库注入
- `src/app/api/export/route.ts`: PDF/Word导出接口
- `src/app/interview/page.tsx`: 对话页，处理流式响应和简历数据提取
- `src/app/result/page.tsx`: 简历预览、模板选择、导出
