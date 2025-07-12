"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const config_1 = require("../core/config");
class ConfigCommand {
    constructor(rootPath = process.cwd()) {
        this.configManager = new config_1.ConfigManager(rootPath);
    }
    async execute(options) {
        try {
            if (options.init) {
                await this.initConfig();
            }
            else if (options.reset) {
                await this.resetConfig();
            }
            else if (options.show) {
                await this.showConfig();
            }
            else {
                console.log('请指定一个配置操作选项: --init, --reset, 或 --show');
            }
        }
        catch (error) {
            console.error('❌ 配置操作失败:', error);
            process.exit(1);
        }
    }
    async initConfig() {
        console.log('🔧 初始化配置文件...');
        await this.configManager.createConfigFile();
        console.log('✅ 配置文件已创建');
    }
    async resetConfig() {
        console.log('🔄 重置配置为默认值...');
        await this.configManager.resetConfig();
        console.log('✅ 配置已重置');
    }
    async showConfig() {
        console.log('📋 当前配置:');
        const config = await this.configManager.readConfig();
        console.log(JSON.stringify(config, null, 2));
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=config.js.map