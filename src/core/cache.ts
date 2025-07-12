import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { CacheData, ChangelogMetadata } from '../types';
import { CACHE_FILE_NAME, CHANGELOG_METADATA_COMMENT } from '../utils/constants';

export class CacheManager {
  private rootPath: string;
  private cacheDir: string;
  private cacheFile: string;

  constructor(rootPath: string = process.cwd(), cacheDir: string = '.changelog') {
    this.rootPath = rootPath;
    this.cacheDir = join(rootPath, cacheDir);
    this.cacheFile = join(this.cacheDir, CACHE_FILE_NAME);
    
    this.ensureCacheDir();
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 读取缓存数据
   */
  async readCache(): Promise<CacheData | null> {
    try {
      if (!existsSync(this.cacheFile)) {
        return null;
      }

      const fs = await import('fs/promises');
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const data = JSON.parse(content);
      
      return {
        ...data,
        lastUpdateTime: new Date(data.lastUpdateTime)
      };
    } catch (error) {
      console.warn('读取缓存文件失败:', error);
      return null;
    }
  }

  /**
   * 写入缓存数据
   */
  async writeCache(data: CacheData): Promise<void> {
    try {
      this.ensureCacheDir();
      const fs = await import('fs/promises');
      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('写入缓存文件失败:', error);
      throw error;
    }
  }

  /**
   * 更新包的最后提交哈希
   */
  async updatePackageCommit(packageName: string, commitHash: string): Promise<void> {
    const cache = await this.readCache() || {
      lastCommitHash: '',
      lastUpdateTime: new Date(),
      packageCommits: {}
    };

    cache.packageCommits[packageName] = commitHash;
    cache.lastUpdateTime = new Date();

    await this.writeCache(cache);
  }

  /**
   * 获取包的最后提交哈希
   */
  async getPackageLastCommit(packageName: string): Promise<string | null> {
    const cache = await this.readCache();
    return cache?.packageCommits[packageName] || null;
  }

  /**
   * 设置全局最后提交哈希
   */
  async setGlobalLastCommit(commitHash: string): Promise<void> {
    const cache = await this.readCache() || {
      lastCommitHash: '',
      lastUpdateTime: new Date(),
      packageCommits: {}
    };

    cache.lastCommitHash = commitHash;
    cache.lastUpdateTime = new Date();

    await this.writeCache(cache);
  }

  /**
   * 获取全局最后提交哈希
   */
  async getGlobalLastCommit(): Promise<string | null> {
    const cache = await this.readCache();
    return cache?.lastCommitHash || null;
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.cacheFile)) {
        const fs = await import('fs/promises');
        await fs.unlink(this.cacheFile);
      }
    } catch (error) {
      console.warn('清除缓存失败:', error);
    }
  }

  /**
   * 从 CHANGELOG.md 中提取元数据
   */
  async extractMetadataFromChangelog(changelogPath: string): Promise<ChangelogMetadata | null> {
    try {
      if (!existsSync(changelogPath)) {
        return null;
      }

      const fs = await import('fs/promises');
      const content = await fs.readFile(changelogPath, 'utf-8');
      
      const metadataMatch = content.match(
        new RegExp(`${CHANGELOG_METADATA_COMMENT}\\s*(.+?)\\s*-->`, 's')
      );

      if (metadataMatch) {
        const metadataStr = metadataMatch[1];
        const metadata = JSON.parse(metadataStr);
        
        return {
          ...metadata,
          lastUpdateTime: new Date(metadata.lastUpdateTime)
        };
      }

      return null;
    } catch (error) {
      console.warn('从 CHANGELOG.md 提取元数据失败:', error);
      return null;
    }
  }

  /**
   * 重建缓存（当缓存文件丢失时）
   */
  async rebuildCache(packagePaths: string[]): Promise<void> {
    const cache: CacheData = {
      lastCommitHash: '',
      lastUpdateTime: new Date(),
      packageCommits: {}
    };

    for (const packagePath of packagePaths) {
      const changelogPath = join(packagePath, 'CHANGELOG.md');
      const metadata = await this.extractMetadataFromChangelog(changelogPath);
      
      if (metadata) {
        cache.packageCommits[metadata.packageName] = metadata.lastCommitHash;
        
        // 更新全局最后提交哈希（取最新的）
        if (!cache.lastCommitHash || 
            metadata.lastUpdateTime > new Date(cache.lastUpdateTime)) {
          cache.lastCommitHash = metadata.lastCommitHash;
          cache.lastUpdateTime = metadata.lastUpdateTime;
        }
      }
    }

    await this.writeCache(cache);
  }

  /**
   * 验证缓存的有效性
   */
  async validateCache(): Promise<boolean> {
    const cache = await this.readCache();
    if (!cache) {
      return false;
    }

    // 检查缓存是否过期（超过 7 天）
    const now = new Date();
    const cacheAge = now.getTime() - cache.lastUpdateTime.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 天

    return cacheAge < maxAge;
  }

  /**
   * 获取缓存状态信息
   */
  async getCacheStatus(): Promise<{
    exists: boolean;
    valid: boolean;
    lastUpdateTime?: Date;
    packageCount?: number;
  }> {
    const cache = await this.readCache();
    
    if (!cache) {
      return { exists: false, valid: false };
    }

    const valid = await this.validateCache();
    
    return {
      exists: true,
      valid,
      lastUpdateTime: cache.lastUpdateTime,
      packageCount: Object.keys(cache.packageCommits).length
    };
  }

  /**
   * 批量更新包的提交哈希
   */
  async batchUpdatePackageCommits(updates: Record<string, string>): Promise<void> {
    const cache = await this.readCache() || {
      lastCommitHash: '',
      lastUpdateTime: new Date(),
      packageCommits: {}
    };

    Object.assign(cache.packageCommits, updates);
    cache.lastUpdateTime = new Date();

    await this.writeCache(cache);
  }

  /**
   * 获取所有包的提交哈希
   */
  async getAllPackageCommits(): Promise<Record<string, string>> {
    const cache = await this.readCache();
    return cache?.packageCommits || {};
  }
} 