// 导入核心类
import { GitManager } from './core/git';
import { WorkspaceManager } from './core/workspace';
import { CacheManager } from './core/cache';
import { ConfigManager } from './core/config';
import { ChangelogGenerator } from './core/changelog';
import { VersionManager } from './core/version';

// 导入命令类
import { InitCommand } from './commands/init';
import { UpdateCommand } from './commands/update';

// 导出核心类
export { GitManager } from './core/git';
export { WorkspaceManager } from './core/workspace';
export { CacheManager } from './core/cache';
export { ConfigManager } from './core/config';
export { ChangelogGenerator } from './core/changelog';
export { VersionManager } from './core/version';

// 导出命令类
export { InitCommand } from './commands/init';
export { UpdateCommand } from './commands/update';

// 导出类型
export * from './types';

// 导出常量
export * from './utils/constants';

// 主要的API接口
export class ChangelogCLI {
  private gitManager: GitManager;
  private workspaceManager: WorkspaceManager;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;
  private changelogGenerator: ChangelogGenerator;
  private versionManager: VersionManager;

  constructor(rootPath: string = process.cwd()) {
    this.gitManager = new GitManager(rootPath);
    this.workspaceManager = new WorkspaceManager(rootPath);
    this.cacheManager = new CacheManager(rootPath);
    this.configManager = new ConfigManager(rootPath);
    this.changelogGenerator = new ChangelogGenerator(rootPath);
    this.versionManager = new VersionManager();
  }

  /**
   * 初始化项目
   */
  async init(options: {
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
  } = {}): Promise<void> {
    const initCommand = new InitCommand();
    await initCommand.execute(options);
  }

  /**
   * 更新版本和changelog
   */
  async update(options: {
    packages?: string[];
    all?: boolean;
    type?: 'major' | 'minor' | 'patch';
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
  } = {}): Promise<void> {
    const updateCommand = new UpdateCommand();
    await updateCommand.execute(options);
  }

  /**
   * 获取包信息
   */
  async getPackages(): Promise<import('./types').PackageInfo[]> {
    return await this.workspaceManager.getAllPackages();
  }

  /**
   * 获取提交信息
   */
  async getCommits(since?: string): Promise<import('./types').CommitInfo[]> {
    return await this.gitManager.getAllCommits(since);
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<import('./types').ChangelogConfig> {
    return await this.configManager.readConfig();
  }

  /**
   * 获取缓存状态
   */
  async getCacheStatus(): Promise<{
    exists: boolean;
    valid: boolean;
    lastUpdateTime?: Date;
    packageCount?: number;
  }> {
    return await this.cacheManager.getCacheStatus();
  }
} 