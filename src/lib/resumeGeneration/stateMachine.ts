/**
 * Resume Generation State Machine
 * 
 * 管理简历生成过程中的状态转换
 * 为前端提供精确的进度信息
 * 
 * 迁移说明：
 * 此模块独立于LLM provider，可直接迁移到任何环境
 */

// ============================================
// 状态定义
// ============================================

export type GenerationState =
  | 'IDLE'
  | 'ANALYZING'
  | 'BUILDING'
  | 'OPTIMIZING'
  | 'QUALITY_CHECK'
  | 'ENHANCING'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RECOVERING';

export interface StateInfo {
  state: GenerationState;
  label: string;
  description: string;
  progress: number; // 0-100
}

// ============================================
// 状态配置
// ============================================

const STATE_CONFIG: Record<GenerationState, Omit<StateInfo, 'state'>> = {
  IDLE: {
    label: '准备中',
    description: '等待开始...',
    progress: 0,
  },
  ANALYZING: {
    label: '分析中',
    description: '正在分析你的职业方向和目标岗位需求...',
    progress: 15,
  },
  BUILDING: {
    label: '构建中',
    description: '正在构建简历结构和内容框架...',
    progress: 30,
  },
  OPTIMIZING: {
    label: '优化中',
    description: '正在根据目标岗位优化你的经历表达...',
    progress: 50,
  },
  QUALITY_CHECK: {
    label: '检测中',
    description: '正在检查简历质量，确保符合HR关注重点...',
    progress: 70,
  },
  ENHANCING: {
    label: '补强中',
    description: '正在自动补充岗位匹配内容...',
    progress: 80,
  },
  RENDERING: {
    label: '渲染中',
    description: '正在美化简历版式...',
    progress: 90,
  },
  COMPLETED: {
    label: '完成',
    description: '简历生成完成！',
    progress: 100,
  },
  FAILED: {
    label: '失败',
    description: '生成遇到问题，正在尝试恢复...',
    progress: 0,
  },
  RECOVERING: {
    label: '恢复中',
    description: '正在自动修复，请稍候...',
    progress: 50,
  },
};

// ============================================
// 状态机类
// ============================================

export class ResumeGenerationStateMachine {
  private currentState: GenerationState = 'IDLE';
  private listeners: Array<(state: StateInfo) => void> = [];
  private history: Array<{ state: GenerationState; timestamp: number }> = [];

  /**
   * 获取当前状态信息
   */
  getState(): StateInfo {
    return {
      state: this.currentState,
      ...STATE_CONFIG[this.currentState],
    };
  }

  /**
   * 转换到新状态
   */
  transition(newState: GenerationState): void {
    const validTransitions: Record<GenerationState, GenerationState[]> = {
      IDLE: ['ANALYZING', 'FAILED'],
      ANALYZING: ['BUILDING', 'FAILED', 'RECOVERING'],
      BUILDING: ['OPTIMIZING', 'FAILED', 'RECOVERING'],
      OPTIMIZING: ['QUALITY_CHECK', 'FAILED', 'RECOVERING'],
      QUALITY_CHECK: ['ENHANCING', 'RENDERING', 'FAILED', 'RECOVERING'],
      ENHANCING: ['RENDERING', 'FAILED', 'RECOVERING'],
      RENDERING: ['COMPLETED', 'FAILED', 'RECOVERING'],
      COMPLETED: ['IDLE'],
      FAILED: ['RECOVERING', 'IDLE'],
      RECOVERING: ['ANALYZING', 'BUILDING', 'OPTIMIZING', 'QUALITY_CHECK', 'FAILED', 'IDLE'],
    };

    const allowed = validTransitions[this.currentState];
    if (!allowed.includes(newState)) {
      console.warn(`[StateMachine] 非法状态转换: ${this.currentState} → ${newState}`);
      return;
    }

    this.currentState = newState;
    this.history.push({ state: newState, timestamp: Date.now() });

    // 通知所有监听者
    const stateInfo = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(stateInfo);
      } catch (e) {
        console.error('[StateMachine] 监听者回调错误:', e);
      }
    }
  }

  /**
   * 注册状态变化监听者
   */
  onStateChange(listener: (state: StateInfo) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 重置状态机
   */
  reset(): void {
    this.currentState = 'IDLE';
    this.history = [];
  }

  /**
   * 获取状态历史
   */
  getHistory(): Array<{ state: GenerationState; timestamp: number }> {
    return [...this.history];
  }

  /**
   * 是否处于终态
   */
  isTerminal(): boolean {
    return this.currentState === 'COMPLETED' || this.currentState === 'FAILED';
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return !this.isTerminal() && this.currentState !== 'IDLE';
  }
}

// ============================================
// 全局实例（可选，用于跨组件共享）
// ============================================

let globalInstance: ResumeGenerationStateMachine | null = null;

export function getGlobalStateMachine(): ResumeGenerationStateMachine {
  if (!globalInstance) {
    globalInstance = new ResumeGenerationStateMachine();
  }
  return globalInstance;
}

export function resetGlobalStateMachine(): void {
  if (globalInstance) {
    globalInstance.reset();
  }
  globalInstance = null;
}

// ============================================
// 前端工具函数
// ============================================

/**
 * 获取状态对应的用户友好消息
 */
export function getStateMessage(state: GenerationState): string {
  return STATE_CONFIG[state]?.description || '处理中...';
}

/**
 * 获取状态对应的进度百分比
 */
export function getStateProgress(state: GenerationState): number {
  return STATE_CONFIG[state]?.progress || 0;
}
