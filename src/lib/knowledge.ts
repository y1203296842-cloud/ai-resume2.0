import fs from 'fs';
import path from 'path';

/**
 * 知识库映射表
 *
 * 支持两种模式：
 * 1. file 模式：单个 .md 文件放在 knowledge/ 根目录（旧格式）
 * 2. dir 模式：一个岗位一个子文件夹，内含多个 .md 文件（新格式）
 *    读取时自动拼接子文件夹内所有 .md 文件内容
 */
const KNOWLEDGE_MAP: Array<{
  key: string;
  aliases: string[];
  file?: string;
  dir?: string;
}> = [
  // ========== 子文件夹模式（新） ==========
  {
    key: '主播',
    aliases: ['直播', '带货', '主播助理', '直播间运营', '抖音主播', '快手主播', '电商主播'],
    dir: '主播',
  },
  {
    key: 'AI产品经理',
    aliases: ['AI产品', 'AIPM', 'AI PM', '人工智能产品', 'AI产品经理', '大模型产品经理'],
    dir: 'AI产品经理',
  },
  {
    key: '产品经理',
    aliases: ['产品', 'PM', '产品设计', '产品专员', '高级产品经理', '产品总监', '需求分析'],
    dir: '产品经理',
  },
  {
    key: '运营',
    aliases: ['运营专员', '用户运营', '活动运营', '社区运营', '平台运营', '运营助理', '运营经理'],
    dir: '运营',
  },
  // ========== 单文件模式（旧） ==========
  {
    key: '新媒体运营',
    aliases: ['新媒体', '内容运营', '社交媒体', '公众号运营', '抖音运营', '小红书运营', '微博运营', '自媒体'],
    file: '01_新媒体运营.md',
  },
  {
    key: '运营专员',
    aliases: ['运营', '用户运营', '活动运营', '社区运营', '平台运营', '运营助理', '运营经理'],
    file: '02_运营专员.md',
  },
  {
    key: '行政专员',
    aliases: ['行政', '行政助理', '前台', '办公室', '文员', '行政前台', '行政管理'],
    file: '03_行政专员.md',
  },
  {
    key: '人力资源',
    aliases: ['HR', '人事', '招聘', '人力资源专员', 'HRBP', '人事专员', '招聘专员', '薪酬', '绩效', '培训'],
    file: '04_人力资源.md',
  },
  {
    key: '市场专员',
    aliases: ['市场', '市场营销', '品牌', '市场推广', '市场策划', 'BD', '商务拓展', '市场经理', '品牌经理'],
    file: '05_市场专员.md',
  },
  {
    key: '销售',
    aliases: ['销售专员', '销售代表', '销售经理', '客户经理', '大客户', '电话销售', '渠道销售', '商务', '销售顾问'],
    file: '07_销售.md',
  },
  {
    key: '电商运营',
    aliases: ['电商', '淘宝运营', '天猫运营', '京东运营', '拼多多运营', '店铺运营', '跨境电商', '亚马逊运营'],
    file: '08_电商运营.md',
  },
  {
    key: '会计财务',
    aliases: ['会计', '财务', '出纳', '审计', '税务', '财务专员', '财务经理', '会计专员', '成本会计', '总账'],
    file: '09_会计财务.md',
  },
  {
    key: '客服客户成功',
    aliases: ['客服', '客户服务', '客户成功', '售后', '客服专员', '客服经理', '客户支持', '售后客服', 'CS'],
    file: '10_客服客户成功.md',
  },
];

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

/**
 * 根据岗位名称匹配知识库条目
 * @param position 用户提到的目标岗位
 * @returns 匹配到的知识库条目（含 file 或 dir），未匹配返回 null
 */
export function matchKnowledge(position: string): { key: string; file?: string; dir?: string } | null {
  if (!position || position.trim().length === 0) {
    return null;
  }

  const normalizedPosition = position.trim().toLowerCase();

  // 1. 精确匹配 key
  const exactMatch = KNOWLEDGE_MAP.find(
    (item) => item.key === normalizedPosition || item.key === position.trim()
  );
  if (exactMatch) {
    return { key: exactMatch.key, file: exactMatch.file, dir: exactMatch.dir };
  }

  // 2. 精确匹配 aliases
  const aliasExactMatch = KNOWLEDGE_MAP.find((item) =>
    item.aliases.some((alias) => alias === position.trim() || alias.toLowerCase() === normalizedPosition)
  );
  if (aliasExactMatch) {
    return { key: aliasExactMatch.key, file: aliasExactMatch.file, dir: aliasExactMatch.dir };
  }

  // 3. 模糊包含匹配 - 岗位名包含关键词 或 关键词包含岗位名
  const fuzzyMatch = KNOWLEDGE_MAP.find((item) => {
    if (position.trim().includes(item.key) || item.key.includes(position.trim())) {
      return true;
    }
    return item.aliases.some(
      (alias) => normalizedPosition.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normalizedPosition)
    );
  });
  if (fuzzyMatch) {
    return { key: fuzzyMatch.key, file: fuzzyMatch.file, dir: fuzzyMatch.dir };
  }

  return null;
}

/**
 * 读取知识库文件内容
 *
 * 支持两种模式：
 * - file 模式：从 knowledge/ 根目录读取单个 .md 文件
 * - dir 模式：从 knowledge/{dir}/ 子目录读取所有 .md 文件并拼接
 *
 * @param file 文件名（根目录模式）
 * @param dir 子目录名（目录模式）
 * @returns 文件内容字符串，读取失败返回 null
 */
export function loadKnowledgeFile(fileName?: string, dirName?: string): string | null {
  try {
    // 目录模式：读取子目录下所有 .md 文件并拼接
    if (dirName) {
      const dirPath = path.join(KNOWLEDGE_DIR, dirName);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return null;
      }

      const mdFiles = fs
        .readdirSync(dirPath)
        .filter((f) => f.endsWith('.md'))
        .sort();

      if (mdFiles.length === 0) {
        return null;
      }

      const parts: string[] = [];
      for (const mdFile of mdFiles) {
        const filePath = path.join(dirPath, mdFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.trim()) {
          parts.push(content.trim());
        }
      }

      return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
    }

    // 单文件模式
    if (fileName) {
      const filePath = path.join(KNOWLEDGE_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return fs.readFileSync(filePath, 'utf-8');
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 根据岗位名称获取知识库内容
 * @param position 目标岗位
 * @returns 知识库内容，未找到返回 null
 */
export function getKnowledgeForPosition(position: string): string | null {
  const match = matchKnowledge(position);
  if (!match) {
    return null;
  }

  const content = loadKnowledgeFile(match.file, match.dir);
  if (!content) {
    return null;
  }

  return content;
}

/**
 * 从对话历史中提取目标岗位关键词
 * @param messages 对话消息列表
 * @returns 提取到的岗位名称，未找到返回 null
 */
export function extractPositionFromMessages(
  messages: Array<{ role: string; content: string }>
): string | null {
  // 从最后几条用户消息中寻找岗位关键词
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3);

  for (const msg of userMessages) {
    const content = msg.content;

    // 检查是否包含岗位关键词
    for (const item of KNOWLEDGE_MAP) {
      // 检查 key
      if (content.includes(item.key)) {
        return item.key;
      }
      // 检查 aliases
      for (const alias of item.aliases) {
        if (content.includes(alias)) {
          return item.key;
        }
      }
    }
  }

  return null;
}

/**
 * 获取所有知识库岗位列表（用于推荐模式）
 */
export function getAllKnowledgePositions(): string[] {
  return KNOWLEDGE_MAP.map((item) => item.key);
}
