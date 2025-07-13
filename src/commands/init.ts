import { GitManager } from '../core/git';
import { WorkspaceManager } from '../core/workspace';
import { CacheManager } from '../core/cache';
import { ConfigManager } from '../core/config';
import { ChangelogGenerator } from '../core/changelog';
import { PathMatcher } from '../utils/path-matcher';
import { CommitInfo, PackageInfo, ChangelogMetadata } from '../types';

export interface InitOptions {
  config?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export class InitCommand {
  private gitManager: GitManager;
  private workspaceManager: WorkspaceManager;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;
  private changelogGenerator: ChangelogGenerator;
  private pathMatcher: PathMatcher;
  private verbose: boolean = false;

  constructor(rootPath: string = process.cwd()) {
    this.gitManager = new GitManager(rootPath);
    this.workspaceManager = new WorkspaceManager(rootPath);
    this.cacheManager = new CacheManager(rootPath);
    this.configManager = new ConfigManager(rootPath);
    this.changelogGenerator = new ChangelogGenerator(rootPath);
    this.pathMatcher = new PathMatcher(rootPath);
  }

  async execute(options: InitOptions): Promise<void> {
    try {
      this.verbose = options.verbose || false;
      
      if (this.verbose) {
        console.log('🚀 开始初始化 changelog 配置...');
      }

      // 1. 检查环境
      await this.checkEnvironment();

      // 2. 初始化配置
      await this.initializeConfig(options.config);

      // 3. 收集提交信息
      const commits = await this.collectCommits();

      // 4. 获取包信息
      const packages = await this.getPackages();

      // 5. 分析提交与包的关系
      const packageCommits = await this.analyzePackageCommits(commits, packages);

      // 6. 生成 changelog 文件
      if (!options.dryRun) {
        await this.generateChangelogFiles(packageCommits);
      } else {
        this.previewChanges(packageCommits);
      }

      // 7. 更新缓存
      if (!options.dryRun) {
        await this.updateCache(commits, packages);
      }

      console.log('✅ 初始化完成！');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      process.exit(1);
    }
  }

  private async checkEnvironment(): Promise<void> {
    if (this.verbose) {
      console.log('🔍 检查环境...');
    }

    // 检查是否为 Git 仓库
    const isGitRepo = await this.gitManager.isGitRepository();
    if (!isGitRepo) {
      throw new Error('当前目录不是 Git 仓库');
    }

    // 检查是否为 pnpm workspace
    const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
    if (!isPnpmWorkspace) {
      throw new Error('当前目录不是 pnpm workspace');
    }

    if (this.verbose) {
      console.log('✅ 环境检查通过');
    }
  }

  private async initializeConfig(configPath?: string): Promise<void> {
    if (this.verbose) {
      console.log('⚙️ 初始化配置...');
    }

    if (configPath) {
      // 使用指定的配置文件
      console.log(`使用配置文件: ${configPath}`);
    } else {
      // 创建默认配置文件
      await this.configManager.createConfigFile();
      if (this.verbose) {
        console.log('✅ 创建默认配置文件');
      }
    }
  }

  private async collectCommits(): Promise<CommitInfo[]> {
    if (this.verbose) {
      console.log('📝 收集提交信息...');
    }

    const commits = await this.gitManager.getAllCommits();
    
    if (this.verbose) {
      console.log(`✅ 收集到 ${commits.length} 个提交`);
    }

    return commits;
  }

  private async getPackages(): Promise<PackageInfo[]> {
    if (this.verbose) {
      console.log('📦 获取包信息...');
    }

    const packages = await this.workspaceManager.getAllPackages();
    
    if (this.verbose) {
      console.log(`✅ 发现 ${packages.length} 个包:`);
      packages.forEach(pkg => {
        console.log(`  - ${pkg.name}@${pkg.version}`);
      });
    }

    return packages;
  }

  private async analyzePackageCommits(
    commits: CommitInfo[], 
    packages: PackageInfo[]
  ): Promise<Map<string, CommitInfo[]>> {
    if (this.verbose) {
      console.log('🔍 分析提交与包的关系...');
    }

    const packageCommits = new Map<string, CommitInfo[]>();
    
    // 初始化每个包的提交列表
    packages.forEach(pkg => {
      packageCommits.set(pkg.name, []);
    });

    // 分析每个提交影响的包
    for (const commit of commits) {
      const affectedPackages = await this.getAffectedPackages(commit, packages);
      
      for (const pkg of affectedPackages) {
        const commitList = packageCommits.get(pkg.name) || [];
        commitList.push(commit);
        packageCommits.set(pkg.name, commitList);
      }
    }

    if (this.verbose) {
      console.log('✅ 分析完成:');
      packageCommits.forEach((commits, packageName) => {
        console.log(`  - ${packageName}: ${commits.length} 个相关提交`);
      });
    }

    return packageCommits;
  }

  private async getAffectedPackages(
    commit: CommitInfo, 
    packages: PackageInfo[]
  ): Promise<PackageInfo[]> {
    const affectedPackages: PackageInfo[] = [];

    for (const file of commit.files) {
      const packagesByFile = await this.workspaceManager.getPackagesByFilePath(file);
      
      for (const pkg of packagesByFile) {
        if (!affectedPackages.find(p => p.name === pkg.name)) {
          affectedPackages.push(pkg);
        }
      }
    }

    return affectedPackages;
  }

  private async generateChangelogFiles(
    packageCommits: Map<string, CommitInfo[]>
  ): Promise<void> {
    if (this.verbose) {
      console.log('📄 生成 changelog 文件...');
    }

    const config = await this.configManager.readConfig();
    const commitTypes = config.commitTypes;
    const includeAll = config.includeAllCommits;

    for (const [packageName, commits] of packageCommits) {
      const pkg = await this.workspaceManager.getPackageByName(packageName);
      if (!pkg) {
        continue;
      }

      // 过滤提交
      const filteredCommits = includeAll 
        ? commits 
        : commits.filter(commit => {
            return !commit.type || commitTypes.includes(commit.type);
          });

      if (filteredCommits.length === 0) {
        continue;
      }

      // 获取最新的提交哈希
      const latestCommit = filteredCommits[0];
      
      // 生成 changelog
      await this.changelogGenerator.generatePackageChangelog(
        pkg,
        filteredCommits,
        latestCommit.hash
      );

      if (this.verbose) {
        console.log(`✅ 生成 ${pkg.name} 的 changelog (${filteredCommits.length} 个提交)`);
      }
    }
  }

  private previewChanges(packageCommits: Map<string, CommitInfo[]>): void {
    console.log('\n📋 预览模式 - 将要生成的文件:');
    
    packageCommits.forEach((commits, packageName) => {
      if (commits.length > 0) {
        console.log(`📄 ${packageName}/CHANGELOG.md (${commits.length} 个提交)`);
      }
    });
  }

  private async updateCache(
    commits: CommitInfo[], 
    packages: PackageInfo[]
  ): Promise<void> {
    if (this.verbose) {
      console.log('💾 更新缓存...');
    }

    const latestCommit = commits[0];
    if (latestCommit) {
      await this.cacheManager.setGlobalLastCommit(latestCommit.hash);
    }

    // 更新每个包的最后提交
    const packageCommits: Record<string, string> = {};
    for (const pkg of packages) {
      const relevantCommits = commits.filter(commit => 
        this.pathMatcher.doesAnyFileAffectPackage(commit.files, pkg.path)
      );

      if (this.verbose) {
        console.log(`pkg ${pkg.name} 路径: ${pkg.path}`);
        console.log(`相关提交数: ${relevantCommits.length}`);
        if (relevantCommits.length > 0) {
          console.log(`最新相关提交: ${relevantCommits[0].hash}`);
        }
      }
      
      if (relevantCommits.length > 0) {
        packageCommits[pkg.name] = relevantCommits[0].hash;
      }
    }
    await this.cacheManager.batchUpdatePackageCommits(packageCommits);

    if (this.verbose) {
      console.log('✅ 缓存更新完成');
    }
  }
} 