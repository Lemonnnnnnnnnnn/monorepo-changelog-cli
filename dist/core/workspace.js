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
exports.WorkspaceManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const yaml_1 = require("yaml");
const glob_1 = require("glob");
class WorkspaceManager {
    constructor(rootPath = process.cwd()) {
        this.packagesCache = new Map();
        this.dependencyGraph = {};
        this.rootPath = (0, path_1.resolve)(rootPath);
    }
    async isPnpmWorkspace() {
        const workspaceFile = (0, path_1.join)(this.rootPath, 'pnpm-workspace.yaml');
        return (0, fs_1.existsSync)(workspaceFile);
    }
    async getWorkspaceConfig() {
        const workspaceFile = (0, path_1.join)(this.rootPath, 'pnpm-workspace.yaml');
        if (!(0, fs_1.existsSync)(workspaceFile)) {
            throw new Error('pnpm-workspace.yaml 文件不存在');
        }
        try {
            const content = (0, fs_1.readFileSync)(workspaceFile, 'utf-8');
            const config = (0, yaml_1.parse)(content);
            return config;
        }
        catch (error) {
            throw new Error(`解析 pnpm-workspace.yaml 失败: ${error}`);
        }
    }
    async getAllPackages() {
        if (this.packagesCache.size > 0) {
            return Array.from(this.packagesCache.values());
        }
        const config = await this.getWorkspaceConfig();
        const packages = [];
        for (const pattern of config.packages) {
            const packagePaths = await (0, glob_1.glob)(pattern, {
                cwd: this.rootPath,
                absolute: true
            });
            for (const packagePath of packagePaths) {
                const packageInfo = await this.getPackageInfo(packagePath);
                if (packageInfo) {
                    packages.push(packageInfo);
                    this.packagesCache.set(packageInfo.name, packageInfo);
                }
            }
        }
        await this.buildDependencyGraph(packages);
        return packages;
    }
    async getPackageInfo(packagePath) {
        const packageJsonPath = (0, path_1.join)(packagePath, 'package.json');
        if (!(0, fs_1.existsSync)(packageJsonPath)) {
            return null;
        }
        try {
            const content = (0, fs_1.readFileSync)(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(content);
            return {
                name: packageJson.name,
                version: packageJson.version || '0.0.0',
                path: packagePath,
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                peerDependencies: packageJson.peerDependencies || {}
            };
        }
        catch (error) {
            console.warn(`读取 package.json 失败: ${packagePath}`, error);
            return null;
        }
    }
    async getPackagesByFilePath(filePath) {
        const packages = await this.getAllPackages();
        const normalizedFilePath = (0, path_1.resolve)(this.rootPath, filePath);
        const affectedPackages = [];
        for (const pkg of packages) {
            const normalizedPackagePath = (0, path_1.resolve)(pkg.path);
            if (normalizedFilePath.startsWith(normalizedPackagePath)) {
                affectedPackages.push(pkg);
            }
        }
        return affectedPackages;
    }
    async getDependencyGraph() {
        if (Object.keys(this.dependencyGraph).length === 0) {
            await this.getAllPackages();
        }
        return this.dependencyGraph;
    }
    async buildDependencyGraph(packages) {
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        for (const pkg of packages) {
            const dependencies = [];
            for (const depName of Object.keys(pkg.dependencies)) {
                if (packageMap.has(depName)) {
                    dependencies.push(depName);
                }
            }
            for (const depName of Object.keys(pkg.devDependencies)) {
                if (packageMap.has(depName)) {
                    dependencies.push(depName);
                }
            }
            for (const depName of Object.keys(pkg.peerDependencies)) {
                if (packageMap.has(depName)) {
                    dependencies.push(depName);
                }
            }
            this.dependencyGraph[pkg.name] = dependencies;
        }
    }
    async getDependents(packageName) {
        const graph = await this.getDependencyGraph();
        const dependents = [];
        for (const [name, deps] of Object.entries(graph)) {
            if (deps.includes(packageName)) {
                dependents.push(name);
            }
        }
        return dependents;
    }
    async getDependencies(packageName) {
        const graph = await this.getDependencyGraph();
        return graph[packageName] || [];
    }
    async hasPackage(packageName) {
        const packages = await this.getAllPackages();
        return packages.some(pkg => pkg.name === packageName);
    }
    async getPackageByName(packageName) {
        const packages = await this.getAllPackages();
        return packages.find(pkg => pkg.name === packageName) || null;
    }
    async getRootPackageInfo() {
        return await this.getPackageInfo(this.rootPath);
    }
    getRelativePath(packagePath) {
        return (0, path_1.relative)(this.rootPath, packagePath);
    }
    async updatePackageVersion(packageName, newVersion) {
        const packageInfo = await this.getPackageByName(packageName);
        if (!packageInfo) {
            throw new Error(`包 ${packageName} 不存在`);
        }
        const packageJsonPath = (0, path_1.join)(packageInfo.path, 'package.json');
        const content = (0, fs_1.readFileSync)(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        packageJson.version = newVersion;
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        packageInfo.version = newVersion;
        this.packagesCache.set(packageName, packageInfo);
    }
    clearCache() {
        this.packagesCache.clear();
        this.dependencyGraph = {};
    }
}
exports.WorkspaceManager = WorkspaceManager;
//# sourceMappingURL=workspace.js.map