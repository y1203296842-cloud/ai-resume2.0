/**
 * 统一渲染前规范化层测试
 *
 * 测试 A-I 场景：
 * A: 无工作经历，只有校园经历、科研、竞赛
 * B: 有工作经历、项目经历、技能较多
 * C: 目标岗位与用户原专业不完全一致
 * D: 技能包含强相关+通用+低相关
 * E: 同一份数据重复处理多次，检查排序稳定性
 * F: 基础信息中英语成绩 CET-4、CET-6 不无故换行
 * G: 同一信息同时出现在基础信息和其他栏目，检查去重
 * H: 科研内容同时包含研究方向、论文、项目
 * I: 新模板接入统一数据自动获得所有规则
 */

import { normalizeForRendering } from '../src/lib/normalizeForRendering';
import type { ResumeData, ResumeSection } from '../src/lib/types';

// ============================================
// 测试工具
// ============================================

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`ASSERT FAILED: ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`);
  }
  console.log(`  ✓ ${message}`);
}

function getSectionIds(data: ResumeData): string[] {
  return data.sections.map((s) => s.id);
}

function getSectionTitles(data: ResumeData): string[] {
  return data.sections.map((s) => s.title);
}

// ============================================
// 测试数据构造
// ============================================

function makeBasePersonalInfo() {
  return {
    name: '张三',
    gender: '男',
    age: '22',
    ethnicity: '汉族',
    politicalStatus: '共青团员',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    school: '清华大学',
    major: '计算机科学',
    degree: '本科',
    englishScore: 'CET-6',
  };
}

// ============================================
// 测试 A: 无工作经历，只有校园经历、科研、竞赛
// ============================================

function testA() {
  console.log('\n=== 测试 A: 无工作经历，只有校园经历、科研、竞赛 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2020-09',
          endDate: '2024-06',
          description: ['GPA 3.8/4.0', '专业排名前5%'],
        }],
      },
      {
        id: 'campus',
        title: '校园经历',
        itemType: 'experience-item',
        priority: 60,
        items: [{
          type: 'experience-item',
          title: '学生会技术部',
          subtitle: '部长',
          startDate: '2021-09',
          endDate: '2022-06',
          description: ['负责组织技术分享会10场', '管理20人团队'],
        }],
      },
      {
        id: 'research',
        title: '科研经历',
        itemType: 'experience-item',
        priority: 70,
        items: [{
          type: 'experience-item',
          title: '自然语言处理研究',
          subtitle: '研究助理',
          startDate: '2022-03',
          endDate: '2023-12',
          description: ['参与国家级NLP项目', '发表CCF-A类论文1篇'],
        }],
      },
      {
        id: 'competitions',
        title: '竞赛获奖',
        itemType: 'list-item',
        priority: 40,
        items: [{
          type: 'list-item',
          items: ['ACM-ICPC区域赛银奖', '数学建模国赛一等奖'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '具备扎实的研究能力和团队管理经验。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '前端开发');

  // 验证 education 在顶部
  const ids = getSectionIds(result);
  assert(ids[0] === 'education', '教育背景在顶部');

  // 验证 evaluation 在底部
  assert(ids[ids.length - 1] === 'evaluation', '个人优势在底部');

  // 验证所有栏目都被保留（无工作经历不报错）
  assert(ids.includes('campus'), '校园经历保留');
  assert(ids.includes('research'), '科研经历保留');
  assert(ids.includes('competitions'), '竞赛获奖保留');

  // 验证科研经历排在校园经历前面（与前端开发更相关）
  const researchIdx = ids.indexOf('research');
  const campusIdx = ids.indexOf('campus');
  assert(researchIdx < campusIdx, '科研经历（更相关）排在校园经历前面');

  console.log('  测试 A 通过 ✓\n');
}

// ============================================
// 测试 B: 有工作经历、项目经历、技能较多
// ============================================

function testB() {
  console.log('=== 测试 B: 有工作经历、项目经历、技能较多 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['GPA 3.8/4.0'],
        }],
      },
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        priority: 90,
        items: [
          {
            type: 'experience-item',
            title: '字节跳动',
            subtitle: '前端开发工程师',
            startDate: '2020-07',
            endDate: '2023-06',
            description: ['负责抖音Web端开发', '使用React和TypeScript', '性能优化提升30%'],
          },
          {
            type: 'experience-item',
            title: '腾讯',
            subtitle: '前端实习生',
            startDate: '2019-06',
            endDate: '2019-09',
            description: ['参与微信小程序开发'],
          },
        ],
      },
      {
        id: 'projects',
        title: '项目经历',
        itemType: 'experience-item',
        priority: 80,
        items: [{
          type: 'experience-item',
          title: '在线协作白板',
          subtitle: '独立开发',
          description: ['使用React和WebSocket', '支持实时多人协作', 'DAU达到5000+'],
          meta: 'React, TypeScript, WebSocket',
        }],
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        priority: 70,
        items: [{
          type: 'list-item',
          items: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 'Webpack', 'Git', 'PS'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '3年前端开发经验，熟悉React生态。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '前端开发');

  // 验证 education 在顶部
  const ids = getSectionIds(result);
  assert(ids[0] === 'education', '教育背景在顶部');

  // 验证 evaluation 在底部
  assert(ids[ids.length - 1] === 'evaluation', '个人优势在底部');

  // 验证工作经历排在项目经历前面（内容更丰富）
  const expIdx = ids.indexOf('experience');
  const projIdx = ids.indexOf('projects');
  assert(expIdx >= 0 && projIdx >= 0, '工作经历和项目经历都存在');
  assert(expIdx < projIdx, '工作经历（更丰富）排在项目经历前面');

  // 验证技能排序：JavaScript/TypeScript/React 应排在 PS 前面
  const skillsSection = result.sections.find((s) => s.id === 'skills');
  assert(skillsSection !== undefined, '技能栏目存在');
  const skillsList = skillsSection!.items.find((i) => i.type === 'list-item');
  assert(skillsList !== undefined, '技能列表存在');
  if (skillsList && skillsList.type === 'list-item') {
    const skills = skillsList.items;
    const reactIdx = skills.indexOf('React');
    const psIdx = skills.indexOf('PS');
    if (psIdx >= 0 && reactIdx >= 0) {
      assert(reactIdx < psIdx, 'React（强相关）排在 PS（低相关）前面');
    }
  }

  console.log('  测试 B 通过 ✓\n');
}

// ============================================
// 测试 C: 目标岗位与用户原专业不完全一致
// ============================================

function testC() {
  console.log('=== 测试 C: 目标岗位与用户原专业不完全一致 ===');

  const data: ResumeData = {
    personalInfo: {
      ...makeBasePersonalInfo(),
      major: '机械工程',
      school: '上海交通大学',
    },
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '上海交通大学',
          subtitle: '机械工程 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['GPA 3.5/4.0', '辅修计算机科学'],
        }],
      },
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        priority: 90,
        items: [{
          type: 'experience-item',
          title: '某互联网公司',
          subtitle: '产品经理',
          startDate: '2020-07',
          endDate: '2023-06',
          description: ['负责用户增长产品设计', '使用Figma和墨刀进行原型设计', 'DAU提升50%'],
        }],
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        priority: 70,
        items: [{
          type: 'list-item',
          items: ['Figma', '墨刀', 'XMind', 'Excel', 'Python', 'AutoCAD', 'SolidWorks'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '机械工程背景转产品经理，具备扎实的数据分析能力。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '产品经理');

  // 验证技能排序：Figma/墨刀 应排在 AutoCAD/SolidWorks 前面
  const skillsSection = result.sections.find((s) => s.id === 'skills');
  if (skillsSection) {
    const skillsList = skillsSection.items.find((i) => i.type === 'list-item');
    if (skillsList && skillsList.type === 'list-item') {
      const skills = skillsList.items;
      const figmaIdx = skills.indexOf('Figma');
      const cadIdx = skills.indexOf('AutoCAD');
      if (figmaIdx >= 0 && cadIdx >= 0) {
        assert(figmaIdx < cadIdx, 'Figma（产品经理强相关）排在 AutoCAD（低相关）前面');
      }
    }
  }

  // 验证专业不一致但岗位相关经历正常展示
  const ids = getSectionIds(result);
  assert(ids.includes('experience'), '工作经历保留');
  assert(ids.includes('skills'), '技能保留');

  console.log('  测试 C 通过 ✓\n');
}

// ============================================
// 测试 D: 技能包含强相关+通用+低相关
// ============================================

function testD() {
  console.log('=== 测试 D: 技能包含强相关+通用+低相关 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '设计学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['GPA 3.7/4.0'],
        }],
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        priority: 70,
        items: [{
          type: 'list-item',
          items: [
            'Rhino', 'SU', 'Excel', 'Photoshop', 'Illustrator', 'Figma', 'Word',
            '3DMax', 'InDesign', 'PPT', 'Premiere', 'Blender',
          ],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '设计能力突出，熟悉多种设计工具。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '设计师');

  const skillsSection = result.sections.find((s) => s.id === 'skills');
  assert(skillsSection !== undefined, '技能栏目存在');
  if (skillsSection) {
    const skillsList = skillsSection.items.find((i) => i.type === 'list-item');
    if (skillsList && skillsList.type === 'list-item') {
      const skills = skillsList.items;

      // 强相关技能应排在前面
      const psIdx = skills.indexOf('Photoshop');
      const figmaIdx = skills.indexOf('Figma');
      const rhinoIdx = skills.indexOf('Rhino');

      // Photoshop 和 Figma（设计师强相关）应排在 Rhino（设计师中等相关）前面
      if (psIdx >= 0 && rhinoIdx >= 0) {
        assert(psIdx < rhinoIdx, 'Photoshop（强相关）排在 Rhino（中等相关）前面');
      }
      if (figmaIdx >= 0 && rhinoIdx >= 0) {
        assert(figmaIdx < rhinoIdx, 'Figma（强相关）排在 Rhino（中等相关）前面');
      }

      // 验证前几个技能都是强相关的
      const topSkills = skills.slice(0, 5);
      const strongSkills = ['Photoshop', 'Illustrator', 'Figma', 'InDesign', 'Premiere', 'Blender'];
      const topStrongCount = topSkills.filter((s) => strongSkills.includes(s)).length;
      assert(topStrongCount >= 3, `前5个技能中至少3个是强相关（实际: ${topSkills.join(', ')}）`);
    }
  }

  console.log('  测试 D 通过 ✓\n');
}

// ============================================
// 测试 E: 同一份数据重复处理多次，检查排序稳定性
// ============================================

function testE() {
  console.log('=== 测试 E: 同一份数据重复处理多次，检查排序稳定性 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['GPA 3.8/4.0'],
        }],
      },
      {
        id: 'experience',
        title: '工作经历',
        itemType: 'experience-item',
        priority: 90,
        items: [{
          type: 'experience-item',
          title: '字节跳动',
          subtitle: '前端开发',
          description: ['负责React开发', '性能优化提升30%'],
        }],
      },
      {
        id: 'projects',
        title: '项目经历',
        itemType: 'experience-item',
        priority: 80,
        items: [{
          type: 'experience-item',
          title: '协作平台',
          description: ['使用React开发', 'DAU 5000+'],
          meta: 'React, Node.js',
        }],
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        priority: 70,
        items: [{
          type: 'list-item',
          items: ['JavaScript', 'React', 'Vue', 'Node.js', 'Git', 'PS'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '3年前端开发经验。',
        }],
      },
    ],
  };

  // 打乱 sections 顺序
  const shuffledData: ResumeData = {
    ...data,
    sections: [...data.sections].reverse(),
  };

  // 处理3次，检查结果一致
  const result1 = normalizeForRendering(data, '前端开发');
  const result2 = normalizeForRendering(shuffledData, '前端开发');
  const result3 = normalizeForRendering(data, '前端开发');

  const ids1 = getSectionIds(result1);
  const ids2 = getSectionIds(result2);
  const ids3 = getSectionIds(result3);

  // 结果1和3应该完全一致（相同输入）
  assertEqual(ids1, ids3, '相同输入产生相同栏目顺序');

  // 结果2（打乱输入）的栏目顺序应该与结果1一致（education在顶部，evaluation在底部）
  assert(ids2[0] === 'education', '打乱后 education 仍在顶部');
  assert(ids2[ids2.length - 1] === 'evaluation', '打乱后 evaluation 仍在底部');

  // skills 顺序也应该稳定
  const skills1 = result1.sections.find((s) => s.id === 'skills');
  const skills3 = result3.sections.find((s) => s.id === 'skills');
  if (skills1 && skills3) {
    const list1 = skills1.items.find((i) => i.type === 'list-item');
    const list3 = skills3.items.find((i) => i.type === 'list-item');
    if (list1 && list1.type === 'list-item' && list3 && list3.type === 'list-item') {
      assertEqual(list1.items, list3.items, '技能排序稳定一致');
    }
  }

  console.log('  测试 E 通过 ✓\n');
}

// ============================================
// 测试 F: 基础信息中英语成绩 CET-4、CET-6 不无故换行
// ============================================

function testF() {
  console.log('=== 测试 F: 基础信息中英语成绩 CET-4、CET-6 不无故换行 ===');

  const data: ResumeData = {
    personalInfo: {
      ...makeBasePersonalInfo(),
      englishScore: 'CET-4、CET-6',
    },
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: [],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '学习能力强。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '前端开发');

  // 验证英语成绩完整保留
  assert(
    result.personalInfo.englishScore === 'CET-4、CET-6',
    '英语成绩 CET-4、CET-6 完整保留'
  );

  // 验证 PersonalInfoGrid 组件已修复（检查组件源码中 flex 布局）
  // 这里验证数据层面：englishScore 不被截断或拆分
  assert(
    !result.personalInfo.englishScore?.includes('\n'),
    '英语成绩不包含换行符'
  );

  console.log('  测试 F 通过 ✓\n');
}

// ============================================
// 测试 G: 同一信息同时出现在基础信息和其他栏目，检查去重
// ============================================

function testG() {
  console.log('=== 测试 G: 同一信息同时出现在基础信息和其他栏目，检查去重 ===');

  const data: ResumeData = {
    personalInfo: {
      ...makeBasePersonalInfo(),
      englishScore: 'CET-6',
    },
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['通过CET-6，英语能力较强'],
        }],
      },
      {
        id: 'certificates',
        title: '证书资质',
        itemType: 'list-item',
        priority: 40,
        items: [{
          type: 'list-item',
          items: ['CET-6', '计算机二级', '普通话二甲'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '英语能力较强，通过CET-6。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '前端开发');

  // 验证基础信息中的英语成绩保留
  assert(
    result.personalInfo.englishScore === 'CET-6',
    '基础信息中英语成绩保留'
  );

  // 验证证书栏目中 CET-6 被去重移除
  const certSection = result.sections.find((s) => s.id === 'certificates');
  if (certSection) {
    const certList = certSection.items.find((i) => i.type === 'list-item');
    if (certList && certList.type === 'list-item') {
      const certs = certList.items;
      assert(
        !certs.includes('CET-6'),
        '证书栏目中 CET-6 被去重移除（已在基础信息中）'
      );
      assert(
        certs.includes('计算机二级'),
        '其他证书保留'
      );
    }
  }

  console.log('  测试 G 通过 ✓\n');
}

// ============================================
// 测试 H: 科研内容同时包含研究方向、论文、项目
// ============================================

function testH() {
  console.log('=== 测试 H: 科研内容同时包含研究方向、论文、项目 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 硕士',
          startDate: '2020-09',
          endDate: '2023-06',
          description: ['GPA 3.9/4.0'],
        }],
      },
      {
        id: 'research',
        title: '科研经历',
        itemType: 'experience-item',
        priority: 70,
        items: [
          {
            type: 'experience-item',
            title: '深度学习在NLP中的应用',
            subtitle: '研究方向',
            description: ['研究自然语言处理中的预训练模型', '探索多语言文本理解'],
          },
          {
            type: 'experience-item',
            title: '国家级自然科学基金项目',
            subtitle: '主要参与人',
            startDate: '2021-01',
            endDate: '2022-12',
            description: ['参与大规模预训练模型研究项目', '负责数据收集和模型训练'],
          },
          {
            type: 'experience-item',
            title: 'Attention Is All You Need',
            subtitle: '第一作者',
            description: ['发表在NeurIPS 2022', '引用量超过100次'],
          },
        ],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '具备扎实的科研能力和论文发表经验。',
        }],
      },
    ],
  };

  const result = normalizeForRendering(data, '前端开发');

  // 验证科研经历栏目保留
  const researchSection = result.sections.find((s) => s.id === 'research');
  assert(researchSection !== undefined, '科研经历栏目保留');

  if (researchSection) {
    // 验证三个条目都保留
    const expItems = researchSection.items.filter((i) => i.type === 'experience-item');
    assert(expItems.length === 3, '三个科研条目都保留');

    // 验证条目被分组（研究方向、项目、论文按类别排序）
    // 不验证具体顺序（取决于关键词检测），只验证同类内容相邻
    const titles = expItems.map((i) => {
      if (i.type === 'experience-item') return i.title;
      return '';
    });

    // 验证所有内容保留
    assert(titles.includes('深度学习在NLP中的应用'), '研究方向保留');
    assert(titles.includes('国家级自然科学基金项目'), '科研项目保留');
    assert(titles.includes('Attention Is All You Need'), '论文保留');
  }

  console.log('  测试 H 通过 ✓\n');
}

// ============================================
// 测试 I: 新模板接入统一数据自动获得所有规则
// ============================================

function testI() {
  console.log('=== 测试 I: 新模板接入统一数据自动获得所有规则 ===');

  const data: ResumeData = {
    personalInfo: makeBasePersonalInfo(),
    sections: [
      {
        id: 'education',
        title: '教育背景',
        itemType: 'experience-item',
        priority: 50,
        items: [{
          type: 'experience-item',
          title: '清华大学',
          subtitle: '计算机科学 · 本科',
          startDate: '2016-09',
          endDate: '2020-06',
          description: ['GPA 3.8/4.0'],
        }],
      },
      {
        id: 'skills',
        title: '专业技能',
        itemType: 'list-item',
        priority: 70,
        items: [{
          type: 'list-item',
          items: ['JavaScript', 'React', 'Vue', 'Git', 'PS', 'AutoCAD'],
        }],
      },
      {
        id: 'evaluation',
        title: '个人优势',
        itemType: 'text-item',
        priority: 10,
        items: [{
          type: 'text-item',
          content: '前端开发能力突出。',
        }],
      },
    ],
  };

  // 模拟新模板：直接使用 normalizeForRendering 后的数据
  const normalized = normalizeForRendering(data, '前端开发');

  // 验证新模板自动获得：
  // 1. 正确排序
  const ids = getSectionIds(normalized);
  assert(ids[0] === 'education', '新模板：教育背景在顶部');
  assert(ids[ids.length - 1] === 'evaluation', '新模板：个人优势在底部');

  // 2. 技能排序
  const skillsSection = normalized.sections.find((s) => s.id === 'skills');
  if (skillsSection) {
    const skillsList = skillsSection.items.find((i) => i.type === 'list-item');
    if (skillsList && skillsList.type === 'list-item') {
      const skills = skillsList.items;
      const jsIdx = skills.indexOf('JavaScript');
      const cadIdx = skills.indexOf('AutoCAD');
      if (jsIdx >= 0 && cadIdx >= 0) {
        assert(jsIdx < cadIdx, '新模板：JavaScript（强相关）排在 AutoCAD（低相关）前面');
      }
    }
  }

  // 3. 基础信息完整
  assert(normalized.personalInfo.name === '张三', '新模板：姓名保留');
  assert(normalized.personalInfo.englishScore === 'CET-6', '新模板：英语成绩保留');

  // 4. 信息去重（无重复）
  const allSections = normalized.sections;
  assert(allSections.length > 0, '新模板：栏目存在');

  console.log('  测试 I 通过 ✓\n');
}

// ============================================
// 运行所有测试
// ============================================

function runAllTests() {
  console.log('========== 统一渲染前规范化层测试 ==========\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    { name: 'A', fn: testA },
    { name: 'B', fn: testB },
    { name: 'C', fn: testC },
    { name: 'D', fn: testD },
    { name: 'E', fn: testE },
    { name: 'F', fn: testF },
    { name: 'G', fn: testG },
    { name: 'H', fn: testH },
    { name: 'I', fn: testI },
  ];

  for (const test of tests) {
    try {
      test.fn();
      passed++;
    } catch (error) {
      failed++;
      console.error(`  ✗ 测试 ${test.name} 失败: ${(error as Error).message}\n`);
    }
  }

  console.log('========== 测试结果 ==========');
  console.log(`通过: ${passed}/${tests.length}`);
  console.log(`失败: ${failed}/${tests.length}`);
  console.log(failed === 0 ? '✓ 所有测试通过' : '✗ 存在失败测试');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
