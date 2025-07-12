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
exports.CacheManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const constants_1 = require("../utils/constants");
class CacheManager {
    constructor(rootPath = process.cwd(), cacheDir = '.changelog') {
        this.rootPath = rootPath;
        this.cacheDir = (0, path_1.join)(rootPath, cacheDir);
        this.cacheFile = (0, path_1.join)(this.cacheDir, constants_1.CACHE_FILE_NAME);
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!(0, fs_1.existsSync)(this.cacheDir)) {
            (0, fs_1.mkdirSync)(this.cacheDir, { recursive: true });
        }
    }
    async readCache() {
        try {
            if (!(0, fs_1.existsSync)(this.cacheFile)) {
                return null;
            }
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const content = await fs.readFile(this.cacheFile, 'utf-8');
            const data = JSON.parse(content);
            return {
                ...data,
                lastUpdateTime: new Date(data.lastUpdateTime)
            };
        }
        catch (error) {
            console.warn('读取缓存文件失败:', error);
            return null;
        }
    }
    async writeCache(data) {
        try {
            this.ensureCacheDir();
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('写入缓存文件失败:', error);
            throw error;
        }
    }
    async updatePackageCommit(packageName, commitHash) {
        const cache = await this.readCache() || {
            lastCommitHash: '',
            lastUpdateTime: new Date(),
            packageCommits: {}
        };
        cache.packageCommits[packageName] = commitHash;
        cache.lastUpdateTime = new Date();
        await this.writeCache(cache);
    }
    async getPackageLastCommit(packageName) {
        const cache = await this.readCache();
        return cache?.packageCommits[packageName] || null;
    }
    async setGlobalLastCommit(commitHash) {
        const cache = await this.readCache() || {
            lastCommitHash: '',
            lastUpdateTime: new Date(),
            packageCommits: {}
        };
        cache.lastCommitHash = commitHash;
        cache.lastUpdateTime = new Date();
        await this.writeCache(cache);
    }
    async getGlobalLastCommit() {
        const cache = await this.readCache();
        return cache?.lastCommitHash || null;
    }
    async clearCache() {
        try {
            if ((0, fs_1.existsSync)(this.cacheFile)) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.unlink(this.cacheFile);
            }
        }
        catch (error) {
            console.warn('清除缓存失败:', error);
        }
    }
    async extractMetadataFromChangelog(changelogPath) {
        try {
            if (!(0, fs_1.existsSync)(changelogPath)) {
                return null;
            }
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const content = await fs.readFile(changelogPath, 'utf-8');
            const metadataMatch = content.match(new RegExp(`${constants_1.CHANGELOG_METADATA_COMMENT}\\s*(.+?)\\s*-->`, 's'));
            if (metadataMatch) {
                const metadataStr = metadataMatch[1];
                const metadata = JSON.parse(metadataStr);
                return {
                    ...metadata,
                    lastUpdateTime: new Date(metadata.lastUpdateTime)
                };
            }
            return null;
        }
        catch (error) {
            console.warn('从 CHANGELOG.md 提取元数据失败:', error);
            return null;
        }
    }
    async rebuildCache(packagePaths) {
        const cache = {
            lastCommitHash: '',
            lastUpdateTime: new Date(),
            packageCommits: {}
        };
        for (const packagePath of packagePaths) {
            const changelogPath = (0, path_1.join)(packagePath, 'CHANGELOG.md');
            const metadata = await this.extractMetadataFromChangelog(changelogPath);
            if (metadata) {
                cache.packageCommits[metadata.packageName] = metadata.lastCommitHash;
                if (!cache.lastCommitHash ||
                    metadata.lastUpdateTime > new Date(cache.lastUpdateTime)) {
                    cache.lastCommitHash = metadata.lastCommitHash;
                    cache.lastUpdateTime = metadata.lastUpdateTime;
                }
            }
        }
        await this.writeCache(cache);
    }
    async validateCache() {
        const cache = await this.readCache();
        if (!cache) {
            return false;
        }
        const now = new Date();
        const cacheAge = now.getTime() - cache.lastUpdateTime.getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        return cacheAge < maxAge;
    }
    async getCacheStatus() {
        const cache = await this.readCache();
        if (!cache) {
            return { exists: false, valid: false };
        }
        const valid = await this.validateCache();
        return {
            exists: true,
            valid,
            lastUpdateTime: cache.lastUpdateTime,
            packageCount: Object.keys(cache.packageCommits).length
        };
    }
    async batchUpdatePackageCommits(updates) {
        const cache = await this.readCache() || {
            lastCommitHash: '',
            lastUpdateTime: new Date(),
            packageCommits: {}
        };
        Object.assign(cache.packageCommits, updates);
        cache.lastUpdateTime = new Date();
        await this.writeCache(cache);
    }
    async getAllPackageCommits() {
        const cache = await this.readCache();
        return cache?.packageCommits || {};
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache.js.map