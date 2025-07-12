import { GitManager } from '../core/git';
import { WorkspaceManager } from '../core/workspace';
import { CacheManager } from '../core/cache';
import { ConfigManager } from '../core/config';
import { ChangelogGenerator } from '../core/changelog';
import { VersionManager } from '../core/version';
import { CommitInfo, PackageInfo, VersionUpdateStrategy } from '../types';

export interface UpdateOptions {
  packages?: string[];
  all?: boolean;
  type?: 'major' | 'minor' | 'patch';
  config?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export class UpdateCommand {
  private gitManager: GitManager;
  private workspaceManager: WorkspaceManager;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;
  private changelogGenerator: ChangelogGenerator;
  private versionManager: VersionManager;
  private verbose: boolean = false;

  constructor(rootPath: string = process.cwd()) {
    this.gitManager = new GitManager(rootPath);
    this.workspaceManager = new WorkspaceManager(rootPath);
    this.cacheManager = new CacheManager(rootPath);
    this.configManager = new ConfigManager(rootPath);
    this.changelogGenerator = new ChangelogGenerator(rootPath);
    this.versionManager = new VersionManager();
  }

  async execute(options: UpdateOptions): Promise<void> {
    try {
      this.verbose = options.verbose || false;
      
      if (this.verbose) {
        console.log('🚀 开始更新 changelog 和版本...');
      }

      // 1. 检查环境
      await this.checkEnvironment();

      // 2. 读取配置
      await this.loadConfiguration(options.config);

      // 3. 获取包信息
      const packages = await this.getPackages();

      // 4. 初始化版本管理器
      await this.initializeVersionManager(packages);

      // 5. 确定要更新的包
      const targetPackages = await this.determineTargetPackages(options, packages);

      // 6. 获取新的提交
      const newCommits = await this.getNewCommits(targetPackages);

      // 7. 创建版本更新策略
      const updateStrategies = await this.createUpdateStrategies(
        packages, 
        targetPackages, 
        newCommits,
        options.type
      );

      // 8. 检查版本冲突
      await this.checkVersionConflicts(packages, updateStrategies);

      // 9. 预览或执行更新
      if (options.dryRun) {
        await this.previewUpdate(packages, updateStrategies, newCommits);
      } else {
        await this.executeUpdate(packages, updateStrategies, newCommits);
      }

      console.log('✅ 更新完成！');
      
    } catch (error) {
      console.error('❌ 更新失败:', error);
      process.exit(1);
    }
  }

  private async checkEnvironment(): Promise<void> {
    if (this.verbose) {
      console.log('🔍 检查环境...');
    }

    const isGitRepo = await this.gitManager.isGitRepository();
    if (!isGitRepo) {
      throw new Error('当前目录不是 Git 仓库');
    }

    const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
    if (!isPnpmWorkspace) {
      throw new Error('当前目录不是 pnpm workspace');
    }

    if (this.verbose) {
      console.log('✅ 环境检查通过');
    }
  }

  private async loadConfiguration(configPath?: string): Promise<void> {
    if (this.verbose) {
      console.log('⚙️ 读取配置...');
    }

    if (configPath) {
      console.log(`使用配置文件: ${configPath}`);
    }

    const config = await this.configManager.readConfig();
    
    if (this.verbose) {
      console.log('✅ 配置读取完成');
    }
  }

  private async getPackages(): Promise<PackageInfo[]> {
    if (this.verbose) {
      console.log('📦 获取包信息...');
    }

    const packages = await this.workspaceManager.getAllPackages();
    
    if (this.verbose) {
      console.log(`✅ 发现 ${packages.length} 个包`);
    }

    return packages;
  }

  private async initializeVersionManager(packages: PackageInfo[]): Promise<void> {
    const dependencyGraph = await this.workspaceManager.getDependencyGraph();
    this.versionManager.updateDependencyGraph(dependencyGraph);
  }

  private async determineTargetPackages(
    options: UpdateOptions,
    packages: PackageInfo[]
  ): Promise<string[]> {
    if (options.all) {
      return packages.map(pkg => pkg.name);
    }

    if (options.packages && options.packages.length > 0) {
      // 验证包名
      const validPackages: string[] = [];
      for (const packageName of options.packages) {
        const pkg = await this.workspaceManager.getPackageByName(packageName);
        if (pkg) {
          validPackages.push(packageName);
        } else {
          console.warn(`⚠️ 包 '${packageName}' 不存在`);
        }
      }
      return validPackages;
    }

    // 交互式选择包
    return await this.selectPackagesInteractively(packages);
  }

  private async selectPackagesInteractively(packages: PackageInfo[]): Promise<string[]> {
    const inquirer = await import('inquirer');
    
    const { selectedPackages } = await inquirer.default.prompt([
      {
        type: 'checkbox',
        name: 'selectedPackages',
        message: '选择要更新的包:',
        choices: packages.map(pkg => ({
          name: `${pkg.name}@${pkg.version}`,
          value: pkg.name
        })),
        validate: (input: string[]) => {
          if (input.length === 0) {
            return '请至少选择一个包';
          }
          return true;
        }
      }
    ]);

    return selectedPackages;
  }

  private async getNewCommits(targetPackages: string[]): Promise<Map<string, CommitInfo[]>> {
    if (this.verbose) {
      console.log('📝 获取新提交...');
    }

    const newCommits = new Map<string, CommitInfo[]>();

    for (const packageName of targetPackages) {
      const pkg = await this.workspaceManager.getPackageByName(packageName);
      if (!pkg) {
        continue;
      }

      const lastCommit = await this.cacheManager.getPackageLastCommit(packageName);
      const commits = await this.gitManager.getCommitsForPath(pkg.path, lastCommit || undefined);
      
      newCommits.set(packageName, commits);
      
      if (this.verbose) {
        console.log(`  - ${packageName}: ${commits.length} 个新提交`);
      }
    }

    return newCommits;
  }

  private async createUpdateStrategies(
    packages: PackageInfo[],
    targetPackages: string[],
    newCommits: Map<string, CommitInfo[]>,
    bumpType?: 'major' | 'minor' | 'patch'
  ): Promise<VersionUpdateStrategy[]> {
    if (this.verbose) {
      console.log('📋 创建版本更新策略...');
    }

    const strategies: VersionUpdateStrategy[] = [];

    // 获取需要更新的所有包（包括依赖者）
    const allPackagesToUpdate = this.versionManager.getPackagesToUpdate(targetPackages);

    for (const packageName of allPackagesToUpdate) {
      const pkg = packages.find(p => p.name === packageName);
      if (!pkg) {
        continue;
      }

      const commits = newCommits.get(packageName) || [];
      const isDirectTarget = targetPackages.includes(packageName);

      if (isDirectTarget && commits.length > 0) {
        // 计算版本更新类型
        const commitMessages = commits.map(c => c.message);
        const calculatedBumpType = this.versionManager.calculateVersionBump(
          pkg.version,
          commitMessages,
          bumpType
        );

        strategies.push({
          type: calculatedBumpType,
          package: packageName,
          reason: '直接更新'
        });
      } else if (!isDirectTarget) {
        // 依赖更新
        strategies.push({
          type: bumpType || 'patch',
          package: packageName,
          reason: '依赖更新'
        });
      }
    }

    return strategies;
  }

  private async checkVersionConflicts(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[]
  ): Promise<void> {
    if (this.verbose) {
      console.log('🔍 检查版本冲突...');
    }

    const conflicts = this.versionManager.checkVersionConflicts(packages, strategies);
    
    if (conflicts.length > 0) {
      console.error('❌ 发现版本冲突:');
      conflicts.forEach(conflict => {
        console.error(`  - ${conflict}`);
      });
      throw new Error('版本冲突，请解决后重试');
    }

    if (this.verbose) {
      console.log('✅ 无版本冲突');
    }
  }

  private async previewUpdate(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[],
    newCommits: Map<string, CommitInfo[]>
  ): Promise<void> {
    console.log('\n📋 预览模式 - 将要执行的更新:');
    
    const preview = this.versionManager.previewVersionUpdate(packages, strategies);
    
    console.log('\n版本更新:');
    preview.forEach(item => {
      console.log(`  📦 ${item.package}: ${item.currentVersion} -> ${item.newVersion} (${item.reason})`);
    });

    console.log('\nChangelog 更新:');
    newCommits.forEach((commits, packageName) => {
      if (commits.length > 0) {
        console.log(`  📄 ${packageName}/CHANGELOG.md (${commits.length} 个新提交)`);
      }
    });
  }

  private async executeUpdate(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[],
    newCommits: Map<string, CommitInfo[]>
  ): Promise<void> {
    if (this.verbose) {
      console.log('🔄 执行更新...');
    }

    // 1. 更新版本号
    await this.versionManager.batchUpdateVersions(packages, strategies);

    // 2. 更新 changelog
    await this.updateChangelogFiles(packages, strategies, newCommits);

    // 3. 更新缓存
    await this.updateCache(packages, newCommits);

    if (this.verbose) {
      console.log('✅ 更新执行完成');
    }
  }

  private async updateChangelogFiles(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[],
    newCommits: Map<string, CommitInfo[]>
  ): Promise<void> {
    if (this.verbose) {
      console.log('📄 更新 changelog 文件...');
    }

    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      const commits = newCommits.get(strategy.package) || [];
      
      if (!pkg || commits.length === 0) {
        continue;
      }

      const newVersion = this.versionManager.calculateNewVersion(pkg.version, strategy.type);
      const latestCommit = commits[0];

      await this.changelogGenerator.generatePackageChangelog(
        { ...pkg, version: newVersion },
        commits,
        latestCommit.hash
      );

      if (this.verbose) {
        console.log(`✅ 更新 ${pkg.name} 的 changelog`);
      }
    }
  }

  private async updateCache(
    packages: PackageInfo[],
    newCommits: Map<string, CommitInfo[]>
  ): Promise<void> {
    if (this.verbose) {
      console.log('💾 更新缓存...');
    }

    const packageCommits: Record<string, string> = {};
    
    newCommits.forEach((commits, packageName) => {
      if (commits.length > 0) {
        packageCommits[packageName] = commits[0].hash;
      }
    });

    await this.cacheManager.batchUpdatePackageCommits(packageCommits);

    // 更新全局最后提交
    const latestCommit = await this.gitManager.getLatestCommitHash();
    if (latestCommit) {
      await this.cacheManager.setGlobalLastCommit(latestCommit);
    }

    if (this.verbose) {
      console.log('✅ 缓存更新完成');
    }
  }
} 