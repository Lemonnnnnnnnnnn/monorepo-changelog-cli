import { GitManager } from '../core/git';
import { WorkspaceManager } from '../core/workspace';
import { CacheManager } from '../core/cache';
import { ConfigManager } from '../core/config';

export interface StatusOptions {
  verbose?: boolean;
}

export class StatusCommand {
  private gitManager: GitManager;
  private workspaceManager: WorkspaceManager;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;

  constructor(rootPath: string = process.cwd()) {
    this.gitManager = new GitManager(rootPath);
    this.workspaceManager = new WorkspaceManager(rootPath);
    this.cacheManager = new CacheManager(rootPath);
    this.configManager = new ConfigManager(rootPath);
  }

  async execute(options: StatusOptions): Promise<void> {
    try {
      console.log('📊 项目状态报告');
      console.log('='.repeat(50));

      // 检查环境状态
      await this.checkEnvironmentStatus();

      // 检查配置状态
      await this.checkConfigStatus();

      // 检查缓存状态
      await this.checkCacheStatus();

      // 检查包信息
      await this.checkPackageStatus(options.verbose);

      console.log('='.repeat(50));
      console.log('✅ 状态检查完成');
    } catch (error) {
      console.error('❌ 状态检查失败:', error);
      process.exit(1);
    }
  }

  private async checkEnvironmentStatus(): Promise<void> {
    console.log('\n🔍 环境状态:');
    
    const isGitRepo = await this.gitManager.isGitRepository();
    console.log(`  Git 仓库: ${isGitRepo ? '✅' : '❌'}`);

    const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
    console.log(`  Pnpm workspace: ${isPnpmWorkspace ? '✅' : '❌'}`);

    if (isGitRepo) {
      const latestCommit = await this.gitManager.getLatestCommitHash();
      console.log(`  最新提交: ${latestCommit.substring(0, 7)}`);
    }
  }

  private async checkConfigStatus(): Promise<void> {
    console.log('\n⚙️ 配置状态:');
    
    const hasConfig = this.configManager.hasConfigFile();
    console.log(`  配置文件: ${hasConfig ? '✅' : '❌'}`);

    if (hasConfig) {
      const config = await this.configManager.readConfig();
      console.log(`  提交类型过滤: ${config.commitTypes.join(', ')}`);
      console.log(`  包含所有提交: ${config.includeAllCommits ? '是' : '否'}`);
      console.log(`  常规提交格式: ${config.conventionalCommits ? '是' : '否'}`);
    }
  }

  private async checkCacheStatus(): Promise<void> {
    console.log('\n💾 缓存状态:');
    
    const cacheStatus = await this.cacheManager.getCacheStatus();
    console.log(`  缓存文件: ${cacheStatus.exists ? '✅' : '❌'}`);
    
    if (cacheStatus.exists) {
      console.log(`  有效性: ${cacheStatus.valid ? '✅' : '⚠️'}`);
      console.log(`  最后更新: ${cacheStatus.lastUpdateTime?.toLocaleString() || 'N/A'}`);
      console.log(`  包数量: ${cacheStatus.packageCount || 0}`);
    }
  }

  private async checkPackageStatus(verbose?: boolean): Promise<void> {
    console.log('\n📦 包状态:');
    
    try {
      const packages = await this.workspaceManager.getAllPackages();
      console.log(`  总包数: ${packages.length}`);

      if (verbose) {
        console.log('\n  包列表:');
        packages.forEach(pkg => {
          console.log(`    - ${pkg.name}@${pkg.version}`);
          console.log(`      路径: ${pkg.path}`);
          console.log(`      依赖: ${Object.keys(pkg.dependencies).length}`);
          console.log(`      开发依赖: ${Object.keys(pkg.devDependencies).length}`);
        });
      }

      // 检查依赖关系
      const dependencyGraph = await this.workspaceManager.getDependencyGraph();
      const internalDeps = Object.values(dependencyGraph).flat().length;
      console.log(`  内部依赖关系: ${internalDeps}`);

    } catch (error) {
      console.log('  ❌ 无法获取包信息');
    }
  }
} 