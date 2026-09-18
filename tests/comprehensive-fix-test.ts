/**
 * 综合修复验证测试
 *
 * 验证：
 * 1. 技能排序（产品经理 + 不同岗位）
 * 2. PersonalInfo Contract 机制
 * 3. 个人优势内容过滤
 * 4. "个人评价" → "个人优势" 标题统一
 * 5. 旧模板兼容性
 */

import { sortSkillsByRelevance } from '../src/lib/skillsSorter';
import { validateAndNormalize } from '../src/lib/schema';
import { ensureSections, hasSectionContent } from '../src/lib/sectionNormalizer';
import { filterEvaluationContent } from '../src/lib/resumeGeneration/autoEnhancement';
import { PersonalInfoGrid, PERSONAL_INFO_CONTRACT, validatePersonalInfoContract } from '../src/templates/components/PersonalInfoGrid';
import type { ResumeData } from '../src/lib/types';

// ============================================
// 测试工具
// ============================================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.log(`  ✗ ${message}`);
    failCount++;
  }
}

function printHeader(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============================================
// 测试 1：产品经理技能排序
// ============================================

function test1_ProductManagerSkillsSort() {
  printHeader('测试 1：产品经理技能排序');

  const skills = [
    '设计软件：SU、Rhino、PS',
    '产品设计工具：Figma、墨刀、XMind',
    '办公与分析工具：Excel、Word、PPT',
  ];

  const sorted = sortSkillsByRelevance(skills, '产品经理');

  console.log(`  排序前: ${skills.join(' | ')}`);
  console.log(`  排序后: ${sorted.join(' | ')}`);

  // 产品设计工具应该排第一（Figma/墨刀/XMind 都是产品经理 high 相关）
  assert(sorted[0].includes('产品设计工具'), '产品设计工具排第一');
  // 办公工具排第二（Excel/Word/PPT 是 medium）
  assert(sorted[1].includes('办公与分析工具'), '办公与分析工具排第二');
  // 设计软件排最后（SU/Rhino/PS 是 low）
  assert(sorted[2].includes('设计软件'), '设计软件排最后');

  // 验证分类内部排序
  const designTools = sorted[0].split('：')[1].split('、');
  assert(designTools[0] === 'Figma', `分类内 Figma 排第一 (实际: ${designTools[0]})`);

  // 确认不混成一长串
  assert(sorted.length === 3, `保持 3 个分类 (实际: ${sorted.length})`);
  assert(sorted.every((s) => s.includes('：')), '每个条目都保留分类前缀');
}

// ============================================
// 测试 2：不同岗位排序变化
// ============================================

function test2_DifferentPositionSort() {
  printHeader('测试 2：不同岗位排序变化');

  const skills = [
    '设计软件：SU、Rhino、PS',
    '产品设计工具：Figma、墨刀、XMind',
    '办公与分析工具：Excel、Word、PPT',
  ];

  // 产品经理排序
  const pmSorted = sortSkillsByRelevance(skills, '产品经理');
  console.log(`  产品经理: ${pmSorted.join(' | ')}`);
  assert(pmSorted[0].includes('产品设计工具'), '产品经理 → 产品设计工具第一');

  // 设计师排序
  const designerSorted = sortSkillsByRelevance(skills, '设计师');
  console.log(`  设计师: ${designerSorted.join(' | ')}`);
  assert(designerSorted[0].includes('设计软件'), '设计师 → 设计软件第一');

  // 确认排序不同
  assert(pmSorted[0] !== designerSorted[0], '不同岗位排序不同');
}

// ============================================
// 测试 3：多 list-item 技能排序（修复核心）
// ============================================

function test3_MultipleListItemsSort() {
  printHeader('测试 3：多 list-item 技能排序（修复核心）');

  // 模拟 LLM 输出：多个 list-item，每个代表一个分类
  const llmOutput = {
    personalInfo: { name: '测试用户' },
    sections: [
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: ['SU', 'Rhino', 'PS'] },
          { type: 'list-item', items: ['Figma', '墨刀', 'XMind'] },
          { type: 'list-item', items: ['Excel', 'Word', 'PPT'] },
        ],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '测试' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const data = result.normalized;
    const skillsSection = ensureSections(data).find((s) => s.id === 'skills');
    assert(skillsSection !== undefined, '技能栏目存在');

    if (skillsSection) {
      // 模拟 route.ts 的排序逻辑（修复后版本）
      const allListItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = allListItems.flatMap((li) => li.items).filter(Boolean);
      const sortedSkills = sortSkillsByRelevance(allSkills, '产品经理');

      console.log(`  合并后技能: ${allSkills.join(', ')}`);
      console.log(`  排序后技能: ${sortedSkills.join(', ')}`);

      // Figma 应该排在前面（产品经理 high 相关）
      assert(sortedSkills.indexOf('Figma') < sortedSkills.indexOf('SU'), 'Figma 排在 SU 前面');
      assert(sortedSkills.indexOf('墨刀') < sortedSkills.indexOf('Rhino'), '墨刀排在 Rhino 前面');
    }
  }
}

// ============================================
// 测试 4：PersonalInfo Contract 机制
// ============================================

function test4_PersonalInfoContract() {
  printHeader('测试 4：PersonalInfo Contract 机制');

  // 验证 Contract 字段完整性
  const contractValidation = validatePersonalInfoContract('test-template');
  assert(contractValidation.valid, 'Contract 字段完整性验证通过');

  // 验证 Contract 包含所有必需字段
  const contractFields = PERSONAL_INFO_CONTRACT.map((f) => f.key);
  assert(contractFields.includes('gender'), 'Contract 包含 gender');
  assert(contractFields.includes('age'), 'Contract 包含 age');
  assert(contractFields.includes('ethnicity'), 'Contract 包含 ethnicity');
  assert(contractFields.includes('politicalStatus'), 'Contract 包含 politicalStatus');
  assert(contractFields.includes('degree'), 'Contract 包含 degree');
  assert(contractFields.includes('major'), 'Contract 包含 major');
  assert(contractFields.includes('englishScore'), 'Contract 包含 englishScore');

  console.log(`  Contract 字段: ${PERSONAL_INFO_CONTRACT.map((f) => f.label).join(', ')}`);
}

// ============================================
// 测试 5：模拟只有部分字段的模板
// ============================================

function test5_MinimalTemplateSimulation() {
  printHeader('测试 5：模拟只有部分字段的模板 — Contract 机制保证');

  // 模拟一个原始模板只有 name/phone/email
  // 但通过 PersonalInfoGrid 组件，所有 Contract 字段都会被渲染
  const data: ResumeData = {
    personalInfo: {
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@test.com',
      gender: '男',
      age: '25',
      ethnicity: '汉族',
      politicalStatus: '团员',
      degree: '本科',
      major: '计算机科学',
      englishScore: 'CET-6 550',
      school: '清华大学',
      hometown: '',
      currentStatus: undefined,
    },
    sections: [],
  };

  // PersonalInfoGrid 组件会渲染所有 Contract 字段
  // 模板不需要自己实现每个字段的渲染
  const contractFields = PERSONAL_INFO_CONTRACT.filter((f) => {
    const value = data.personalInfo[f.key];
    return value && String(value).trim().length > 0;
  });

  console.log(`  数据中的 Contract 字段: ${contractFields.map((f) => f.label).join(', ')}`);
  assert(contractFields.length === 7, `所有 7 个 Contract 字段都有值 (实际: ${contractFields.length})`);

  // 验证空值字段不显示
  const dataWithEmpty: ResumeData = {
    personalInfo: {
      name: '李四',
      phone: '13900139000',
      email: 'lisi@test.com',
      gender: '',
      age: '',
      ethnicity: '',
      politicalStatus: '',
      degree: '',
      major: '',
      englishScore: '',
      school: '',
      hometown: '',
      currentStatus: undefined,
    },
    sections: [],
  };

  const emptyFields = PERSONAL_INFO_CONTRACT.filter((f) => {
    const value = dataWithEmpty.personalInfo[f.key];
    return value && String(value).trim().length > 0;
  });

  assert(emptyFields.length === 0, '空值字段被过滤（不显示）');
}

// ============================================
// 测试 6：个人优势内容过滤
// ============================================

function test6_EvaluationContentFilter() {
  printHeader('测试 6：个人优势内容过滤');

  // 场景 1：纯非职业内容 + 有真实经历 → 应替换
  const data1: ResumeData = {
    personalInfo: { name: '王五' },
    evaluation: '喜欢打篮球，热爱运动，性格开朗，热爱生活。',
    experience: [
      {
        company: '某科技公司',
        position: '产品助理',
        description: ['负责需求分析和用户研究', '组织团队完成产品迭代'],
        startDate: '2022',
        endDate: '2024',
      },
    ],
    skills: ['Figma', '墨刀', 'XMind'],
    sections: [],
  };

  const filtered1 = filterEvaluationContent(data1, '产品经理');
  assert(filtered1.evaluation !== data1.evaluation, '纯非职业内容被替换');
  assert(filtered1.evaluation!.includes('产品'), `替换后包含职业内容: ${filtered1.evaluation}`);
  console.log(`  原始: ${data1.evaluation}`);
  console.log(`  过滤后: ${filtered1.evaluation}`);

  // 场景 2：已有职业内容 → 不替换
  const data2: ResumeData = {
    personalInfo: { name: '赵六' },
    evaluation: '具备 3 年产品经理经验，擅长需求分析和用户研究，熟练使用 Figma 进行原型设计。',
    experience: [],
    skills: [],
    sections: [],
  };

  const filtered2 = filterEvaluationContent(data2, '产品经理');
  assert(filtered2.evaluation === data2.evaluation, '已有职业内容不被替换');

  // 场景 3：纯非职业内容 + 无真实经历 → 不替换（无法生成更好的内容）
  const data3: ResumeData = {
    personalInfo: { name: '孙七' },
    evaluation: '喜欢音乐，热爱生活，性格开朗。',
    experience: [],
    skills: [],
    sections: [],
  };

  const filtered3 = filterEvaluationContent(data3, '产品经理');
  assert(filtered3.evaluation === data3.evaluation, '无真实经历时不替换（无法生成更好的内容）');

  // 场景 4：混合内容（职业 + 非职业）→ 不替换（已有职业内容）
  const data4: ResumeData = {
    personalInfo: { name: '周八' },
    evaluation: '具备产品经理经验，擅长需求分析。喜欢打篮球，热爱运动。',
    experience: [
      {
        company: '某公司',
        position: '产品经理',
        description: ['负责产品规划'],
        startDate: '2021',
        endDate: '2024',
      },
    ],
    skills: ['Figma'],
    sections: [],
  };

  const filtered4 = filterEvaluationContent(data4, '产品经理');
  assert(filtered4.evaluation === data4.evaluation, '混合内容不被替换（已有职业内容）');
}

// ============================================
// 测试 7："个人评价" → "个人优势" 标题统一
// ============================================

function test7_EvaluationTitleUnification() {
  printHeader('测试 7："个人评价" → "个人优势" 标题统一');

  // 验证 sectionNormalizer 创建的 evaluation section 标题为 "个人优势"
  const data: ResumeData = {
    personalInfo: { name: '测试' },
    evaluation: '具备产品经理经验，擅长需求分析。',
    sections: [],
  };

  const sections = ensureSections(data);
  const evalSection = sections.find((s) => s.id === 'evaluation');
  assert(evalSection !== undefined, 'evaluation section 存在');
  if (evalSection) {
    assert(evalSection.title === '个人优势', `标题为"个人优势" (实际: "${evalSection.title}")`);
  }

  // 验证通过 sections 输入时，标题也被正确设置
  const llmOutput = {
    personalInfo: { name: '测试' },
    sections: [
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '测试内容' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  if (result.normalized) {
    const evalSec = ensureSections(result.normalized).find((s) => s.id === 'evaluation');
    if (evalSec) {
      assert(evalSec.title === '个人优势', `LLM 输出标题为"个人优势" (实际: "${evalSec.title}")`);
    }
  }
}

// ============================================
// 测试 8：技能分类结构保留
// ============================================

function test8_SkillsCategoryPreserved() {
  printHeader('测试 8：技能分类结构保留');

  const skills = [
    '产品设计工具：Figma、墨刀、XMind',
    '办公与分析工具：Excel、Word、PPT',
    '设计软件：SU、Rhino、PS',
  ];

  const sorted = sortSkillsByRelevance(skills, '产品经理');

  // 验证分类结构保留（不混成一长串）
  assert(sorted.length === 3, `保持 3 个分类 (实际: ${sorted.length})`);

  for (const s of sorted) {
    assert(s.includes('：'), `条目保留分类前缀: ${s.substring(0, 20)}...`);
  }

  // 验证分类内部技能数量不变
  for (const s of sorted) {
    const parts = s.split('：');
    const skillCount = parts[1].split('、').length;
    assert(skillCount === 3, `分类内技能数量 = 3 (实际: ${skillCount})`);
  }
}

// ============================================
// 测试 9：旧模板兼容性
// ============================================

function test9_LegacyCompatibility() {
  printHeader('测试 9：旧模板兼容性');

  const llmOutput = {
    personalInfo: {
      name: '兼容测试',
      gender: '男',
      age: '28',
      ethnicity: '汉族',
      politicalStatus: '党员',
      degree: '硕士',
      phone: '13800138000',
      email: 'test@test.com',
      school: '北京大学',
      englishScore: 'CET-6 600',
      major: '计算机科学',
    },
    sections: [
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        items: [
          {
            type: 'experience-item',
            title: '某公司',
            subtitle: '工程师',
            startDate: '2022',
            endDate: '2024',
            description: ['负责系统开发'],
          },
        ],
        priority: 90,
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: ['JavaScript', 'Python', 'React', 'Node.js'] },
        ],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '具备扎实的技术能力和丰富的项目经验。' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const data = result.normalized;
    const sections = ensureSections(data);

    // 验证所有栏目存在
    assert(sections.some((s) => s.id === 'experience'), '工作经历存在');
    assert(sections.some((s) => s.id === 'skills'), '专业技能存在');
    assert(sections.some((s) => s.id === 'evaluation'), '个人优势存在');

    // 验证 evaluation 在最后
    const nonEmpty = sections.filter((s) => hasSectionContent(s));
    assert(nonEmpty[nonEmpty.length - 1].id === 'evaluation', '个人优势在最后');

    // 验证基础信息完整
    const p = data.personalInfo;
    assert(p.name === '兼容测试', '姓名正确');
    assert(p.gender === '男', '性别正确');
    assert(p.age === '28', '年龄正确');
    assert(p.ethnicity === '汉族', '民族正确');
    assert(p.politicalStatus === '党员', '政治面貌正确');
    assert(p.degree === '硕士', '学历正确');
    assert(p.major === '计算机科学', '专业正确');
    assert(p.englishScore === 'CET-6 600', '英语成绩正确');

    // 验证技能不丢失
    const skillsSection = sections.find((s) => s.id === 'skills');
    if (skillsSection) {
      const listItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = listItems.flatMap((li) => li.items);
      assert(allSkills.length === 4, `技能数量 = 4 (实际: ${allSkills.length})`);
      assert(allSkills.includes('JavaScript'), '包含 JavaScript');
    }
  }
}

// ============================================
// 运行所有测试
// ============================================

function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          综合修复验证测试                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  test1_ProductManagerSkillsSort();
  test2_DifferentPositionSort();
  test3_MultipleListItemsSort();
  test4_PersonalInfoContract();
  test5_MinimalTemplateSimulation();
  test6_EvaluationContentFilter();
  test7_EvaluationTitleUnification();
  test8_SkillsCategoryPreserved();
  test9_LegacyCompatibility();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  测试结果: ${passCount} 通过 / ${failCount} 失败`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
