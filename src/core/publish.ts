import { spawn } from 'child_process';
import { promisify } from 'util';
import { PackageInfo, PublishOptions, PackagePublishInfo, NpmRegistryInfo, PublishResult } from '../types';
import { WorkspaceManager } from './workspace';

export class PublishManager {
  private workspaceManager: WorkspaceManager;
  private registry: string;
  private verbose: boolean = false;

  constructor(rootPath: string = process.cwd()) {
    this.workspaceManager = new WorkspaceManager(rootPath);
    this.registry = 'https://registry.npmjs.org';
  }

  /**
   * 设置 npm registry
   */
  setRegistry(registry: string): void {
    this.registry = registry;
  }

  /**
   * 设置详细模式
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * 获取包的发布信息
   */
  async getPackagePublishInfo(packages: PackageInfo[]): Promise<PackagePublishInfo[]> {
    const publishInfoList: PackagePublishInfo[] = [];

    for (const pkg of packages) {
      this.log(`正在检查包 ${pkg.name} 的发布状态...`);

      // 检查是否是私有包
      if (await this.isPrivatePackage(pkg)) {
        publishInfoList.push({
          name: pkg.name,
          version: pkg.version,
          path: pkg.path,
          needsPublish: false,
          publishedVersions: [],
          isPrivate: true
        });
        continue;
      }

      try {
        const registryInfo = await this.getNpmRegistryInfo(pkg.name);
        const publishedVersions = registryInfo.versions ? Object.keys(registryInfo.versions) : [];
        const latestVersion = registryInfo['dist-tags']?.latest;
        const needsPublish = !publishedVersions.includes(pkg.version);

        publishInfoList.push({
          name: pkg.name,
          version: pkg.version,
          path: pkg.path,
          needsPublish,
          publishedVersions,
          latestVersion,
          isPrivate: false
        });
      } catch (error) {
        // 如果包不存在于 npm registry，说明需要首次发布
        const isNotFound = error instanceof Error && error.message.includes('404');
        publishInfoList.push({
          name: pkg.name,
          version: pkg.version,
          path: pkg.path,
          needsPublish: isNotFound,
          publishedVersions: [],
          isPrivate: false,
          error: isNotFound ? undefined : error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return publishInfoList;
  }

  /**
   * 从 npm registry 获取包信息
   */
  private async getNpmRegistryInfo(packageName: string): Promise<NpmRegistryInfo> {
    const url = `${this.registry}/${packageName}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as NpmRegistryInfo;
    } catch (error) {
      throw new Error(`获取包 ${packageName} 信息失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 检查是否是私有包
   */
  private async isPrivatePackage(pkg: PackageInfo): Promise<boolean> {
    try {
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      
      const packageJsonPath = join(pkg.path, 'package.json');
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      return packageJson.private === true;
    } catch (error) {
      this.log(`检查包 ${pkg.name} 是否为私有包时出错: ${error}`);
      return false;
    }
  }

  /**
   * 发布包
   */
  async publishPackage(
    publishInfo: PackagePublishInfo,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const { name, version, path } = publishInfo;

    if (publishInfo.isPrivate) {
      return {
        packageName: name,
        version,
        success: false,
        skipped: true,
        reason: '私有包，跳过发布'
      };
    }

    if (!publishInfo.needsPublish && !options.force) {
      return {
        packageName: name,
        version,
        success: false,
        skipped: true,
        reason: `版本 ${version} 已存在于 npm registry`
      };
    }

    if (options.dryRun) {
      return {
        packageName: name,
        version,
        success: true,
        message: '干运行模式，跳过实际发布',
        skipped: true
      };
    }

    try {
      this.log(`正在发布包 ${name}@${version}...`);
      
      const publishArgs = ['publish'];
      
      if (options.registry) {
        publishArgs.push('--registry', options.registry);
      }
      
      if (options.tag) {
        publishArgs.push('--tag', options.tag);
      }
      
      if (options.access) {
        publishArgs.push('--access', options.access);
      }

      const result = await this.executeCommand('npm', publishArgs, path);
      
      if (result.success) {
        this.log(`✅ 包 ${name}@${version} 发布成功`);
        return {
          packageName: name,
          version,
          success: true,
          message: result.output
        };
      } else {
        this.log(`❌ 包 ${name}@${version} 发布失败: ${result.error}`);
        return {
          packageName: name,
          version,
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.log(`❌ 包 ${name}@${version} 发布失败: ${errorMessage}`);
      return {
        packageName: name,
        version,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 批量发布包
   */
  async publishPackages(
    publishInfoList: PackagePublishInfo[],
    options: PublishOptions = {}
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const publishInfo of publishInfoList) {
      const result = await this.publishPackage(publishInfo, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 根据选项过滤包
   */
  async filterPackages(options: PublishOptions): Promise<PackageInfo[]> {
    const allPackages = await this.workspaceManager.getAllPackages();

    if (options.packages && options.packages.length > 0) {
      return allPackages.filter(pkg => options.packages!.includes(pkg.name));
    }

    if (options.all) {
      return allPackages;
    }

    // 默认返回所有包
    return allPackages;
  }

  /**
   * 执行命令
   */
  private async executeCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout.trim() });
        } else {
          resolve({ success: false, error: stderr.trim() || stdout.trim() });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
} 