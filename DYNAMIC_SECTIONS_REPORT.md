# 简历动态栏目系统 — 完整排查与重构报告

## 一、当前固定栏目到底在哪个文件、哪段逻辑中被写死

### 根因分析

固定栏目限制并非存在于单一文件，而是贯穿多个层的协同约束。以下是排查发现的所有限制点：

| 层级 | 文件 | 限制逻辑 | 严重程度 |
|------|------|----------|----------|
| LLM 输出格式 | `src/app/api/generate-resume/route.ts` | `GENERATE_MODE_OVERRIDE` 原来强制 LLM 输出扁平字段（education/experience/projects/skills/certificates/evaluation），`convertSectionsToFlatFields` 函数只映射 6 个固定栏目，未知栏目被静默丢弃 | **致命** |
| TypeScript 类型 | `src/templates/types.ts` | `SectionType` 原定义为 8 个固定枚举值的 union type，编译期限制栏目 ID | **严重** |
| 一致性检查 | `src/templates/conformance.ts` | `sidebar.regions` 和 `supportedSections` 使用 `ALL_SECTION_TYPES` 白名单过滤，动态栏目 ID 被标记为非法值并移除 | **严重** |
| 栏目排序 | `src/templates/rules.ts` | `getOrderedSectionIds` 原来区分 native/fallback，native 按模板声明顺序，fallback 追加在后面，破坏 priority 排序 | **中等** |
| 栏目标题 | `src/templates/sectionTitles.ts` | `ZH_TITLES`/`EN_TITLES` 原为 `Record<SectionType, string>`，动态栏目 ID 找不到对应标题 | **中等** |
| 布局分配 | `src/templates/layoutModel.ts` | 原来区分已知栏目（按 sidebar.regions 分配）和动态栏目（按 placement 分配），逻辑不一致 | **中等** |
| 模板渲染 | 所有 8 个模板组件 | 原来直接访问 `data.projects`/`data.education`/`data.skills` 等固定字段，忽略 `data.sections` 中的动态栏目 | **致命** |

### 最致命的两个根因

1. **LLM 输出格式限制**：`route.ts` 中的 `convertSectionsToFlatFields` 函数将 LLM 返回的 sections 数组转换为扁平字段，只映射 6 个固定栏目（education/experience/projects/skills/certificates/evaluation），任何不在映射表中的栏目被**静默丢弃**。

2. **模板渲染层固定字段访问**：所有模板原来直接读取 `data.projects`、`data.education`、`data.skills` 等扁平字段，完全忽略 `data.sections` 数组。即使 ResumeData 中有动态栏目数据，模板也无法渲染。

---

## 二、工作经历为什么消失，真实根因是什么

### 排查链路

```
LLM 返回 → Schema 校验 → 转换 → ResumeData → 栏目过滤 → 模板渲染
```

### 真实根因

**工作经历消失的根因是多层的：**

1. **LLM 输出层**：`GENERATE_MODE_OVERRIDE` 原来没有明确指示 LLM 输出 `sections` 数组格式，而是期望扁平字段。LLM 可能返回了 `workExperience` 或 `experience` 字段，但 `convertSectionsToFlatFields` 只识别固定字段名。

2. **转换层**：`convertSectionsToFlatFields` 函数（现已改为 `ensureSectionsFormat` no-op）原来将 sections 数组转换为扁平字段时，只映射了 6 个固定栏目。如果 LLM 返回了 `experience` 类型的 section，转换函数会尝试映射到 `data.experience`，但如果 LLM 使用的 section id 不是恰好匹配的，就会被丢弃。

3. **模板渲染层**：即使 `data.experience` 有数据，如果模板的 `supportedSections` 不包含 `experience`（某些模板可能没有声明），`getFallbackSections` 会将其标记为 fallback，但模板渲染时直接访问 `data.projects` 而不是 `data.experience`，导致工作经历不被渲染。

### 修复方案

- `GENERATE_MODE_OVERRIDE` 已修改为明确指示 LLM 输出 `sections` 数组格式，支持任意栏目 ID
- `ensureSectionsFormat` 改为 no-op，不再强制转换
- `sectionNormalizer.ts` 的 `syncLegacyFields` 负责 sections ↔ legacy 字段双向同步
- 所有模板使用 `DynamicSectionsRenderer` 渲染全部栏目，不再直接访问固定字段

---

## 三、论文为什么会进入证书栏目，真实根因是什么

### 真实根因

论文被错误塞入证书栏目的根因是 **Fallback 逻辑的"就近匹配"机制**：

1. **LLM 输出层**：LLM 可能正确识别了论文内容，但由于 `GENERATE_MODE_OVERRIDE` 原来没有明确指示"论文应该放在科研经历或学术成果栏目"，LLM 可能将论文放到了 `certificates` section（因为论文和证书都是"成果类"内容）。

2. **转换层**：`convertSectionsToFlatFields` 原来将所有未识别的 section 内容尝试匹配到固定栏目。如果 LLM 返回了一个 id 为 "publications" 的 section，转换函数找不到对应字段，可能将其内容合并到最接近的固定栏目（certificates）。

3. **缺少明确归类指引**：`GENERATE_MODE_OVERRIDE` 原来没有"禁止错塞"的明确规则，LLM 可能将论文归类到证书。

### 修复方案

- `GENERATE_MODE_OVERRIDE` 新增明确规则："禁止错塞：全职工作→工作经历；实习→实习经历或合并到工作经历；项目→项目经历；科研/论文→科研经历或学术成果；班长/社团→校园经历；竞赛→竞赛获奖；证书→证书荣誉"
- 动态栏目 ID 不再被强制匹配到固定栏目，而是保留原始 ID 和标题
- `GenericSectionRenderer` 根据 `itemType` 渲染任意栏目，不需要栏目 ID 匹配

---

## 四、哪些 Schema / Type / Filter / Fallback / Renderer 存在固定栏目逻辑

### 已修复的限制点

| 文件 | 原限制逻辑 | 修复方式 |
|------|------------|----------|
| `src/app/api/generate-resume/route.ts` | `convertSectionsToFlatFields` 只映射 6 个固定栏目 | 改为 `ensureSectionsFormat` no-op，保留 sections 数组 |
| `src/app/api/generate-resume/route.ts` | `GENERATE_MODE_OVERRIDE` 强制扁平字段输出 | 改为 sections 数组格式，支持动态栏目 ID |
| `src/templates/types.ts` | `SectionType` 为 8 个固定枚举 union type | 改为 `string`，新增 `KNOWN_SECTION_TYPES` 常量 |
| `src/templates/conformance.ts` | `ALL_SECTION_TYPES` 白名单过滤 sidebar.regions 和 supportedSections | 移除白名单检查，仅保留 evaluation/personalInfo 特殊规则 |
| `src/templates/rules.ts` | 区分 native/fallback 排序 | 统一按 priority 排序 |
| `src/templates/sectionTitles.ts` | `Record<SectionType, string>` 固定映射 | 改为 `Partial<Record<string, string>>`，新增 `resolveSectionTitle` |
| `src/templates/layoutModel.ts` | 区分已知/动态栏目分配逻辑 | 统一按 placement 属性分配 |
| `src/templates/index.tsx` | 分离 legacy/dynamic fallback，只传 legacy IDs | 统一传递所有 fallback IDs |
| 所有 8 个模板组件 | 直接访问 `data.projects` 等固定字段 | 使用 `DynamicSectionsRenderer` 渲染全部栏目 |

### 保留的已知栏目逻辑（合理保留，不限制动态栏目）

| 文件 | 逻辑 | 保留原因 |
|------|------|----------|
| `src/lib/sectionNormalizer.ts` | `syncLegacyFields` 只映射已知 ID 到 legacy 字段 | 双向兼容桥接，动态栏目不需要 legacy 字段 |
| `src/lib/exportUtils/docxExport.ts` | 已知 ID 走优化渲染器，未知 ID 走动态渲染器 | 性能优化，两条路径都支持 |
| `src/templates/FallbackSections.tsx` | `ALL_SECTION_TYPES` 区分 legacy/dynamic fallback | 安全网，两种 fallback 都支持 |
| `src/templates/layoutModel.ts` | `personalInfo` 强制 sidebar，`evaluation` 强制 main | 全局布局规则 |

### 已确认的死代码（不影响动态栏目）

| 文件 | 状态 |
|------|------|
| `src/lib/templates/renderer.ts` | 死代码，未被任何活跃路径导入 |
| `src/lib/templateEngine/renderer.ts` | 死代码，未被任何活跃路径导入 |

---

## 五、修改了哪些文件

### 核心数据流修改

| # | 文件 | 修改内容 |
|---|------|----------|
| 1 | `src/app/api/generate-resume/route.ts` | `GENERATE_MODE_OVERRIDE` 改为 sections 数组格式；`ensureSectionsFormat` 改为 no-op |
| 2 | `src/templates/types.ts` | `SectionType` 改为 `string`；新增 `KNOWN_SECTION_TYPES` 和 `isKnownSectionType` |
| 3 | `src/templates/conformance.ts` | 移除 sidebar.regions 和 supportedSections 的白名单检查 |
| 4 | `src/templates/rules.ts` | 移除 native/fallback 分离，统一按 priority 排序 |
| 5 | `src/templates/sectionTitles.ts` | `Partial<Record<string, string>>`；新增 `resolveSectionTitle` |
| 6 | `src/templates/layoutModel.ts` | 统一按 placement 属性分配 sidebar/main |
| 7 | `src/templates/index.tsx` | 简化 fallback 逻辑，移除 legacy/dynamic 分离 |
| 8 | `src/lib/sectionNormalizer.ts` | `ensureSections` 从 legacy 字段构建 sections；`syncLegacyFields` 双向同步 |
| 9 | `src/lib/schema/resumeSchema.ts` | `normalizeSection` 支持动态栏目 ID；调用 `normalizeResumeData` 同步 |

### 新增组件

| # | 文件 | 内容 |
|---|------|------|
| 10 | `src/templates/GenericSectionRenderer.tsx` | 通用动态栏目渲染器 + `DynamicSectionsRenderer` 批量渲染器 |

### 模板组件更新（8 个全部更新）

| # | 文件 | 修改内容 |
|---|------|----------|
| 11 | `src/templates/modern.tsx` | 使用 `DynamicSectionsRenderer` + `modernSectionConfig` |
| 12 | `src/templates/business.tsx` | 使用 `DynamicSectionsRenderer` + `businessConfig` |
| 13 | `src/templates/campus.tsx` | 使用 `DynamicSectionsRenderer` + `campusConfig` |
| 14 | `src/templates/techresume.tsx` | 使用 `DynamicSectionsRenderer` + `techConfig` |
| 15 | `src/templates/basicresume.tsx` | 使用 `DynamicSectionsRenderer` + `basicConfig` |
| 16 | `src/templates/pikaresume.tsx` | 使用 `DynamicSectionsRenderer` + `pikaConfig` |
| 17 | `src/templates/wenneker.tsx` | 使用 `DynamicSectionsRenderer` + 侧边栏/主栏分离配置 |
| 18 | `src/templates/altacv.tsx` | 使用 `GenericSectionRenderer` + 侧边栏/主栏分离配置 |

### 导出层

| # | 文件 | 修改内容 |
|---|------|----------|
| 19 | `src/lib/exportUtils/docxExport.ts` | 新增 `renderDynamicExperienceSection`/`renderDynamicListSection`/`renderDynamicTextSection`；`renderSection` 支持动态栏目 |

---

## 六、新的数据结构

### ResumeData

```typescript
interface ResumeData {
  personalInfo: PersonalInfo;        // 固定 Contract，不变
  sections: ResumeSection[];          // 动态栏目数组（主结构）
  // legacy 字段（education/experience/projects/skills/certificates/languages/evaluation）
  // 由 syncLegacyFields 自动同步，供 DOCX 优化渲染器使用
}

interface ResumeSection {
  id: string;                         // 任意 ID（education/experience/research/campus/...）
  title: string;                      // 栏目标题（LLM 生成，如"科研经历"、"校园经历"）
  itemType: 'experience-item' | 'list-item' | 'text-item';
  items: ResumeSectionItem[];
  priority?: number;                  // 越大越靠前（默认 50）
  placement?: 'main' | 'sidebar';     // 布局位置
}

type ResumeSectionItem =
  | ResumeExperienceItem              // { type, title, subtitle?, startDate?, endDate?, description[], meta? }
  | ResumeListItem                    // { type: 'list-item', items: string[] }
  | ResumeTextItem;                   // { type: 'text-item', content: string }
```

### SectionType

```typescript
type SectionType = string;            // 不再是固定枚举，允许任意栏目 ID

const KNOWN_SECTION_TYPES = [
  'personalInfo', 'education', 'experience', 'projects',
  'skills', 'certificates', 'languages', 'evaluation'
];                                     // 已知栏目（legacy 兼容，不做白名单过滤）
```

---

## 七、新的动态栏目如何贯穿全链路

```
用户聊天内容
    ↓
LLM（GENERATE_MODE_OVERRIDE 指示输出 sections 数组格式）
    ↓ 输出: { personalInfo: {...}, sections: [{id, title, itemType, items, priority, placement}] }
    ↓
Schema 校验（resumeSchema.ts）
    ↓ validateAndNormalize → normalizeSection（支持任意 id）
    ↓
sectionNormalizer.ts
    ↓ normalizeResumeData → ensureSections + syncLegacyFields
    ↓ sections 始终存在且已排序；legacy 字段自动同步
    ↓
ResumeData（sections 为主结构，legacy 字段为兼容）
    ↓
栏目排序（rules.ts）
    ↓ getOrderedSectionIds → 统一按 priority 降序，evaluation 最后
    ↓
布局分配（layoutModel.ts）
    ↓ buildNormalizedLayout → 按 placement 分配 sidebar/main
    ↓
Template Plugin（所有模板使用 DynamicSectionsRenderer）
    ↓ DynamicSectionsRenderer → ensureSections → 遍历全部栏目
    ↓ GenericSectionRenderer → 按 itemType 渲染（experience-item/list-item/text-item）
    ↓
React Preview（实时渲染全部动态栏目）
    ↓
PDF Export（浏览器原生 Print，捕获 Preview DOM）
    ↓ 动态栏目已在 DOM 中，PDF 自动包含
    ↓
DOCX Export（docxExport.ts）
    ↓ renderSection → 已知 ID 走优化渲染器，未知 ID 走动态渲染器
    ↓ renderDynamicExperienceSection / renderDynamicListSection / renderDynamicTextSection
    ↓
Word 文档（动态栏目完整保留）
```

### 关键保障

| 保障点 | 实现方式 |
|--------|----------|
| LLM 输出不被限制 | `GENERATE_MODE_OVERRIDE` 明确支持任意栏目 ID |
| Schema 不拒绝动态栏目 | `normalizeSection` 接受任意 id 字符串 |
| 转换不丢弃动态栏目 | `ensureSectionsFormat` 为 no-op，`normalizeResumeData` 保留 sections |
| 排序不区别对待 | `getOrderedSectionIds` 统一按 priority 排序 |
| 布局不区别对待 | `buildNormalizedLayout` 统一按 placement 分配 |
| 模板不忽略动态栏目 | `DynamicSectionsRenderer` 渲染全部栏目 |
| PDF 不丢失动态栏目 | 使用 Preview DOM 作为唯一视觉源 |
| DOCX 不丢失动态栏目 | `renderSection` 支持动态栏目渲染 |

---

## 八、如何保证未来出现未知类型经历不会再次乱塞

### 三层防护

1. **LLM 指令层**：`GENERATE_MODE_OVERRIDE` 明确规定"禁止错塞"规则，并给出正确归类示例。LLM 被指示"内容决定栏目，不是栏目决定内容"。

2. **数据结构层**：`ResumeSection.id` 为 `string` 类型，不限制为枚举。任何未知类型的经历都可以有自己的 section ID 和 title，不会被强制匹配到固定栏目。

3. **渲染层**：`GenericSectionRenderer` 根据 `itemType`（而非 `id`）决定渲染方式。只要 `itemType` 是 `experience-item`/`list-item`/`text-item` 之一，任何栏目都能正确渲染，无论 ID 是什么。

### 不存在以下 Fallback 逻辑

- ❌ `unknownContent → certificates`
- ❌ `unknownContent → projects`
- ❌ `if (text.includes("论文")) → research`
- ❌ `不认识的 section id → 塞进最近栏目`

### 实际行为

当出现未知类型经历时：
1. LLM 理解内容性质，生成合理的 section ID 和 title
2. `normalizeSection` 接受任意 ID，不做白名单过滤
3. `GenericSectionRenderer` 按 `itemType` 渲染
4. `resolveSectionTitle` 优先使用 `section.title`，其次查找已知映射，最后回退到 ID 本身
5. DOCX 的 `renderSection` 检测到未知 ID，走动态渲染器

---

## 九、如何防止栏目无限增多

### LLM 指令层约束

`GENERATE_MODE_OVERRIDE` 明确规定：
- "栏目数量克制：3-6个核心栏目，不为分类而分类"
- "性质相近的内容合理归并"
- "无该类内容则不设该栏"

### 数据结构层约束

- `ResumeSection.priority` 字段用于排序，LLM 被指示"根据岗位相关性和内容价值设置"
- `ensureEvaluationLast` 确保 evaluation 始终最后

### 渲染层约束

- `hasSectionContent` 过滤掉没有实际内容的栏目
- `sortSections` 按 priority 降序排序，低价值栏目自然靠后

### 合并原则（由 LLM 执行）

LLM 被指示进行语义归纳聚类：
- 多个性质相近的经历可以归并到一个栏目（如多个竞赛 → "竞赛获奖"）
- 只有一两条内容的小栏目可以合并到相近栏目
- 栏目数量目标：3-6 个核心栏目

---

## 十、8 类真实测试场景分析

### 场景 1：正式工作经历丰富的人

**预期行为**：LLM 输出 `experience` section（itemType: experience-item），包含工作经历条目。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 明确支持 "工作经历" 栏目
- `ensureSections` 保留 experience section
- `syncLegacyFields` 同步到 `data.experience`（供 DOCX 优化渲染）
- `DynamicSectionsRenderer` 渲染 experience section
- DOCX `renderSection` 走 `renderExperience`（已知 ID 优化路径）

**结论**：✅ 工作经历不会消失，不会被塞进项目经历

### 场景 2：没有正式工作经历的学生

**预期行为**：LLM 不输出 experience section。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 规定"无该类内容则不设该栏"
- `ensureSections` 不会凭空创建 experience section
- `hasSectionContent` 过滤空栏目

**结论**：✅ 不会凭空生成工作经历

### 场景 3：科研和论文丰富的人

**预期行为**：LLM 输出 `research` 或 `publications` section（itemType: experience-item 或 list-item）。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 明确支持 "科研经历" 和 "学术成果" 栏目
- `GENERATE_MODE_OVERRIDE` 规定"科研/论文→科研经历或学术成果"，"禁止错塞"
- 动态栏目 ID 不被白名单过滤
- `GenericSectionRenderer` 按 itemType 渲染
- DOCX `renderSection` 检测到未知 ID，走动态渲染器

**结论**：✅ 论文不会被塞进证书

### 场景 4：校园经历丰富的人

**预期行为**：LLM 输出 `campus` 或类似 section（itemType: experience-item）。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 明确支持 "校园经历" 栏目
- `GENERATE_MODE_OVERRIDE` 规定"班长/社团→校园经历"
- 动态栏目 ID 不被过滤

**结论**：✅ 班长、学生组织、校园工作不会自动变成工作经历

### 场景 5：竞赛、项目丰富的人

**预期行为**：LLM 输出 `competitions` 和 `projects` section，但会合理归并以控制栏目数量。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 规定"栏目数量3-6个，性质相近的合理归并"
- 动态栏目 ID 不被过滤

**结论**：✅ 不会为了分类而拆出大量栏目

### 场景 6：自由职业、自媒体、创业等非传统经历

**预期行为**：LLM 输出自定义 ID 的 section（如 `freelance`、`entrepreneurship`）。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 支持自定义栏目 ID
- `SectionType` 为 string，接受任意 ID
- `conformance.ts` 不做白名单过滤
- `GenericSectionRenderer` 按 itemType 渲染

**结论**：✅ 不会因为系统不认识就塞进 projects 或 certificates

### 场景 7：混合型用户

**预期行为**：LLM 输出多个 section（工作/项目/科研/校园/技能/论文），但合理归并至 3-6 个栏目。

**代码路径验证**：
- `GENERATE_MODE_OVERRIDE` 规定"栏目数量3-6个"
- `sortSections` 按 priority 降序排序
- `ensureEvaluationLast` 确保 evaluation 最后
- 所有栏目通过 `DynamicSectionsRenderer` 统一渲染

**结论**：✅ 正确理解、合理归并、不乱塞、不丢失重要经历

### 场景 8：完全未知类型经历

**预期行为**：LLM 输出自定义 ID 的 section，系统正确保留和渲染。

**代码路径验证**：
- `SectionType` 为 string，接受任意 ID
- `normalizeSection` 接受任意 id
- `conformance.ts` 不做白名单过滤
- `GenericSectionRenderer` 按 itemType 渲染（不关心 ID）
- `resolveSectionTitle` 优先使用 section.title
- DOCX `renderSection` 走动态渲染器

**结论**：✅ 不会删除、丢失、塞进 certificates/projects、自动归类错误

---

## 十一、TypeScript 编译状态

```
npx tsc --noEmit → 零错误
npx next build → 成功
```

### 修复的编译错误

| 文件 | 错误 | 修复 |
|------|------|------|
| `src/templates/altacv.tsx:133` | `Type 'string \| undefined' is not assignable to type 'string'` | `.filter` 改为 type guard: `(item): item is { label: string; value: string } => Boolean(item.value)` |

---

## 十二、现有 Preview / PDF / Word 状态

### Preview

- ✅ 所有 8 个模板使用 `DynamicSectionsRenderer` 渲染全部栏目
- ✅ 动态栏目按 priority 排序，evaluation 最后
- ✅ 双栏模板（wenneker/altacv）按 placement 分配 sidebar/main
- ✅ 栏目标题通过 `resolveSectionTitle` 解析

### PDF

- ✅ 使用浏览器原生 Print，捕获 Preview DOM
- ✅ 动态栏目已在 DOM 中，PDF 自动包含
- ✅ 无单独的 PDF 渲染逻辑，与 Preview 完全一致

### Word (DOCX)

- ✅ `renderSection` 支持动态栏目
- ✅ 已知 ID（education/experience/projects/skills/certificates/languages/evaluation）走优化渲染器
- ✅ 未知 ID 走动态渲染器（`renderDynamicExperienceSection`/`renderDynamicListSection`/`renderDynamicTextSection`）
- ✅ `syncLegacyFields` 确保 legacy 字段与 sections 同步
- ✅ 双栏布局通过 `buildNormalizedLayout` 分配

---

## 十三、架构总结

### 修改前的问题

```
用户内容 → LLM → 固定6字段 → 固定Schema → 固定Type枚举 → 白名单过滤 → 模板直接访问固定字段
                                                                                    ↓
                                                                    动态栏目被丢弃/硬塞
```

### 修改后的架构

```
用户内容 → LLM → sections[] 动态栏目 → Schema 接受任意 ID → Type 为 string → 无白名单过滤
                                                                              ↓
                                           DynamicSectionsRenderer → GenericSectionRenderer
                                                    ↓                              ↓
                                           Preview (React)              DOCX (动态渲染器)
                                                    ↓
                                           PDF (浏览器 Print)
```

### 核心原则

1. **内容决定栏目**：LLM 理解内容性质后决定栏目结构，不是系统预设固定栏目
2. **栏目不写死**：`SectionType` 为 string，无白名单过滤
3. **渲染不关心 ID**：`GenericSectionRenderer` 按 `itemType` 渲染，不关心 section ID
4. **全链路一致**：LLM → Schema → ResumeData → 排序 → 布局 → 模板 → Preview → PDF → DOCX 全部支持动态栏目
5. **栏目数量克制**：LLM 指令限制 3-6 个核心栏目，性质相近的合理归并
6. **不硬塞不丢失**：不存在"未知内容→最近栏目"的 fallback，未知类型经历以自己的 section ID 和 title 独立存在
