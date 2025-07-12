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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangelogCLI = exports.UpdateCommand = exports.InitCommand = exports.VersionManager = exports.ChangelogGenerator = exports.ConfigManager = exports.CacheManager = exports.WorkspaceManager = exports.GitManager = void 0;
const git_1 = require("./core/git");
const workspace_1 = require("./core/workspace");
const cache_1 = require("./core/cache");
const config_1 = require("./core/config");
const changelog_1 = require("./core/changelog");
const version_1 = require("./core/version");
const init_1 = require("./commands/init");
const update_1 = require("./commands/update");
var git_2 = require("./core/git");
Object.defineProperty(exports, "GitManager", { enumerable: true, get: function () { return git_2.GitManager; } });
var workspace_2 = require("./core/workspace");
Object.defineProperty(exports, "WorkspaceManager", { enumerable: true, get: function () { return workspace_2.WorkspaceManager; } });
var cache_2 = require("./core/cache");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_2.CacheManager; } });
var config_2 = require("./core/config");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return config_2.ConfigManager; } });
var changelog_2 = require("./core/changelog");
Object.defineProperty(exports, "ChangelogGenerator", { enumerable: true, get: function () { return changelog_2.ChangelogGenerator; } });
var version_2 = require("./core/version");
Object.defineProperty(exports, "VersionManager", { enumerable: true, get: function () { return version_2.VersionManager; } });
var init_2 = require("./commands/init");
Object.defineProperty(exports, "InitCommand", { enumerable: true, get: function () { return init_2.InitCommand; } });
var update_2 = require("./commands/update");
Object.defineProperty(exports, "UpdateCommand", { enumerable: true, get: function () { return update_2.UpdateCommand; } });
__exportStar(require("./types"), exports);
__exportStar(require("./utils/constants"), exports);
class ChangelogCLI {
    constructor(rootPath = process.cwd()) {
        this.gitManager = new git_1.GitManager(rootPath);
        this.workspaceManager = new workspace_1.WorkspaceManager(rootPath);
        this.cacheManager = new cache_1.CacheManager(rootPath);
        this.configManager = new config_1.ConfigManager(rootPath);
        this.changelogGenerator = new changelog_1.ChangelogGenerator(rootPath);
        this.versionManager = new version_1.VersionManager();
    }
    async init(options = {}) {
        const initCommand = new init_1.InitCommand();
        await initCommand.execute(options);
    }
    async update(options = {}) {
        const updateCommand = new update_1.UpdateCommand();
        await updateCommand.execute(options);
    }
    async getPackages() {
        return await this.workspaceManager.getAllPackages();
    }
    async getCommits(since) {
        return await this.gitManager.getAllCommits(since);
    }
    async getConfig() {
        return await this.configManager.readConfig();
    }
    async getCacheStatus() {
        return await this.cacheManager.getCacheStatus();
    }
}
exports.ChangelogCLI = ChangelogCLI;
//# sourceMappingURL=index.js.map