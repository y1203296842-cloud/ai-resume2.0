/**
 * 文件缓存服务 - 统一缓存接口
 * 当前使用内存缓存，未来可替换为 Redis
 * 迁移时只需替换底层存储实现
 */

interface CacheEntry {
  value: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface CacheServiceConfig {
  /** 缓存过期时间（毫秒），默认30分钟 */
  ttl?: number;
  /** 最大缓存条目数，默认100 */
  maxEntries?: number;
}

/**
 * 缓存服务接口
 * 未来替换为 Redis 时，实现相同接口即可
 */
export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, metadata?: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * 内存缓存服务实现
 * 生产环境建议替换为 Redis 实现
 */
export class FileCacheService implements ICacheService {
  private cache: Map<string, CacheEntry>;
  private ttl: number;
  private maxEntries: number;

  constructor(config: CacheServiceConfig = {}) {
    this.cache = new Map();
    this.ttl = config.ttl ?? 30 * 60 * 1000; // 默认30分钟
    this.maxEntries = config.maxEntries ?? 100;
  }

  /**
   * 获取缓存值
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息（用于监控）
   */
  getStats(): { size: number; maxEntries: number; ttl: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttl: this.ttl,
    };
  }
}

// 默认缓存实例（单例）
let defaultCache: FileCacheService | null = null;

/**
 * 获取默认缓存实例
 */
export function getDefaultCache(): FileCacheService {
  if (!defaultCache) {
    defaultCache = new FileCacheService();
  }
  return defaultCache;
}

/**
 * 创建自定义配置的缓存实例
 */
export function createCache(config: CacheServiceConfig): FileCacheService {
  return new FileCacheService(config);
}
