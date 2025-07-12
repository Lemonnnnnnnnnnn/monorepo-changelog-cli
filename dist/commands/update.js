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
exports.UpdateCommand = void 0;
const git_1 = require("../core/git");
const workspace_1 = require("../core/workspace");
const cache_1 = require("../core/cache");
const config_1 = require("../core/config");
const changelog_1 = require("../core/changelog");
const version_1 = require("../core/version");
class UpdateCommand {
    constructor(rootPath = process.cwd()) {
        this.verbose = false;
        this.gitManager = new git_1.GitManager(rootPath);
        this.workspaceManager = new workspace_1.WorkspaceManager(rootPath);
        this.cacheManager = new cache_1.CacheManager(rootPath);
        this.configManager = new config_1.ConfigManager(rootPath);
        this.changelogGenerator = new changelog_1.ChangelogGenerator(rootPath);
        this.versionManager = new version_1.VersionManager();
    }
    async execute(options) {
        try {
            this.verbose = options.verbose || false;
            if (this.verbose) {
                console.log('🚀 开始更新 changelog 和版本...');
            }
            await this.checkEnvironment();
            await this.loadConfiguration(options.config);
            const packages = await this.getPackages();
            await this.initializeVersionManager(packages);
            const targetPackages = await this.determineTargetPackages(options, packages);
            const newCommits = await this.getNewCommits(targetPackages);
            const updateStrategies = await this.createUpdateStrategies(packages, targetPackages, newCommits, options.type);
            await this.checkVersionConflicts(packages, updateStrategies);
            if (options.dryRun) {
                await this.previewUpdate(packages, updateStrategies, newCommits);
            }
            else {
                await this.executeUpdate(packages, updateStrategies, newCommits);
            }
            console.log('✅ 更新完成！');
        }
        catch (error) {
            console.error('❌ 更新失败:', error);
            process.exit(1);
        }
    }
    async checkEnvironment() {
        if (this.verbose) {
            console.log('🔍 检查环境...');
        }
        const isGitRepo = await this.gitManager.isGitRepository();
        if (!isGitRepo) {
            throw new Error('当前目录不是 Git 仓库');
        }
        const isPnpmWorkspace = await this.workspaceManager.isPnpmWorkspace();
        if (!isPnpmWorkspace) {
            throw new Error('当前目录不是 pnpm workspace');
        }
        if (this.verbose) {
            console.log('✅ 环境检查通过');
        }
    }
    async loadConfiguration(configPath) {
        if (this.verbose) {
            console.log('⚙️ 读取配置...');
        }
        if (configPath) {
            console.log(`使用配置文件: ${configPath}`);
        }
        const config = await this.configManager.readConfig();
        if (this.verbose) {
            console.log('✅ 配置读取完成');
        }
    }
    async getPackages() {
        if (this.verbose) {
            console.log('📦 获取包信息...');
        }
        const packages = await this.workspaceManager.getAllPackages();
        if (this.verbose) {
            console.log(`✅ 发现 ${packages.length} 个包`);
        }
        return packages;
    }
    async initializeVersionManager(packages) {
        const dependencyGraph = await this.workspaceManager.getDependencyGraph();
        this.versionManager.updateDependencyGraph(dependencyGraph);
    }
    async determineTargetPackages(options, packages) {
        if (options.all) {
            return packages.map(pkg => pkg.name);
        }
        if (options.packages && options.packages.length > 0) {
            const validPackages = [];
            for (const packageName of options.packages) {
                const pkg = await this.workspaceManager.getPackageByName(packageName);
                if (pkg) {
                    validPackages.push(packageName);
                }
                else {
                    console.warn(`⚠️ 包 '${packageName}' 不存在`);
                }
            }
            return validPackages;
        }
        return await this.selectPackagesInteractively(packages);
    }
    async selectPackagesInteractively(packages) {
        const inquirer = await Promise.resolve().then(() => __importStar(require('inquirer')));
        const { selectedPackages } = await inquirer.default.prompt([
            {
                type: 'checkbox',
                name: 'selectedPackages',
                message: '选择要更新的包:',
                choices: packages.map(pkg => ({
                    name: `${pkg.name}@${pkg.version}`,
                    value: pkg.name
                })),
                validate: (input) => {
                    if (input.length === 0) {
                        return '请至少选择一个包';
                    }
                    return true;
                }
            }
        ]);
        return selectedPackages;
    }
    async getNewCommits(targetPackages) {
        if (this.verbose) {
            console.log('📝 获取新提交...');
        }
        const newCommits = new Map();
        for (const packageName of targetPackages) {
            const pkg = await this.workspaceManager.getPackageByName(packageName);
            if (!pkg) {
                continue;
            }
            const lastCommit = await this.cacheManager.getPackageLastCommit(packageName);
            const commits = await this.gitManager.getCommitsForPath(pkg.path, lastCommit || undefined);
            newCommits.set(packageName, commits);
            if (this.verbose) {
                console.log(`  - ${packageName}: ${commits.length} 个新提交`);
            }
        }
        return newCommits;
    }
    async createUpdateStrategies(packages, targetPackages, newCommits, bumpType) {
        if (this.verbose) {
            console.log('📋 创建版本更新策略...');
        }
        const strategies = [];
        const allPackagesToUpdate = this.versionManager.getPackagesToUpdate(targetPackages);
        for (const packageName of allPackagesToUpdate) {
            const pkg = packages.find(p => p.name === packageName);
            if (!pkg) {
                continue;
            }
            const commits = newCommits.get(packageName) || [];
            const isDirectTarget = targetPackages.includes(packageName);
            if (isDirectTarget && commits.length > 0) {
                const commitMessages = commits.map(c => c.message);
                const calculatedBumpType = this.versionManager.calculateVersionBump(pkg.version, commitMessages, bumpType);
                strategies.push({
                    type: calculatedBumpType,
                    package: packageName,
                    reason: '直接更新'
                });
            }
            else if (!isDirectTarget) {
                strategies.push({
                    type: bumpType || 'patch',
                    package: packageName,
                    reason: '依赖更新'
                });
            }
        }
        return strategies;
    }
    async checkVersionConflicts(packages, strategies) {
        if (this.verbose) {
            console.log('🔍 检查版本冲突...');
        }
        const conflicts = this.versionManager.checkVersionConflicts(packages, strategies);
        if (conflicts.length > 0) {
            console.error('❌ 发现版本冲突:');
            conflicts.forEach(conflict => {
                console.error(`  - ${conflict}`);
            });
            throw new Error('版本冲突，请解决后重试');
        }
        if (this.verbose) {
            console.log('✅ 无版本冲突');
        }
    }
    async previewUpdate(packages, strategies, newCommits) {
        console.log('\n📋 预览模式 - 将要执行的更新:');
        const preview = this.versionManager.previewVersionUpdate(packages, strategies);
        console.log('\n版本更新:');
        preview.forEach(item => {
            console.log(`  📦 ${item.package}: ${item.currentVersion} -> ${item.newVersion} (${item.reason})`);
        });
        console.log('\nChangelog 更新:');
        newCommits.forEach((commits, packageName) => {
            if (commits.length > 0) {
                console.log(`  📄 ${packageName}/CHANGELOG.md (${commits.length} 个新提交)`);
            }
        });
    }
    async executeUpdate(packages, strategies, newCommits) {
        if (this.verbose) {
            console.log('🔄 执行更新...');
        }
        await this.versionManager.batchUpdateVersions(packages, strategies);
        await this.updateChangelogFiles(packages, strategies, newCommits);
        await this.updateCache(packages, newCommits);
        if (this.verbose) {
            console.log('✅ 更新执行完成');
        }
    }
    async updateChangelogFiles(packages, strategies, newCommits) {
        if (this.verbose) {
            console.log('📄 更新 changelog 文件...');
        }
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        for (const strategy of strategies) {
            const pkg = packageMap.get(strategy.package);
            const commits = newCommits.get(strategy.package) || [];
            if (!pkg || commits.length === 0) {
                continue;
            }
            const newVersion = this.versionManager.calculateNewVersion(pkg.version, strategy.type);
            const latestCommit = commits[0];
            await this.changelogGenerator.generatePackageChangelog({ ...pkg, version: newVersion }, commits, latestCommit.hash);
            if (this.verbose) {
                console.log(`✅ 更新 ${pkg.name} 的 changelog`);
            }
        }
    }
    async updateCache(packages, newCommits) {
        if (this.verbose) {
            console.log('💾 更新缓存...');
        }
        const packageCommits = {};
        newCommits.forEach((commits, packageName) => {
            if (commits.length > 0) {
                packageCommits[packageName] = commits[0].hash;
            }
        });
        await this.cacheManager.batchUpdatePackageCommits(packageCommits);
        const latestCommit = await this.gitManager.getLatestCommitHash();
        if (latestCommit) {
            await this.cacheManager.setGlobalLastCommit(latestCommit);
        }
        if (this.verbose) {
            console.log('✅ 缓存更新完成');
        }
    }
}
exports.UpdateCommand = UpdateCommand;
//# sourceMappingURL=update.js.map