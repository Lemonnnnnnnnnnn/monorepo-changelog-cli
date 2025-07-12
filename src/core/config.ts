import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ChangelogConfig } from '../types';
import { DEFAULT_CONFIG, CONFIG_FILE_NAME } from '../utils/constants';

export class ConfigManager {
  private rootPath: string;
  private configFile: string;
  private cachedConfig: ChangelogConfig | null = null;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.configFile = join(rootPath, CONFIG_FILE_NAME);
  }

  /**
   * 读取配置文件
   */
  async readConfig(): Promise<ChangelogConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const config = this.loadConfigFromFile();
    this.cachedConfig = config;
    return config;
  }

  /**
   * 从文件加载配置
   */
  private loadConfigFromFile(): ChangelogConfig {
    try {
      if (!existsSync(this.configFile)) {
        return this.createDefaultConfig();
      }

      const content = readFileSync(this.configFile, 'utf-8');
      const fileConfig = JSON.parse(content);
      
      // 合并默认配置和文件配置
      const mergedConfig = { ...DEFAULT_CONFIG, ...fileConfig };
      
      // 验证配置
      this.validateConfig(mergedConfig);
      
      return mergedConfig;
    } catch (error) {
      console.warn('读取配置文件失败，使用默认配置:', error);
      return this.createDefaultConfig();
    }
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): ChangelogConfig {
    return {
      outputDir: DEFAULT_CONFIG.outputDir,
      cacheDir: DEFAULT_CONFIG.cacheDir,
      commitTypes: DEFAULT_CONFIG.commitTypes,
      includeAllCommits: DEFAULT_CONFIG.includeAllCommits,
      conventionalCommits: DEFAULT_CONFIG.conventionalCommits,
      dependencyUpdate: DEFAULT_CONFIG.dependencyUpdate,
      excludePatterns: DEFAULT_CONFIG.excludePatterns
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(config: any): void {
    if (!config.outputDir || typeof config.outputDir !== 'string') {
      throw new Error('配置项 outputDir 必须是字符串');
    }

    if (!config.cacheDir || typeof config.cacheDir !== 'string') {
      throw new Error('配置项 cacheDir 必须是字符串');
    }

    if (!Array.isArray(config.commitTypes)) {
      throw new Error('配置项 commitTypes 必须是数组');
    }

    if (typeof config.includeAllCommits !== 'boolean') {
      throw new Error('配置项 includeAllCommits 必须是布尔值');
    }

    if (typeof config.conventionalCommits !== 'boolean') {
      throw new Error('配置项 conventionalCommits 必须是布尔值');
    }

    if (typeof config.dependencyUpdate !== 'boolean') {
      throw new Error('配置项 dependencyUpdate 必须是布尔值');
    }

    if (!Array.isArray(config.excludePatterns)) {
      throw new Error('配置项 excludePatterns 必须是数组');
    }
  }

  /**
   * 保存配置到文件
   */
  async saveConfig(config: ChangelogConfig): Promise<void> {
    try {
      this.validateConfig(config);
      
      const configJson = JSON.stringify(config, null, 2);
      writeFileSync(this.configFile, configJson);
      
      this.cachedConfig = config;
    } catch (error) {
      console.error('保存配置文件失败:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<ChangelogConfig>): Promise<void> {
    const currentConfig = await this.readConfig();
    const newConfig = { ...currentConfig, ...updates };
    await this.saveConfig(newConfig);
  }

  /**
   * 重置配置为默认值
   */
  async resetConfig(): Promise<void> {
    const defaultConfig = this.createDefaultConfig();
    await this.saveConfig(defaultConfig);
  }

  /**
   * 检查配置文件是否存在
   */
  hasConfigFile(): boolean {
    return existsSync(this.configFile);
  }

  /**
   * 创建配置文件
   */
  async createConfigFile(): Promise<void> {
    if (!this.hasConfigFile()) {
      const defaultConfig = this.createDefaultConfig();
      await this.saveConfig(defaultConfig);
    }
  }

  /**
   * 获取提交类型过滤器
   */
  async getCommitTypeFilter(): Promise<string[]> {
    const config = await this.readConfig();
    return config.commitTypes;
  }

  /**
   * 检查是否应该包含所有提交
   */
  async shouldIncludeAllCommits(): Promise<boolean> {
    const config = await this.readConfig();
    return config.includeAllCommits;
  }

  /**
   * 检查是否启用常规提交格式
   */
  async isConventionalCommitsEnabled(): Promise<boolean> {
    const config = await this.readConfig();
    return config.conventionalCommits;
  }

  /**
   * 检查是否启用依赖更新
   */
  async isDependencyUpdateEnabled(): Promise<boolean> {
    const config = await this.readConfig();
    return config.dependencyUpdate;
  }

  /**
   * 获取排除模式
   */
  async getExcludePatterns(): Promise<string[]> {
    const config = await this.readConfig();
    return config.excludePatterns;
  }

  /**
   * 获取输出目录
   */
  async getOutputDir(): Promise<string> {
    const config = await this.readConfig();
    return config.outputDir;
  }

  /**
   * 获取缓存目录
   */
  async getCacheDir(): Promise<string> {
    const config = await this.readConfig();
    return config.cacheDir;
  }

  /**
   * 获取自定义模板
   */
  async getCustomTemplate(): Promise<string | undefined> {
    const config = await this.readConfig();
    return config.customTemplate;
  }

  /**
   * 清除缓存的配置
   */
  clearCache(): void {
    this.cachedConfig = null;
  }
} 