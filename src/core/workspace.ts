import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import { glob } from 'glob';
import { PackageInfo, DependencyGraph } from '../types';
import { isSpecialWorkspaceVersion } from '../utils/workspaceUtils';

export class WorkspaceManager {
  private rootPath: string;
  private packagesCache: Map<string, PackageInfo> = new Map();
  private dependencyGraph: DependencyGraph = {};

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = resolve(rootPath);
  }

  /**
   * 检查是否是 pnpm workspace
   */
  async isPnpmWorkspace(): Promise<boolean> {
    const workspaceFile = join(this.rootPath, 'pnpm-workspace.yaml');
    return existsSync(workspaceFile);
  }

  /**
   * 获取 workspace 配置
   */
  async getWorkspaceConfig(): Promise<{ packages: string[] }> {
    const workspaceFile = join(this.rootPath, 'pnpm-workspace.yaml');
    
    if (!existsSync(workspaceFile)) {
      throw new Error('pnpm-workspace.yaml 文件不存在');
    }

    try {
      const content = readFileSync(workspaceFile, 'utf-8');
      const config = parseYaml(content);
      return config;
    } catch (error) {
      throw new Error(`解析 pnpm-workspace.yaml 失败: ${error}`);
    }
  }

  /**
   * 获取所有包的信息
   */
  async getAllPackages(): Promise<PackageInfo[]> {
    if (this.packagesCache.size > 0) {
      return Array.from(this.packagesCache.values());
    }

    const config = await this.getWorkspaceConfig();
    const packages: PackageInfo[] = [];

    for (const pattern of config.packages) {
      const packagePaths = await glob(pattern, {
        cwd: this.rootPath,
        absolute: true
      });

      for (const packagePath of packagePaths) {
        const packageInfo = await this.getPackageInfo(packagePath);
        if (packageInfo) {
          packages.push(packageInfo);
          this.packagesCache.set(packageInfo.name, packageInfo);
        }
      }
    }

    await this.buildDependencyGraph(packages);
    return packages;
  }

  /**
   * 获取单个包的信息
   */
  async getPackageInfo(packagePath: string): Promise<PackageInfo | null> {
    const packageJsonPath = join(packagePath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      return {
        name: packageJson.name,
        version: packageJson.version || '0.0.0',
        path: packagePath,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {}
      };
    } catch (error) {
      console.warn(`读取 package.json 失败: ${packagePath}`, error);
      return null;
    }
  }

  /**
   * 根据文件路径获取所属的包
   */
  async getPackagesByFilePath(filePath: string): Promise<PackageInfo[]> {
    const packages = await this.getAllPackages();
    const normalizedFilePath = resolve(this.rootPath, filePath);
    const affectedPackages: PackageInfo[] = [];

    for (const pkg of packages) {
      const normalizedPackagePath = resolve(pkg.path);
      if (normalizedFilePath.startsWith(normalizedPackagePath)) {
        affectedPackages.push(pkg);
      }
    }

    return affectedPackages;
  }

  /**
   * 获取包的依赖关系
   */
  async getDependencyGraph(): Promise<DependencyGraph> {
    if (Object.keys(this.dependencyGraph).length === 0) {
      await this.getAllPackages();
    }
    return this.dependencyGraph;
  }

  /**
   * 构建依赖关系图
   */
  private async buildDependencyGraph(packages: PackageInfo[]): Promise<void> {
    const packageMap = new Map<string, PackageInfo>();
    packages.forEach(pkg => packageMap.set(pkg.name, pkg));

    for (const pkg of packages) {
      const dependencies: string[] = [];
      
      // 检查 dependencies
      for (const [depName, depVersion] of Object.entries(pkg.dependencies)) {
        if (packageMap.has(depName) || this.isWorkspaceDependency(depVersion)) {
          dependencies.push(depName);
        }
      }

      // 检查 devDependencies
      for (const [depName, depVersion] of Object.entries(pkg.devDependencies)) {
        if (packageMap.has(depName) || this.isWorkspaceDependency(depVersion)) {
          dependencies.push(depName);
        }
      }

      // 检查 peerDependencies
      for (const [depName, depVersion] of Object.entries(pkg.peerDependencies)) {
        if (packageMap.has(depName) || this.isWorkspaceDependency(depVersion)) {
          dependencies.push(depName);
        }
      }

      this.dependencyGraph[pkg.name] = dependencies;
    }
  }

  /**
   * 检查是否是 workspace 依赖
   */
  private isWorkspaceDependency(version: string): boolean {
    return version.startsWith('workspace:');
  }

  /**
   * 获取包的所有依赖者（谁依赖了这个包）
   */
  async getDependents(packageName: string): Promise<string[]> {
    const graph = await this.getDependencyGraph();
    const dependents: string[] = [];

    for (const [name, deps] of Object.entries(graph)) {
      if (deps.includes(packageName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * 获取包的所有依赖（这个包依赖了谁）
   */
  async getDependencies(packageName: string): Promise<string[]> {
    const graph = await this.getDependencyGraph();
    return graph[packageName] || [];
  }

  /**
   * 检查包是否存在
   */
  async hasPackage(packageName: string): Promise<boolean> {
    await this.getAllPackages(); // 确保缓存已加载
    return this.packagesCache.has(packageName);
  }

  /**
   * 根据包名获取包信息
   */
  async getPackageByName(packageName: string): Promise<PackageInfo | null> {
    await this.getAllPackages(); // 确保缓存已加载
    return this.packagesCache.get(packageName) || null;
  }

  /**
   * 获取根包信息
   */
  async getRootPackageInfo(): Promise<PackageInfo | null> {
    return await this.getPackageInfo(this.rootPath);
  }

  /**
   * 获取相对路径
   */
  getRelativePath(packagePath: string): string {
    return relative(this.rootPath, packagePath);
  }

  /**
   * 更新包版本
   */
  async updatePackageVersion(packageName: string, newVersion: string): Promise<void> {
    const packageInfo = await this.getPackageByName(packageName);
    if (!packageInfo) {
      throw new Error(`包 ${packageName} 不存在`);
    }

    const packageJsonPath = join(packageInfo.path, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    packageJson.version = newVersion;
    
    const fs = await import('fs/promises');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // 更新缓存
    packageInfo.version = newVersion;
    this.packagesCache.set(packageName, packageInfo);
  }

  /**
   * 更新包的依赖版本
   */
  async updatePackageDependency(
    packageName: string,
    dependencyName: string,
    newVersion: string
  ): Promise<void> {
    const packageInfo = await this.getPackageByName(packageName);
    if (!packageInfo) {
      throw new Error(`包 ${packageName} 不存在`);
    }

    const packageJsonPath = join(packageInfo.path, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    // 更新各种依赖类型
    if (packageJson.dependencies && packageJson.dependencies[dependencyName]) {
      const currentVersion = packageJson.dependencies[dependencyName];
      // 如果是 workspace:* 或 workspace:^ 这类特殊版本号，不进行更新
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageJson.dependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageJson.dependencies[dependencyName] = newVersion;
      }
    }
    
    if (packageJson.devDependencies && packageJson.devDependencies[dependencyName]) {
      const currentVersion = packageJson.devDependencies[dependencyName];
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageJson.devDependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageJson.devDependencies[dependencyName] = newVersion;
      }
    }
    
    if (packageJson.peerDependencies && packageJson.peerDependencies[dependencyName]) {
      const currentVersion = packageJson.peerDependencies[dependencyName];
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageJson.peerDependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageJson.peerDependencies[dependencyName] = newVersion;
      }
    }
    
    const fs = await import('fs/promises');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // 更新缓存
    if (packageInfo.dependencies[dependencyName]) {
      const currentVersion = packageInfo.dependencies[dependencyName];
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新缓存
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageInfo.dependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageInfo.dependencies[dependencyName] = newVersion;
      }
    }
    if (packageInfo.devDependencies[dependencyName]) {
      const currentVersion = packageInfo.devDependencies[dependencyName];
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新缓存
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageInfo.devDependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageInfo.devDependencies[dependencyName] = newVersion;
      }
    }
    if (packageInfo.peerDependencies[dependencyName]) {
      const currentVersion = packageInfo.peerDependencies[dependencyName];
      if (this.isWorkspaceDependency(currentVersion) && isSpecialWorkspaceVersion(currentVersion)) {
        // 保持原样，不更新缓存
      } else if (this.isWorkspaceDependency(currentVersion)) {
        packageInfo.peerDependencies[dependencyName] = `workspace:${newVersion}`;
      } else {
        packageInfo.peerDependencies[dependencyName] = newVersion;
      }
    }
    
    this.packagesCache.set(packageName, packageInfo);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.packagesCache.clear();
    this.dependencyGraph = {};
  }
} 