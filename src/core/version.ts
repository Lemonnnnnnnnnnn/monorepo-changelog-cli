import semver from 'semver';
import { PackageInfo, VersionUpdateStrategy, DependencyGraph } from '../types';
import { VERSION_BUMP_TYPES } from '../utils/constants';

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
    const allPackages = new Set<string>();
    const visited = new Set<string>();

    const addPackageAndDependents = (packageName: string) => {
      if (visited.has(packageName)) {
        return;
      }
      
      visited.add(packageName);
      allPackages.add(packageName);
      
      // 添加依赖者
      const dependents = this.getDependentPackages(packageName);
      for (const dependent of dependents) {
        addPackageAndDependents(dependent);
      }
    };

    for (const packageName of packageNames) {
      addPackageAndDependents(packageName);
    }

    return Array.from(allPackages);
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

    const packagesToUpdate = this.getPackagesToUpdate(targetPackages);
    const strategies: VersionUpdateStrategy[] = [];

    for (const packageName of packagesToUpdate) {
      const pkg = packageMap.get(packageName);
      if (!pkg) {
        continue;
      }

      const isDirectTarget = targetPackages.includes(packageName);
      const strategy: VersionUpdateStrategy = {
        type: bumpType || 'patch',
        package: packageName,
        reason: isDirectTarget ? '直接更新' : '依赖更新'
      };

      strategies.push(strategy);
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
    // 验证新版本号
    if (!this.validateVersion(newVersion)) {
      throw new Error(`无效的版本号: ${newVersion}`);
    }

    // 检查版本是否向后兼容
    if (this.compareVersions(newVersion, packageInfo.version) <= 0) {
      throw new Error(`新版本号 ${newVersion} 不能小于或等于当前版本 ${packageInfo.version}`);
    }

    // 更新 package.json 文件
    const packageJsonPath = require('path').join(packageInfo.path, 'package.json');
    const fs = require('fs');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.version = newVersion;
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
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

    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      if (!pkg) {
        console.warn(`找不到包: ${strategy.package}`);
        continue;
      }

      const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
      await this.executeVersionUpdate(pkg, newVersion);
      
      console.log(`✅ 已更新 ${strategy.package}: ${pkg.version} -> ${newVersion} (${strategy.reason})`);
    }
  }

  /**
   * 检查版本冲突
   */
  checkVersionConflicts(
    packages: PackageInfo[],
    strategies: VersionUpdateStrategy[]
  ): string[] {
    const conflicts: string[] = [];
    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    for (const strategy of strategies) {
      const pkg = packageMap.get(strategy.package);
      if (!pkg) {
        continue;
      }

      try {
        const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
        
        // 检查是否有其他包依赖于这个包的特定版本
        const dependents = this.getDependentPackages(strategy.package);
        for (const dependentName of dependents) {
          const dependent = packageMap.get(dependentName);
          if (dependent) {
            const requiredVersion = dependent.dependencies[strategy.package] || 
                                   dependent.devDependencies[strategy.package] || 
                                   dependent.peerDependencies[strategy.package];
            
            if (requiredVersion && !semver.satisfies(newVersion, requiredVersion)) {
              conflicts.push(
                `${dependentName} 需要 ${strategy.package}@${requiredVersion}，但计划更新到 ${newVersion}`
              );
            }
          }
        }
      } catch (error) {
        conflicts.push(`${strategy.package}: ${error}`);
      }
    }

    return conflicts;
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