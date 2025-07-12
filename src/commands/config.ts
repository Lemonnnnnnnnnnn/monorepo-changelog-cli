import { ConfigManager } from '../core/config';

export interface ConfigOptions {
  init?: boolean;
  reset?: boolean;
  show?: boolean;
}

export class ConfigCommand {
  private configManager: ConfigManager;

  constructor(rootPath: string = process.cwd()) {
    this.configManager = new ConfigManager(rootPath);
  }

  async execute(options: ConfigOptions): Promise<void> {
    try {
      if (options.init) {
        await this.initConfig();
      } else if (options.reset) {
        await this.resetConfig();
      } else if (options.show) {
        await this.showConfig();
      } else {
        console.log('请指定一个配置操作选项: --init, --reset, 或 --show');
      }
    } catch (error) {
      console.error('❌ 配置操作失败:', error);
      process.exit(1);
    }
  }

  private async initConfig(): Promise<void> {
    console.log('🔧 初始化配置文件...');
    await this.configManager.createConfigFile();
    console.log('✅ 配置文件已创建');
  }

  private async resetConfig(): Promise<void> {
    console.log('🔄 重置配置为默认值...');
    await this.configManager.resetConfig();
    console.log('✅ 配置已重置');
  }

  private async showConfig(): Promise<void> {
    console.log('📋 当前配置:');
    const config = await this.configManager.readConfig();
    console.log(JSON.stringify(config, null, 2));
  }
} 