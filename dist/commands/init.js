"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const git_1 = require("../core/git");
const workspace_1 = require("../core/workspace");
const cache_1 = require("../core/cache");
const config_1 = require("../core/config");
const changelog_1 = require("../core/changelog");
class InitCommand {
    constructor(rootPath = process.cwd()) {
        this.verbose = false;
        this.gitManager = new git_1.GitManager(rootPath);
        this.workspaceManager = new workspace_1.WorkspaceManager(rootPath);
        this.cacheManager = new cache_1.CacheManager(rootPath);
        this.configManager = new config_1.ConfigManager(rootPath);
        this.changelogGenerator = new changelog_1.ChangelogGenerator(rootPath);
    }
    async execute(options) {
        try {
            this.verbose = options.verbose || false;
            if (this.verbose) {
                console.log('🚀 开始初始化 changelog 配置...');
            }
            await this.checkEnvironment();
            await this.initializeConfig(options.config);
            const commits = await this.collectCommits();
            const packages = await this.getPackages();
            const packageCommits = await this.analyzePackageCommits(commits, packages);
            if (!options.dryRun) {
                await this.generateChangelogFiles(packageCommits);
            }
            else {
                this.previewChanges(packageCommits);
            }
            if (!options.dryRun) {
                await this.updateCache(commits, packages);
            }
            console.log('✅ 初始化完成！');
        }
        catch (error) {
            console.error('❌ 初始化失败:', error);
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
    async initializeConfig(configPath) {
        if (this.verbose) {
            console.log('⚙️ 初始化配置...');
        }
        if (configPath) {
            console.log(`使用配置文件: ${configPath}`);
        }
        else {
            await this.configManager.createConfigFile();
            if (this.verbose) {
                console.log('✅ 创建默认配置文件');
            }
        }
    }
    async collectCommits() {
        if (this.verbose) {
            console.log('📝 收集提交信息...');
        }
        const commits = await this.gitManager.getAllCommits();
        if (this.verbose) {
            console.log(`✅ 收集到 ${commits.length} 个提交`);
        }
        return commits;
    }
    async getPackages() {
        if (this.verbose) {
            console.log('📦 获取包信息...');
        }
        const packages = await this.workspaceManager.getAllPackages();
        if (this.verbose) {
            console.log(`✅ 发现 ${packages.length} 个包:`);
            packages.forEach(pkg => {
                console.log(`  - ${pkg.name}@${pkg.version}`);
            });
        }
        return packages;
    }
    async analyzePackageCommits(commits, packages) {
        if (this.verbose) {
            console.log('🔍 分析提交与包的关系...');
        }
        const packageCommits = new Map();
        packages.forEach(pkg => {
            packageCommits.set(pkg.name, []);
        });
        for (const commit of commits) {
            const affectedPackages = await this.getAffectedPackages(commit, packages);
            for (const pkg of affectedPackages) {
                const commitList = packageCommits.get(pkg.name) || [];
                commitList.push(commit);
                packageCommits.set(pkg.name, commitList);
            }
        }
        if (this.verbose) {
            console.log('✅ 分析完成:');
            packageCommits.forEach((commits, packageName) => {
                console.log(`  - ${packageName}: ${commits.length} 个相关提交`);
            });
        }
        return packageCommits;
    }
    async getAffectedPackages(commit, packages) {
        const affectedPackages = [];
        for (const file of commit.files) {
            const packagesByFile = await this.workspaceManager.getPackagesByFilePath(file);
            for (const pkg of packagesByFile) {
                if (!affectedPackages.find(p => p.name === pkg.name)) {
                    affectedPackages.push(pkg);
                }
            }
        }
        return affectedPackages;
    }
    async generateChangelogFiles(packageCommits) {
        if (this.verbose) {
            console.log('📄 生成 changelog 文件...');
        }
        const config = await this.configManager.readConfig();
        const commitTypes = config.commitTypes;
        const includeAll = config.includeAllCommits;
        for (const [packageName, commits] of packageCommits) {
            const pkg = await this.workspaceManager.getPackageByName(packageName);
            if (!pkg) {
                continue;
            }
            const filteredCommits = includeAll
                ? commits
                : commits.filter(commit => {
                    return !commit.type || commitTypes.includes(commit.type);
                });
            if (filteredCommits.length === 0) {
                continue;
            }
            const latestCommit = filteredCommits[0];
            await this.changelogGenerator.generatePackageChangelog(pkg, filteredCommits, latestCommit.hash);
            if (this.verbose) {
                console.log(`✅ 生成 ${pkg.name} 的 changelog (${filteredCommits.length} 个提交)`);
            }
        }
    }
    previewChanges(packageCommits) {
        console.log('\n📋 预览模式 - 将要生成的文件:');
        packageCommits.forEach((commits, packageName) => {
            if (commits.length > 0) {
                console.log(`📄 ${packageName}/CHANGELOG.md (${commits.length} 个提交)`);
            }
        });
    }
    async updateCache(commits, packages) {
        if (this.verbose) {
            console.log('💾 更新缓存...');
        }
        const latestCommit = commits[0];
        if (latestCommit) {
            await this.cacheManager.setGlobalLastCommit(latestCommit.hash);
        }
        const packageCommits = {};
        for (const pkg of packages) {
            const relevantCommits = commits.filter(commit => commit.files.some(file => file.startsWith(pkg.path)));
            if (relevantCommits.length > 0) {
                packageCommits[pkg.name] = relevantCommits[0].hash;
            }
        }
        await this.cacheManager.batchUpdatePackageCommits(packageCommits);
        if (this.verbose) {
            console.log('✅ 缓存更新完成');
        }
    }
}
exports.InitCommand = InitCommand;
//# sourceMappingURL=init.js.map