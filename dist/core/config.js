"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const constants_1 = require("../utils/constants");
class ConfigManager {
    constructor(rootPath = process.cwd()) {
        this.cachedConfig = null;
        this.rootPath = rootPath;
        this.configFile = (0, path_1.join)(rootPath, constants_1.CONFIG_FILE_NAME);
    }
    async readConfig() {
        if (this.cachedConfig) {
            return this.cachedConfig;
        }
        const config = this.loadConfigFromFile();
        this.cachedConfig = config;
        return config;
    }
    loadConfigFromFile() {
        try {
            if (!(0, fs_1.existsSync)(this.configFile)) {
                return this.createDefaultConfig();
            }
            const content = (0, fs_1.readFileSync)(this.configFile, 'utf-8');
            const fileConfig = JSON.parse(content);
            const mergedConfig = { ...constants_1.DEFAULT_CONFIG, ...fileConfig };
            this.validateConfig(mergedConfig);
            return mergedConfig;
        }
        catch (error) {
            console.warn('读取配置文件失败，使用默认配置:', error);
            return this.createDefaultConfig();
        }
    }
    createDefaultConfig() {
        return {
            outputDir: constants_1.DEFAULT_CONFIG.outputDir,
            cacheDir: constants_1.DEFAULT_CONFIG.cacheDir,
            commitTypes: constants_1.DEFAULT_CONFIG.commitTypes,
            includeAllCommits: constants_1.DEFAULT_CONFIG.includeAllCommits,
            conventionalCommits: constants_1.DEFAULT_CONFIG.conventionalCommits,
            dependencyUpdate: constants_1.DEFAULT_CONFIG.dependencyUpdate,
            excludePatterns: constants_1.DEFAULT_CONFIG.excludePatterns
        };
    }
    validateConfig(config) {
        if (!config.outputDir || typeof config.outputDir !== 'string') {
            throw new Error('配置项 outputDir 必须是字符串');
        }
        if (!config.cacheDir || typeof config.cacheDir !== 'string') {
            throw new Error('配置项 cacheDir 必须是字符串');
        }
        if (!Array.isArray(config.commitTypes)) {
            throw new Error('配置项 commitTypes 必须是数组');
        }
        if (typeof config.includeAllCommits !== 'boolean') {
            throw new Error('配置项 includeAllCommits 必须是布尔值');
        }
        if (typeof config.conventionalCommits !== 'boolean') {
            throw new Error('配置项 conventionalCommits 必须是布尔值');
        }
        if (typeof config.dependencyUpdate !== 'boolean') {
            throw new Error('配置项 dependencyUpdate 必须是布尔值');
        }
        if (!Array.isArray(config.excludePatterns)) {
            throw new Error('配置项 excludePatterns 必须是数组');
        }
    }
    async saveConfig(config) {
        try {
            this.validateConfig(config);
            const configJson = JSON.stringify(config, null, 2);
            (0, fs_1.writeFileSync)(this.configFile, configJson);
            this.cachedConfig = config;
        }
        catch (error) {
            console.error('保存配置文件失败:', error);
            throw error;
        }
    }
    async updateConfig(updates) {
        const currentConfig = await this.readConfig();
        const newConfig = { ...currentConfig, ...updates };
        await this.saveConfig(newConfig);
    }
    async resetConfig() {
        const defaultConfig = this.createDefaultConfig();
        await this.saveConfig(defaultConfig);
    }
    hasConfigFile() {
        return (0, fs_1.existsSync)(this.configFile);
    }
    async createConfigFile() {
        if (!this.hasConfigFile()) {
            const defaultConfig = this.createDefaultConfig();
            await this.saveConfig(defaultConfig);
        }
    }
    async getCommitTypeFilter() {
        const config = await this.readConfig();
        return config.commitTypes;
    }
    async shouldIncludeAllCommits() {
        const config = await this.readConfig();
        return config.includeAllCommits;
    }
    async isConventionalCommitsEnabled() {
        const config = await this.readConfig();
        return config.conventionalCommits;
    }
    async isDependencyUpdateEnabled() {
        const config = await this.readConfig();
        return config.dependencyUpdate;
    }
    async getExcludePatterns() {
        const config = await this.readConfig();
        return config.excludePatterns;
    }
    async getOutputDir() {
        const config = await this.readConfig();
        return config.outputDir;
    }
    async getCacheDir() {
        const config = await this.readConfig();
        return config.cacheDir;
    }
    async getCustomTemplate() {
        const config = await this.readConfig();
        return config.customTemplate;
    }
    clearCache() {
        this.cachedConfig = null;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map