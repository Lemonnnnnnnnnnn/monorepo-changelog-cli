#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const update_1 = require("./commands/update");
const program = new commander_1.Command();
program
    .name('changelog-cli')
    .description('基于 git commit 记录生成 changelog 的 CLI 工具，主要服务于 pnpm monorepo 架构')
    .version('1.0.0');
program
    .command('init')
    .description('初始化 changelog 配置和生成初始的 changelog 文件')
    .option('-c, --config <path>', '配置文件路径')
    .option('-v, --verbose', '详细输出')
    .option('--dry-run', '预览模式，不实际创建文件')
    .action(async (options) => {
    const initCommand = new init_1.InitCommand();
    await initCommand.execute(options);
});
program
    .command('update')
    .description('更新 changelog 和版本号')
    .option('-p, --packages <packages...>', '指定要更新的包名')
    .option('-a, --all', '更新所有包')
    .option('-t, --type <type>', '版本更新类型 (major|minor|patch)')
    .option('-c, --config <path>', '配置文件路径')
    .option('-v, --verbose', '详细输出')
    .option('--dry-run', '预览模式，不实际更新文件')
    .action(async (options) => {
    const updateCommand = new update_1.UpdateCommand();
    await updateCommand.execute(options);
});
program
    .command('config')
    .description('配置管理')
    .option('--init', '初始化配置文件')
    .option('--reset', '重置配置为默认值')
    .option('--show', '显示当前配置')
    .action(async (options) => {
    const { ConfigCommand } = await Promise.resolve().then(() => __importStar(require('./commands/config')));
    const configCommand = new ConfigCommand();
    await configCommand.execute(options);
});
program
    .command('status')
    .description('显示当前状态')
    .option('-v, --verbose', '详细输出')
    .action(async (options) => {
    const { StatusCommand } = await Promise.resolve().then(() => __importStar(require('./commands/status')));
    const statusCommand = new StatusCommand();
    await statusCommand.execute(options);
});
program.on('command:*', () => {
    console.error('无效的命令: %s\n请参考 --help 查看可用命令', program.args.join(' '));
    process.exit(1);
});
if (process.argv.length === 2) {
    program.help();
}
program.parse(process.argv);
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map