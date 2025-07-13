import semver from 'semver';
import { PackageInfo, VersionUpdateStrategy, DependencyGraph, DependencyUpdateStrategy } from '../types';
import { VERSION_BUMP_TYPES } from '../utils/constants';
import { isSpecialWorkspaceVersion } from '../utils/workspaceUtils';

export class VersionManager {
  private dependencyGraph: DependencyGraph;

  constructor(dependencyGraph: DependencyGraph = {}) {
    this.dependencyGraph = dependencyGraph;
  }

  /**
   * 更新依赖图
   */
  updateDependencyGraph(graph: DependencyGraph): void {
    this.dependencyGraph = graph;
  }

  /**
   * 计算版本更新策略
   */
  calculateVersionBump(
    currentVersion: string,
    commitMessages: string[],
    bumpType?: 'major' | 'minor' | 'patch'
  ): 'major' | 'minor' | 'patch' {
    if (bumpType) {
      return bumpType;
    }

    // 检查是否有破坏性更改
    const hasBreaking = commitMessages.some(msg => 
      msg.includes('BREAKING CHANGE') || 
      msg.includes('!:') ||
      msg.match(/^(\w+)(\(.+\))?!:/)
    );

    if (hasBreaking) {
      return 'major';
    }

    // 检查是否有新功能
    const hasFeatures = commitMessages.some(msg => 
      msg.startsWith('feat:') || 
      msg.startsWith('feat(')
    );

    if (hasFeatures) {
      return 'minor';
    }

    // 默认为补丁版本
    return 'patch';
  }

  /**
   * 计算新版本号
   */
  calculateNewVersion(
    currentVersion: string,
    bumpType: 'major' | 'minor' | 'patch'
  ): string {
    const newVersion = semver.inc(currentVersion, bumpType);
    if (!newVersion) {
      throw new Error(`无法计算新版本号: ${currentVersion} -> ${bumpType}`);
    }
    return newVersion;
  }

  /**
   * 验证版本号格式
   */
  validateVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  /**
   * 比较版本号
   */
  compareVersions(version1: string, version2: string): -1 | 0 | 1 {
    return semver.compare(version1, version2);
  }

  /**
   * 获取包的依赖者（需要同时更新版本的包）
   */
  getDependentPackages(packageName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, deps] of Object.entries(this.dependencyGraph)) {
      if (deps.includes(packageName)) {
        dependents.push(name);
      }
    }
    
    return dependents;
  }

  /**
   * 获取需要更新的包列表（包括依赖者）
   */
  getPackagesToUpdate(packageNames: string[]): string[] {
    const packagesToUpdate = new Set<string>();
    
    const addPackageAndDependents = (packageName: string) => {
      if (packagesToUpdate.has(packageName)) {
        return;
      }
      
      packagesToUpdate.add(packageName);
      
      // 递归添加依赖者
      const dependents = this.getDependentPackages(packageName);
      for (const dependent of dependents) {
        addPackageAndDependents(dependent);
      }
    };

    for (const packageName of packageNames) {
      addPackageAndDependents(packageName);
    }

    return Array.from(packagesToUpdate);
  }

  /**
   * 创建版本更新计划
   */
  createUpdatePlan(
    packages: PackageInfo[],
    targetPackages: string[],
    bumpType?: 'major' | 'minor' | 'patch'
  ): VersionUpdateStrategy[] {
    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    const strategies: VersionUpdateStrategy[] = [];
    const allPackagesToUpdate = this.getPackagesToUpdate(targetPackages);

    for (const packageName of allPackagesToUpdate) {
      const pkg = packageMap.get(packageName);
      if (!pkg) {
        continue;
      }

      const isDirectTarget = targetPackages.includes(packageName);
      
      strategies.push({
        type: bumpType || 'patch',
        package: packageName,
        reason: isDirectTarget ? '直接更新' : '依赖更新'
      });
    }

    return strategies;
  }

  /**
   * 执行版本更新
   */
  async executeVersionUpdate(
    packageInfo: PackageInfo,
    newVersion: string
  ): Promise<void> {
    const workspaceManager = await import('./workspace').then(m => m.WorkspaceManager);
    const wsManager = new workspaceManager();
    
    await wsManager.updatePackageVersion(packageInfo.name, newVersion);
    
    // 更新本地 PackageInfo
    packageInfo.version = newVersion;
  }

  /**
   * 批量更新版本
   */
  async batchUpdateVersions(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[]
  ): Promise<void> {
    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    // 计算所有版本变更
    const versionChanges = new Map<string, { old: string; new: string }>();
    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      if (!pkg) {
        console.warn(`找不到包: ${strategy.package}`);
        continue;
      }

      const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
      versionChanges.set(strategy.package, { old: pkg.version, new: newVersion });
    }

    // 更新版本
    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      if (!pkg) {
        continue;
      }

      const versionChange = versionChanges.get(strategy.package);
      if (!versionChange) {
        continue;
      }

      await this.executeVersionUpdate(pkg, versionChange.new);
      
      console.log(`✅ 已更新 ${strategy.package}: ${versionChange.old} -> ${versionChange.new} (${strategy.reason})`);
    }

    // 更新依赖关系
    await this.updateDependencyVersions(packages, versionChanges);
  }

  /**
   * 更新依赖版本
   */
  async updateDependencyVersions(
    packages: PackageInfo[],
    versionChanges: Map<string, { old: string; new: string }>
  ): Promise<void> {
    const workspaceManager = await import('./workspace').then(m => m.WorkspaceManager);
    const wsManager = new workspaceManager();

    for (const pkg of packages) {
      for (const [changedPackage, versionChange] of versionChanges) {
        // 检查是否依赖于已更新的包
        const dependencyVersion = pkg.dependencies[changedPackage] || 
                                 pkg.devDependencies[changedPackage] || 
                                 pkg.peerDependencies[changedPackage];
        
        if (dependencyVersion) {
          // 检查是否是特殊的 workspace 版本号（如 workspace:*、workspace:^）
          if (isSpecialWorkspaceVersion(dependencyVersion)) {
            console.log(`⏭️  跳过更新 ${pkg.name} 中的依赖 ${changedPackage}: ${dependencyVersion} (特殊版本号)`);
            continue;
          }
          
          await wsManager.updatePackageDependency(pkg.name, changedPackage, versionChange.new);
          console.log(`✅ 已更新 ${pkg.name} 中的依赖 ${changedPackage}: ${versionChange.old} -> ${versionChange.new}`);
        }
      }
    }
  }

  /**
   * 获取依赖更新策略
   */
  getDependencyUpdateStrategies(
    packages: PackageInfo[],
    versionChanges: Map<string, { old: string; new: string }>
  ): DependencyUpdateStrategy[] {
    const strategies: DependencyUpdateStrategy[] = [];
    
    for (const pkg of packages) {
      for (const [changedPackage, versionChange] of versionChanges) {
        // 检查各种依赖类型
        const checkDependency = (deps: Record<string, string>, isDirect: boolean = true) => {
          if (deps[changedPackage]) {
            strategies.push({
              packageName: pkg.name,
              dependencyName: changedPackage,
              oldVersion: versionChange.old,
              newVersion: versionChange.new,
              isDirect
            });
          }
        };

        checkDependency(pkg.dependencies, true);
        checkDependency(pkg.devDependencies, false);
        checkDependency(pkg.peerDependencies, false);
      }
    }

    return strategies;
  }
  
  /**
   * 获取包的当前版本
   */
  getCurrentVersion(packageInfo: PackageInfo): string {
    return packageInfo.version;
  }

  /**
   * 预览版本更新
   */
  previewVersionUpdate(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[]
  ): Array<{ package: string; currentVersion: string; newVersion: string; reason: string }> {
    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    const preview: Array<{ package: string; currentVersion: string; newVersion: string; reason: string }> = [];

    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      if (!pkg) {
        continue;
      }

      try {
        const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
        preview.push({
          package: strategy.package,
          currentVersion: pkg.version,
          newVersion,
          reason: strategy.reason
        });
      } catch (error) {
        preview.push({
          package: strategy.package,
          currentVersion: pkg.version,
          newVersion: 'ERROR',
          reason: `错误: ${error}`
        });
      }
    }

    return preview;
  }
} 