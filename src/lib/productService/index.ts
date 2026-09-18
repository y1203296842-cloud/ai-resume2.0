/**
 * 开源版 - 产品服务（保留用于类型兼容，全部免费无限制）
 *
 * 说明：
 * - 本服务保留完整的产品服务接口以兼容现有代码
 * - 开源版无实际付费逻辑，所有价格返回 0
 * - 所有可用性检查均返回 true，所有额度均为无限
 * - 消费次数不做任何扣减
 * - 当前未被业务代码实际调用，保留以防未来使用
 */

import {
  PRODUCT_FEATURES,
  PACKAGES,
  FREE_TRIAL,
  type ProductFeature,
  type ProductFeatureConfig,
  type PackageId,
  type PackageConfig,
  type FreeTrialConfig,
} from '@/config/products';

// ============================================================================
// 存储适配器接口（用于数据库迁移）
// ============================================================================

/** 产品存储适配器接口 */
export interface ProductStorageAdapter {
  /** 获取产品功能配置 */
  getFeature(id: ProductFeature): Promise<ProductFeatureConfig | null>;
  /** 获取所有产品功能 */
  getAllFeatures(): Promise<ProductFeatureConfig[]>;
  /** 更新产品功能配置 */
  updateFeature(id: ProductFeature, config: Partial<ProductFeatureConfig>): Promise<boolean>;
  
  /** 获取套餐配置 */
  getPackage(id: PackageId): Promise<PackageConfig | null>;
  /** 获取所有套餐 */
  getAllPackages(): Promise<PackageConfig[]>;
  /** 更新套餐配置 */
  updatePackage(id: PackageId, config: Partial<PackageConfig>): Promise<boolean>;
  
  /** 获取免费体验配置 */
  getFreeTrial(): Promise<FreeTrialConfig>;
  /** 更新免费体验配置 */
  updateFreeTrial(config: Partial<FreeTrialConfig>): Promise<boolean>;
}

// ============================================================================
// 静态配置适配器（开源版 - 全部免费）
// ============================================================================

/** 静态配置适配器（开源版 - 全部免费） */
class StaticProductAdapter implements ProductStorageAdapter {
  private features: Record<string, ProductFeatureConfig>;
  private packages: Record<string, PackageConfig>;
  private freeTrial: FreeTrialConfig;

  constructor() {
    // 开源版：所有功能价格为0，无限使用
    this.features = {};
    for (const [key, value] of Object.entries(PRODUCT_FEATURES)) {
      this.features[key] = {
        ...value,
        basePrice: 0,       // 全部免费
        creditsPerUse: 0,   // 不消耗次数
      };
    }

    // 开源版：所有套餐价格为0
    this.packages = {};
    for (const [key, value] of Object.entries(PACKAGES)) {
      this.packages[key] = {
        ...value,
        price: 0,
        originalPrice: 0,
      };
    }

    // 开源版：免费体验全开，无限额度
    this.freeTrial = {
      enabled: true,
      maxOptimizeRounds: Infinity, // 无限优化轮次
      canPreview: true,
      canDownload: true,
      canSeeQualityScore: true,
    };
  }

  async getFeature(id: ProductFeature): Promise<ProductFeatureConfig | null> {
    return this.features[id] || null;
  }

  async getAllFeatures(): Promise<ProductFeatureConfig[]> {
    return Object.values(this.features);
  }

  async updateFeature(id: ProductFeature, config: Partial<ProductFeatureConfig>): Promise<boolean> {
    if (!this.features[id]) return false;
    this.features[id] = { ...this.features[id], ...config };
    return true;
  }

  async getPackage(id: PackageId): Promise<PackageConfig | null> {
    return this.packages[id] || null;
  }

  async getAllPackages(): Promise<PackageConfig[]> {
    return Object.values(this.packages);
  }

  async updatePackage(id: PackageId, config: Partial<PackageConfig>): Promise<boolean> {
    if (!this.packages[id]) return false;
    this.packages[id] = { ...this.packages[id], ...config };
    return true;
  }

  async getFreeTrial(): Promise<FreeTrialConfig> {
    return { ...this.freeTrial };
  }

  async updateFreeTrial(config: Partial<FreeTrialConfig>): Promise<boolean> {
    this.freeTrial = { ...this.freeTrial, ...config };
    return true;
  }
}

// ============================================================================
// 产品服务
// ============================================================================

/** 产品服务类 */
class ProductService {
  private adapter: ProductStorageAdapter;

  constructor(adapter?: ProductStorageAdapter) {
    // 默认使用静态配置适配器
    this.adapter = adapter || new StaticProductAdapter();
  }

  /** 切换存储适配器（用于数据库迁移） */
  setAdapter(adapter: ProductStorageAdapter): void {
    this.adapter = adapter;
  }

  // ---------- 产品功能 ----------

  /** 获取产品功能 */
  async getFeature(id: ProductFeature): Promise<ProductFeatureConfig | null> {
    return this.adapter.getFeature(id);
  }

  /** 获取所有产品功能 */
  async getAllFeatures(): Promise<ProductFeatureConfig[]> {
    return this.adapter.getAllFeatures();
  }

  /** 更新产品功能 */
  async updateFeature(id: ProductFeature, config: Partial<ProductFeatureConfig>): Promise<boolean> {
    return this.adapter.updateFeature(id, config);
  }

  /** 获取产品价格 */
  async getFeaturePrice(id: ProductFeature): Promise<number> {
    const feature = await this.adapter.getFeature(id);
    return feature?.basePrice || 0;
  }

  // ---------- 套餐 ----------

  /** 获取套餐 */
  async getPackage(id: PackageId): Promise<PackageConfig | null> {
    return this.adapter.getPackage(id);
  }

  /** 获取所有套餐 */
  async getAllPackages(): Promise<PackageConfig[]> {
    return this.adapter.getAllPackages();
  }

  /** 更新套餐 */
  async updatePackage(id: PackageId, config: Partial<PackageConfig>): Promise<boolean> {
    return this.adapter.updatePackage(id, config);
  }

  /** 获取推荐套餐 */
  async getPopularPackage(): Promise<PackageConfig | null> {
    const packages = await this.adapter.getAllPackages();
    return packages.find(p => p.isPopular) || null;
  }

  // ---------- 免费体验 ----------

  /** 获取免费体验配置 */
  async getFreeTrial(): Promise<FreeTrialConfig> {
    return this.adapter.getFreeTrial();
  }

  /** 更新免费体验配置 */
  async updateFreeTrial(config: Partial<FreeTrialConfig>): Promise<boolean> {
    return this.adapter.updateFreeTrial(config);
  }

  /** 检查是否支持免费体验 */
  async isFreeTrialEnabled(): Promise<boolean> {
    const config = await this.adapter.getFreeTrial();
    return config.enabled;
  }

  // ---------- 计算 ----------

  /** 计算套餐原价 */
  async calculatePackageOriginalPrice(packageId: PackageId): Promise<number> {
    const pkg = await this.adapter.getPackage(packageId);
    if (!pkg) return 0;

    let total = 0;
    for (const f of pkg.features) {
      const feature = await this.adapter.getFeature(f.feature);
      if (feature) {
        total += feature.basePrice * f.credits;
      }
    }
    return total;
  }

  /** 计算折扣率 */
  async calculateDiscount(packageId: PackageId): Promise<number> {
    const pkg = await this.adapter.getPackage(packageId);
    if (!pkg) return 0;

    const originalPrice = pkg.originalPrice || await this.calculatePackageOriginalPrice(packageId);
    // 开源版：价格为0时折扣率为0（全部免费）
    if (originalPrice === 0 || pkg.price === 0) return 0;

    return Math.round((1 - pkg.price / originalPrice) * 100);
  }
}

// ============================================================================
// 导出
// ============================================================================

/** 产品服务单例 */
export const productService = new ProductService();

/** 创建自定义产品服务（用于测试或特殊场景） */
export function createProductService(adapter?: ProductStorageAdapter): ProductService {
  return new ProductService(adapter);
}
