import { PublishManager } from '../core/publish';
import { WorkspaceManager } from '../core/workspace';
import { PublishOptions, PackagePublishInfo, PublishResult } from '../types';
import { checkbox, confirm } from '@inquirer/prompts';

export class PublishCommand {
  private publishManager: PublishManager;
  private workspaceManager: WorkspaceManager;
  private verbose: boolean = false;

  constructor(rootPath: string = process.cwd()) {
    this.publishManager = new PublishManager(rootPath);
    this.workspaceManager = new WorkspaceManager(rootPath);
  }

  async execute(options: PublishOptions): Promise<void> {
    try {
      this.verbose = options.verbose || false;
      this.publishManager.setVerbose(this.verbose);

      if (this.verbose) {
        console.log('🚀 开始发布包...');
      }

      // 1. 检查环境
      await this.checkEnvironment();

      // 2. 设置 registry
      if (options.registry) {
        this.publishManager.setRegistry(options.registry);
      }

      // 3. 获取要发布的包
      const packages = await this.publishManager.filterPackages(options);
      
      if (packages.length === 0) {
        console.log('📦 没有找到要发布的包');
        return;
      }

      // 4. 检查包的发布状态
      const publishInfoList = await this.publishManager.getPackagePublishInfo(packages);
      
      // 5. 过滤出需要发布的包
      const needsPublishList = publishInfoList.filter(info => 
        !info.isPrivate && (info.needsPublish || options.force)
      );

      // 6. 显示发布预览
      await this.showPublishPreview(publishInfoList, options);

      // 7. 确认发布
      if (!options.dryRun && needsPublishList.length > 0) {
        const shouldContinue = await this.confirmPublish(needsPublishList, options);
        if (!shouldContinue) {
          console.log('📦 取消发布');
          return;
        }
      }

      // 8. 执行发布
      const publishResults = await this.publishManager.publishPackages(needsPublishList, options);

      // 9. 显示发布结果
      await this.showPublishResults(publishResults);

    } catch (error) {
      console.error('❌ 发布失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async checkEnvironment(): Promise<void> {
    // 检查是否是 pnpm workspace
    const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
    if (!isPnpmWorkspace) {
      throw new Error('当前目录不是 pnpm workspace');
    }

    // 检查是否有 npm
    const { spawn } = await import('child_process');
    const checkNpm = () => {
      return new Promise<boolean>((resolve) => {
        const child = spawn('npm', ['--version'], { stdio: 'pipe' });
        child.on('close', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
      });
    };

    if (!(await checkNpm())) {
      throw new Error('npm 命令不可用，请确保已安装 npm');
    }
  }

  private async showPublishPreview(
    publishInfoList: PackagePublishInfo[],
    options: PublishOptions
  ): Promise<void> {
    console.log('\n📋 发布预览:');
    console.log('='.repeat(60));

    for (const info of publishInfoList) {
      const status = this.getPackageStatus(info, options);
      const latestInfo = info.latestVersion ? ` (当前最新: ${info.latestVersion})` : '';
      
      console.log(`📦 ${info.name}@${info.version}${latestInfo}`);
      console.log(`   路径: ${info.path}`);
      console.log(`   状态: ${status}`);
      
      if (info.error) {
        console.log(`   错误: ${info.error}`);
      }
      
      console.log('');
    }
  }

  private getPackageStatus(info: PackagePublishInfo, options: PublishOptions): string {
    if (info.isPrivate) {
      return '🔒 私有包 - 跳过';
    }

    if (info.error && !info.error.includes('404')) {
      return '❌ 检查失败';
    }

    if (info.needsPublish) {
      return options.dryRun ? '✅ 将发布 (预览模式)' : '📤 需要发布';
    }

    if (options.force) {
      return options.dryRun ? '🔄 强制发布 (预览模式)' : '🔄 强制发布';
    }

    return '✅ 版本已存在 - 跳过';
  }

  private async confirmPublish(
    needsPublishList: PackagePublishInfo[],
    options: PublishOptions
  ): Promise<boolean> {
    if (needsPublishList.length === 0) {
      return true;
    }

    console.log(`\n📤 即将发布 ${needsPublishList.length} 个包:`);
    needsPublishList.forEach(info => {
      console.log(`   • ${info.name}@${info.version}`);
    });

    const publishOptions = [];
    if (options.registry) {
      publishOptions.push(`Registry: ${options.registry}`);
    }
    if (options.tag) {
      publishOptions.push(`Tag: ${options.tag}`);
    }
    if (options.access) {
      publishOptions.push(`Access: ${options.access}`);
    }

    if (publishOptions.length > 0) {
      console.log('\n⚙️  发布选项:');
      publishOptions.forEach(opt => console.log(`   • ${opt}`));
    }

    const confirmed = await confirm({
      message: '确认发布这些包吗？',
      default: false
    });

    return confirmed;
  }

  private async showPublishResults(results: PublishResult[]): Promise<void> {
    console.log('\n📊 发布结果:');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success && !r.skipped);
    const skipped = results.filter(r => r.skipped);

    console.log(`✅ 成功: ${successful.length}`);
    console.log(`❌ 失败: ${failed.length}`);
    console.log(`⏭️  跳过: ${skipped.length}`);

    if (successful.length > 0) {
      console.log('\n✅ 发布成功的包:');
      successful.forEach(result => {
        console.log(`   • ${result.packageName}@${result.version}`);
        if (result.message && this.verbose) {
          console.log(`     ${result.message}`);
        }
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ 发布失败的包:');
      failed.forEach(result => {
        console.log(`   • ${result.packageName}@${result.version}`);
        if (result.error) {
          console.log(`     错误: ${result.error}`);
        }
      });
    }

    if (skipped.length > 0) {
      console.log('\n⏭️  跳过的包:');
      skipped.forEach(result => {
        console.log(`   • ${result.packageName}@${result.version}`);
        if (result.reason) {
          console.log(`     原因: ${result.reason}`);
        }
      });
    }

    // 显示总结
    console.log('\n' + '='.repeat(60));
    if (failed.length > 0) {
      console.log('❌ 发布过程中遇到错误，请检查上述失败的包');
    } else if (successful.length > 0) {
      console.log('🎉 所有包发布成功！');
    } else {
      console.log('📦 没有包需要发布');
    }
  }
} 