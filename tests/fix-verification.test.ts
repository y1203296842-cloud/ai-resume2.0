/**
 * 修复验证测试脚本
 *
 * 验证 3 类问题的修复：
 * 1. 专业技能栏目不消失
 * 2. 子标题/内容分组不被删除
 * 3. 基础信息 Contract 完整性（数据层验证）
 */

import { validateAndNormalize } from '../src/lib/schema';
import { hasSectionContent, ensureSections, syncLegacyFields } from '../src/lib/sectionNormalizer';
import { cleanResumeData } from '../src/lib/resumeCleanup';
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

function assertSectionExists(data: ResumeData, sectionId: string, message: string) {
  const sections = ensureSections(data);
  const section = sections.find((s) => s.id === sectionId);
  assert(section !== undefined, `${message} (section "${sectionId}" 存在)`);
  if (section) {
    assert(hasSectionContent(section), `${message} (section "${sectionId}" 有内容)`);
  }
}

function assertSectionNotExists(data: ResumeData, sectionId: string, message: string) {
  const sections = ensureSections(data);
  const section = sections.find((s) => s.id === sectionId);
  assert(!section || !hasSectionContent(section), `${message} (section "${sectionId}" 不存在或为空)`);
}

function printHeader(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============================================
// 测试 1：大量技能 — 专业技能栏目不消失
// ============================================

function test1_LargeSkillsList() {
  printHeader('测试 1：大量技能 — 专业技能栏目不消失');

  // 模拟 LLM 输出：技能作为 list-item
  const llmOutput1 = {
    personalInfo: { name: '张三', phone: '13800138000', email: 'zhangsan@test.com' },
    sections: [
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: ['Figma', '墨刀', 'XMind', 'CAD', 'Rhino', 'SU', 'Excel', 'Word', 'PS'] },
        ],
        priority: 70,
        placement: 'sidebar',
      },
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        items: [
          { type: 'experience-item', title: '某大学', subtitle: '工业设计', startDate: '2020', endDate: '2024', description: ['GPA 3.8'] },
        ],
        priority: 50,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '热爱设计，精通多种工具' }],
        priority: 10,
      },
    ],
  };

  const result1 = validateAndNormalize(llmOutput1);
  assert(result1.valid, 'Schema 验证通过');
  assert(result1.normalized !== null, '标准化数据不为 null');

  if (result1.normalized) {
    const data = result1.normalized;
    assertSectionExists(data, 'skills', '专业技能栏目存在');

    // 验证技能内容
    const skillsSection = ensureSections(data).find((s) => s.id === 'skills');
    if (skillsSection) {
      const listItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = listItems.flatMap((li) => li.items);
      assert(allSkills.length >= 9, `技能数量 >= 9 (实际: ${allSkills.length})`);
      assert(allSkills.includes('Figma'), '包含 Figma');
      assert(allSkills.includes('墨刀'), '包含 墨刀');
      assert(allSkills.includes('XMind'), '包含 XMind');
      assert(allSkills.includes('CAD'), '包含 CAD');
      assert(allSkills.includes('Rhino'), '包含 Rhino');
      assert(allSkills.includes('PS'), '包含 PS');
    }

    // 验证 legacy skills 同步
    assert(!!(data.skills && data.skills.length >= 9), `legacy skills 同步 (长度: ${data.skills?.length})`);
  }

  // 模拟 LLM 输出：技能作为原始字符串数组
  const llmOutput2 = {
    personalInfo: { name: '李四' },
    sections: [
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: ['Figma', '墨刀', 'XMind', 'CAD', 'Rhino', 'PS', 'Excel', 'Word', 'Python', 'SPSS'],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '测试' }],
        priority: 10,
      },
    ],
  };

  const result2 = validateAndNormalize(llmOutput2);
  assert(result2.valid, '原始字符串技能 Schema 验证通过');

  if (result2.normalized) {
    const data = result2.normalized;
    assertSectionExists(data, 'skills', '原始字符串技能栏目存在');

    const skillsSection = ensureSections(data).find((s) => s.id === 'skills');
    if (skillsSection) {
      const listItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = listItems.flatMap((li) => li.items);
      assert(allSkills.length >= 10, `原始字符串技能数量 >= 10 (实际: ${allSkills.length})`);
      assert(allSkills.includes('Figma'), '原始字符串包含 Figma');
      assert(allSkills.includes('SPSS'), '原始字符串包含 SPSS');
    }
  }

  // 模拟 LLM 输出：技能作为逗号分隔字符串
  const llmOutput3 = {
    personalInfo: { name: '王五' },
    sections: [
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: 'Figma、墨刀、XMind、CAD、Rhino、PS、Excel、Word、Python、SPSS' },
        ],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '测试' }],
        priority: 10,
      },
    ],
  };

  const result3 = validateAndNormalize(llmOutput3);
  assert(result3.valid, '逗号分隔字符串技能 Schema 验证通过');

  if (result3.normalized) {
    const data = result3.normalized;
    assertSectionExists(data, 'skills', '逗号分隔字符串技能栏目存在');

    const skillsSection = ensureSections(data).find((s) => s.id === 'skills');
    if (skillsSection) {
      const listItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = listItems.flatMap((li) => li.items);
      assert(allSkills.length >= 10, `逗号分隔技能数量 >= 10 (实际: ${allSkills.length})`);
    }
  }
}

// ============================================
// 测试 2：没有技能 — 不强制生成专业技能栏目
// ============================================

function test2_NoSkills() {
  printHeader('测试 2：没有技能 — 不强制生成专业技能栏目');

  const llmOutput = {
    personalInfo: { name: '赵六', phone: '13900139000' },
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        items: [
          { type: 'experience-item', title: '某大学', subtitle: '计算机科学', startDate: '2020', endDate: '2024', description: ['GPA 3.9'] },
        ],
        priority: 50,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '积极向上' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    assertSectionNotExists(result.normalized, 'skills', '无技能时不生成专业技能栏目');
  }
}

// ============================================
// 测试 3：科研经历 — 子标题保留
// ============================================

function test3_ResearchWithSubtitles() {
  printHeader('测试 3：科研经历 — 子标题保留');

  // 模拟 LLM 输出：科研经历包含混合类型条目
  // experience-item 作为子标题（研究方向、论文成果、科研项目）
  const llmOutput = {
    personalInfo: { name: '钱七', school: '清华大学', major: '计算机科学' },
    sections: [
      {
        id: 'research',
        title: '科研经历',
        itemType: 'experience-item',
        items: [
          {
            type: 'experience-item',
            title: '研究方向',
            description: ['深度学习与自然语言处理', '大语言模型对齐技术研究'],
          },
          {
            type: 'experience-item',
            title: '论文成果',
            subtitle: 'ACL 2024',
            description: ['发表了关于 LLM 对齐的论文', '提出了新的 RLHF 优化方法'],
          },
          {
            type: 'experience-item',
            title: '科研项目',
            subtitle: '国家自然科学基金',
            startDate: '2023.01',
            endDate: '2024.06',
            description: ['参与国家级科研项目', '负责模型训练与评估'],
          },
        ],
        priority: 85,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '科研能力强' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const data = result.normalized;
    const sections = ensureSections(data);
    const researchSection = sections.find((s) => s.id === 'research');
    assert(researchSection !== undefined, '科研经历栏目存在');

    if (researchSection) {
      assert(hasSectionContent(researchSection), '科研经历栏目有内容');

      // 验证三个子标题都存在
      const expItems = researchSection.items.filter((i) => i.type === 'experience-item');
      assert(expItems.length === 3, `子标题数量 = 3 (实际: ${expItems.length})`);

      const titles = expItems.map((i) => (i as { title: string }).title);
      assert(titles.includes('研究方向'), '包含"研究方向"子标题');
      assert(titles.includes('论文成果'), '包含"论文成果"子标题');
      assert(titles.includes('科研项目'), '包含"科研项目"子标题');

      // 验证每个子标题的描述不为空
      const researchDir = expItems.find((i) => (i as { title: string }).title === '研究方向') as { description: string[] };
      const papers = expItems.find((i) => (i as { title: string }).title === '论文成果') as { description: string[] };
      const projects = expItems.find((i) => (i as { title: string }).title === '科研项目') as { description: string[] };

      assert(researchDir && researchDir.description.length > 0, '研究方向有描述');
      assert(papers && papers.description.length > 0, '论文成果有描述');
      assert(projects && projects.description.length > 0, '科研项目有描述');
    }
  }
}

// ============================================
// 测试 4：复杂校园经历 — 子标题动态生成
// ============================================

function test4_ComplexCampusExperience() {
  printHeader('测试 4：复杂校园经历 — 子标题动态生成');

  const llmOutput = {
    personalInfo: { name: '孙八', school: '北京大学' },
    sections: [
      {
        id: 'campus',
        title: '校园经历',
        itemType: 'experience-item',
        items: [
          {
            type: 'experience-item',
            title: '学生会主席',
            subtitle: '校学生会',
            startDate: '2022.09',
            endDate: '2023.06',
            description: ['组织校园文化活动', '管理 200+ 成员团队'],
          },
          {
            type: 'experience-item',
            title: '志愿服务',
            subtitle: '山区支教',
            startDate: '2023.07',
            endDate: '2023.08',
            description: ['为期一个月的山区支教', '教授数学和英语课程'],
          },
          {
            type: 'experience-item',
            title: '校园项目',
            subtitle: '创新创业大赛',
            description: ['开发校园二手交易平台', '获得校级一等奖'],
          },
        ],
        priority: 75,
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [{ type: 'list-item', items: ['Python', 'Java', 'React', 'MySQL'] }],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '全面发展' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const data = result.normalized;
    const sections = ensureSections(data);

    // 验证校园经历栏目存在且有子标题
    const campusSection = sections.find((s) => s.id === 'campus');
    assert(campusSection !== undefined, '校园经历栏目存在');

    if (campusSection) {
      const expItems = campusSection.items.filter((i) => i.type === 'experience-item');
      assert(expItems.length === 3, `子标题数量 = 3 (实际: ${expItems.length})`);

      const titles = expItems.map((i) => (i as { title: string }).title);
      assert(titles.includes('学生会主席'), '包含"学生会主席"');
      assert(titles.includes('志愿服务'), '包含"志愿服务"');
      assert(titles.includes('校园项目'), '包含"校园项目"');
    }

    // 验证技能栏目也同时存在（不被其他栏目影响）
    assertSectionExists(data, 'skills', '技能栏目同时存在');

    // 验证一级栏目数量合理（不超过 6 个）
    const nonEmptySections = sections.filter((s) => hasSectionContent(s));
    assert(nonEmptySections.length <= 6, `一级栏目数量 <= 6 (实际: ${nonEmptySections.length})`);
  }
}

// ============================================
// 测试 5：科技职场模板 — 基础信息完整（数据层）
// ============================================

function test5_TechResumeBasicInfo() {
  printHeader('测试 5：科技职场模板 — 基础信息完整（数据层）');

  const llmOutput = {
    personalInfo: {
      name: '测试用户',
      gender: '男',
      ethnicity: '汉族',
      politicalStatus: '共青团员',
      degree: '本科',
      phone: '13800138000',
      email: 'test@test.com',
      school: '清华大学',
      englishScore: 'CET-6 580',
      major: '计算机科学',
      age: '24',
    },
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        items: [
          { type: 'experience-item', title: '清华大学', subtitle: '计算机科学', startDate: '2020', endDate: '2024', description: ['GPA 3.9'] },
        ],
        priority: 50,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '技术能力强' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const p = result.normalized.personalInfo;
    assert(p.name === '测试用户', `姓名: ${p.name}`);
    assert(p.gender === '男', `性别: ${p.gender}`);
    assert(p.ethnicity === '汉族', `民族: ${p.ethnicity}`);
    assert(p.politicalStatus === '共青团员', `政治面貌: ${p.politicalStatus}`);
    assert(p.degree === '本科', `学历: ${p.degree}`);
    assert(p.phone === '13800138000', `电话: ${p.phone}`);
    assert(p.email === 'test@test.com', `邮箱: ${p.email}`);
    assert(p.school === '清华大学', `毕业院校: ${p.school}`);
    assert(p.englishScore === 'CET-6 580', `英语成绩: ${p.englishScore}`);
    assert(p.major === '计算机科学', `专业: ${p.major}`);
    assert(p.age === '24', `年龄: ${p.age}`);
  }
}

// ============================================
// 测试 6：极简职场模板 — 基础信息完整（数据层）
// ============================================

function test6_BasicResumeBasicInfo() {
  printHeader('测试 6：极简职场模板 — 基础信息完整（数据层）');

  // 部分字段为空 — 验证 Contract 保留字段但不强制显示
  const llmOutput = {
    personalInfo: {
      name: '测试用户B',
      gender: '女',
      age: '26',
      degree: '硕士',
      phone: '13900139000',
      email: 'testb@test.com',
      major: '产品设计',
      // ethnicity, politicalStatus, englishScore, school 未提供
    },
    sections: [
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        items: [
          { type: 'experience-item', title: '某公司', subtitle: '产品经理', startDate: '2022', endDate: '2024', description: ['负责产品设计'] },
        ],
        priority: 90,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '经验丰富' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const p = result.normalized.personalInfo;
    assert(p.name === '测试用户B', `姓名: ${p.name}`);
    assert(p.gender === '女', `性别: ${p.gender}`);
    assert(p.age === '26', `年龄: ${p.age}`);
    assert(p.degree === '硕士', `学历: ${p.degree}`);
    assert(p.major === '产品设计', `专业: ${p.major}`);

    // 未提供的字段应该为空字符串，不是 undefined
    assert(p.ethnicity === '', `民族为空字符串 (实际: "${p.ethnicity}")`);
    assert(p.politicalStatus === '', `政治面貌为空字符串 (实际: "${p.politicalStatus}")`);
    assert(p.englishScore === '', `英语成绩为空字符串 (实际: "${p.englishScore}")`);
    assert(p.school === '', `毕业院校为空字符串 (实际: "${p.school}")`);
  }
}

// ============================================
// 测试 7：旧模板兼容性 — 不破坏现有功能
// ============================================

function test7_LegacyTemplateCompatibility() {
  printHeader('测试 7：旧模板兼容性 — 不破坏现有功能');

  // 测试混合类型栏目：一个栏目同时包含 experience-item 和 list-item
  const llmOutput = {
    personalInfo: { name: '兼容测试', school: '某大学', major: '计算机' },
    sections: [
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        items: [
          {
            type: 'experience-item',
            title: '某科技公司',
            subtitle: '前端开发工程师',
            startDate: '2022.01',
            endDate: '2024.06',
            description: ['负责前端架构设计', '优化页面性能'],
            meta: 'React, TypeScript, Webpack',
          },
          // 混合类型：同一个栏目内包含 list-item
          {
            type: 'list-item',
            items: ['额外技能：Vue.js', '额外技能：Angular'],
          },
        ],
        priority: 90,
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js'] },
        ],
        priority: 70,
      },
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        items: [
          { type: 'experience-item', title: '某大学', subtitle: '计算机科学', startDate: '2018', endDate: '2022', description: ['GPA 3.8'] },
        ],
        priority: 50,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '前端技术扎实' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  assert(result.valid, 'Schema 验证通过');

  if (result.normalized) {
    const data = result.normalized;
    const sections = ensureSections(data);

    // 验证所有栏目都存在
    assertSectionExists(data, 'experience', '工作经历栏目存在');
    assertSectionExists(data, 'skills', '专业技能栏目存在');
    assertSectionExists(data, 'education', '教育背景栏目存在');
    assertSectionExists(data, 'evaluation', '个人评价栏目存在');

    // 验证混合类型栏目：experience section 应同时包含 experience-item 和 list-item
    const expSection = sections.find((s) => s.id === 'experience');
    if (expSection) {
      const expItems = expSection.items.filter((i) => i.type === 'experience-item');
      const listItems = expSection.items.filter((i) => i.type === 'list-item');
      assert(expItems.length > 0, `工作经历包含 experience-item (${expItems.length})`);
      assert(listItems.length > 0, `工作经历包含 list-item (${listItems.length})`);
    }

    // 验证 evaluation 在最后
    const nonEmptySections = sections.filter((s) => hasSectionContent(s));
    const lastSection = nonEmptySections[nonEmptySections.length - 1];
    assert(lastSection && lastSection.id === 'evaluation', '个人评价在最后');

    // 验证 legacy 字段同步
    assert(!!(data.experience && data.experience.length > 0), 'legacy experience 同步');
    assert(!!(data.skills && data.skills.length > 0), 'legacy skills 同步');
    assert(!!(data.education && data.education.length > 0), 'legacy education 同步');
    assert(!!(data.evaluation && data.evaluation.length > 0), 'legacy evaluation 同步');
  }

  // 测试占位内容被正确清洗，但真实内容不被误删
  const llmOutputWithPlaceholders = {
    personalInfo: { name: '清洗测试' },
    sections: [
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        items: [
          { type: 'list-item', items: ['Figma', '未提供', '墨刀', '暂无', 'XMind', 'N/A'] },
        ],
        priority: 70,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '真实评价内容' }],
        priority: 10,
      },
    ],
  };

  const cleanResult = validateAndNormalize(llmOutputWithPlaceholders);
  if (cleanResult.normalized) {
    const data = cleanResult.normalized;
    const skillsSection = ensureSections(data).find((s) => s.id === 'skills');
    if (skillsSection) {
      const listItems = skillsSection.items.filter((i) => i.type === 'list-item');
      const allSkills = listItems.flatMap((li) => li.items);
      assert(allSkills.includes('Figma'), '清洗后保留 Figma');
      assert(allSkills.includes('墨刀'), '清洗后保留 墨刀');
      assert(allSkills.includes('XMind'), '清洗后保留 XMind');
      assert(!allSkills.includes('未提供'), '清洗后移除"未提供"');
      assert(!allSkills.includes('暂无'), '清洗后移除"暂无"');
      assert(!allSkills.includes('N/A'), '清洗后移除"N/A"');
      assert(allSkills.length === 3, `清洗后技能数量 = 3 (实际: ${allSkills.length})`);
    }
  }
}

// ============================================
// 测试 8：子标题不被内容清洗误删
// ============================================

function test8_SubtitlesNotCleaned() {
  printHeader('测试 8：子标题不被内容清洗误删');

  // 子标题作为 experience-item 的 title，不应被清洗
  const llmOutput = {
    personalInfo: { name: '子标题测试' },
    sections: [
      {
        id: 'research',
        title: '科研经历',
        itemType: 'experience-item',
        items: [
          {
            type: 'experience-item',
            title: '研究方向',
            description: ['深度学习研究'],
          },
          {
            type: 'experience-item',
            title: '论文成果',
            description: ['发表 ACL 论文'],
          },
          {
            type: 'experience-item',
            title: '科研项目',
            description: ['国家级项目'],
          },
        ],
        priority: 85,
      },
      {
        id: 'evaluation',
        title: '个人评价',
        itemType: 'text-item',
        items: [{ type: 'text-item', content: '科研能力强' }],
        priority: 10,
      },
    ],
  };

  const result = validateAndNormalize(llmOutput);
  if (result.normalized) {
    const data = result.normalized;
    const researchSection = ensureSections(data).find((s) => s.id === 'research');
    assert(researchSection !== undefined, '科研经历栏目存在');

    if (researchSection) {
      const expItems = researchSection.items.filter((i) => i.type === 'experience-item');
      assert(expItems.length === 3, `子标题数量 = 3 (实际: ${expItems.length})`);

      // 验证子标题未被清洗
      const titles = expItems.map((i) => (i as { title: string }).title);
      assert(titles.includes('研究方向'), '"研究方向"子标题未被清洗');
      assert(titles.includes('论文成果'), '"论文成果"子标题未被清洗');
      assert(titles.includes('科研项目'), '"科研项目"子标题未被清洗');

      // 验证描述也未被清洗
      const allDescriptions = expItems.flatMap((i) => (i as { description: string[] }).description);
      assert(allDescriptions.length === 3, `描述数量 = 3 (实际: ${allDescriptions.length})`);
      assert(allDescriptions.includes('深度学习研究'), '"深度学习研究"描述未被清洗');
      assert(allDescriptions.includes('发表 ACL 论文'), '"发表 ACL 论文"描述未被清洗');
      assert(allDescriptions.includes('国家级项目'), '"国家级项目"描述未被清洗');
    }
  }
}

// ============================================
// 运行所有测试
// ============================================

function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          简历系统修复验证测试                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  test1_LargeSkillsList();
  test2_NoSkills();
  test3_ResearchWithSubtitles();
  test4_ComplexCampusExperience();
  test5_TechResumeBasicInfo();
  test6_BasicResumeBasicInfo();
  test7_LegacyTemplateCompatibility();
  test8_SubtitlesNotCleaned();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  测试结果: ${passCount} 通过 / ${failCount} 失败`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
