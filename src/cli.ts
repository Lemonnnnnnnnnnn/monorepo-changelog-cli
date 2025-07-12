#!/usr/bin/env node

import { Command } from 'commander';
import { InitCommand } from './commands/init';
import { UpdateCommand } from './commands/update';

const program = new Command();

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
    const initCommand = new InitCommand();
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
    const updateCommand = new UpdateCommand();
    await updateCommand.execute(options);
  });

program
  .command('config')
  .description('配置管理')
  .option('--init', '初始化配置文件')
  .option('--reset', '重置配置为默认值')
  .option('--show', '显示当前配置')
  .action(async (options) => {
    const { ConfigCommand } = await import('./commands/config');
    const configCommand = new ConfigCommand();
    await configCommand.execute(options);
  });

program
  .command('status')
  .description('显示当前状态')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    const { StatusCommand } = await import('./commands/status');
    const statusCommand = new StatusCommand();
    await statusCommand.execute(options);
  });

// 处理未知命令
program.on('command:*', () => {
  console.error('无效的命令: %s\n请参考 --help 查看可用命令', program.args.join(' '));
  process.exit(1);
});

// 如果没有提供参数，显示帮助
if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
}); 