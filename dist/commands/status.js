"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCommand = void 0;
const git_1 = require("../core/git");
const workspace_1 = require("../core/workspace");
const cache_1 = require("../core/cache");
const config_1 = require("../core/config");
class StatusCommand {
    constructor(rootPath = process.cwd()) {
        this.gitManager = new git_1.GitManager(rootPath);
        this.workspaceManager = new workspace_1.WorkspaceManager(rootPath);
        this.cacheManager = new cache_1.CacheManager(rootPath);
        this.configManager = new config_1.ConfigManager(rootPath);
    }
    async execute(options) {
        try {
            console.log('📊 项目状态报告');
            console.log('='.repeat(50));
            await this.checkEnvironmentStatus();
            await this.checkConfigStatus();
            await this.checkCacheStatus();
            await this.checkPackageStatus(options.verbose);
            console.log('='.repeat(50));
            console.log('✅ 状态检查完成');
        }
        catch (error) {
            console.error('❌ 状态检查失败:', error);
            process.exit(1);
        }
    }
    async checkEnvironmentStatus() {
        console.log('\n🔍 环境状态:');
        const isGitRepo = await this.gitManager.isGitRepository();
        console.log(`  Git 仓库: ${isGitRepo ? '✅' : '❌'}`);
        const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
        console.log(`  Pnpm workspace: ${isPnpmWorkspace ? '✅' : '❌'}`);
        if (isGitRepo) {
            const latestCommit = await this.gitManager.getLatestCommitHash();
            console.log(`  最新提交: ${latestCommit.substring(0, 7)}`);
        }
    }
    async checkConfigStatus() {
        console.log('\n⚙️ 配置状态:');
        const hasConfig = this.configManager.hasConfigFile();
        console.log(`  配置文件: ${hasConfig ? '✅' : '❌'}`);
        if (hasConfig) {
            const config = await this.configManager.readConfig();
            console.log(`  提交类型过滤: ${config.commitTypes.join(', ')}`);
            console.log(`  包含所有提交: ${config.includeAllCommits ? '是' : '否'}`);
            console.log(`  常规提交格式: ${config.conventionalCommits ? '是' : '否'}`);
        }
    }
    async checkCacheStatus() {
        console.log('\n💾 缓存状态:');
        const cacheStatus = await this.cacheManager.getCacheStatus();
        console.log(`  缓存文件: ${cacheStatus.exists ? '✅' : '❌'}`);
        if (cacheStatus.exists) {
            console.log(`  有效性: ${cacheStatus.valid ? '✅' : '⚠️'}`);
            console.log(`  最后更新: ${cacheStatus.lastUpdateTime?.toLocaleString() || 'N/A'}`);
            console.log(`  包数量: ${cacheStatus.packageCount || 0}`);
        }
    }
    async checkPackageStatus(verbose) {
        console.log('\n📦 包状态:');
        try {
            const packages = await this.workspaceManager.getAllPackages();
            console.log(`  总包数: ${packages.length}`);
            if (verbose) {
                console.log('\n  包列表:');
                packages.forEach(pkg => {
                    console.log(`    - ${pkg.name}@${pkg.version}`);
                    console.log(`      路径: ${pkg.path}`);
                    console.log(`      依赖: ${Object.keys(pkg.dependencies).length}`);
                    console.log(`      开发依赖: ${Object.keys(pkg.devDependencies).length}`);
                });
            }
            const dependencyGraph = await this.workspaceManager.getDependencyGraph();
            const internalDeps = Object.values(dependencyGraph).flat().length;
            console.log(`  内部依赖关系: ${internalDeps}`);
        }
        catch (error) {
            console.log('  ❌ 无法获取包信息');
        }
    }
}
exports.StatusCommand = StatusCommand;
//# sourceMappingURL=status.js.map