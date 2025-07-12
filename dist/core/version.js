"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
const semver_1 = __importDefault(require("semver"));
class VersionManager {
    constructor(dependencyGraph = {}) {
        this.dependencyGraph = dependencyGraph;
    }
    updateDependencyGraph(graph) {
        this.dependencyGraph = graph;
    }
    calculateVersionBump(currentVersion, commitMessages, bumpType) {
        if (bumpType) {
            return bumpType;
        }
        const hasBreaking = commitMessages.some(msg => msg.includes('BREAKING CHANGE') ||
            msg.includes('!:') ||
            msg.match(/^(\w+)(\(.+\))?!:/));
        if (hasBreaking) {
            return 'major';
        }
        const hasFeatures = commitMessages.some(msg => msg.startsWith('feat:') ||
            msg.startsWith('feat('));
        if (hasFeatures) {
            return 'minor';
        }
        return 'patch';
    }
    calculateNewVersion(currentVersion, bumpType) {
        const newVersion = semver_1.default.inc(currentVersion, bumpType);
        if (!newVersion) {
            throw new Error(`无法计算新版本号: ${currentVersion} -> ${bumpType}`);
        }
        return newVersion;
    }
    validateVersion(version) {
        return semver_1.default.valid(version) !== null;
    }
    compareVersions(version1, version2) {
        return semver_1.default.compare(version1, version2);
    }
    getDependentPackages(packageName) {
        const dependents = [];
        for (const [name, deps] of Object.entries(this.dependencyGraph)) {
            if (deps.includes(packageName)) {
                dependents.push(name);
            }
        }
        return dependents;
    }
    getPackagesToUpdate(packageNames) {
        const allPackages = new Set();
        const visited = new Set();
        const addPackageAndDependents = (packageName) => {
            if (visited.has(packageName)) {
                return;
            }
            visited.add(packageName);
            allPackages.add(packageName);
            const dependents = this.getDependentPackages(packageName);
            for (const dependent of dependents) {
                addPackageAndDependents(dependent);
            }
        };
        for (const packageName of packageNames) {
            addPackageAndDependents(packageName);
        }
        return Array.from(allPackages);
    }
    createUpdatePlan(packages, targetPackages, bumpType) {
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        const packagesToUpdate = this.getPackagesToUpdate(targetPackages);
        const strategies = [];
        for (const packageName of packagesToUpdate) {
            const pkg = packageMap.get(packageName);
            if (!pkg) {
                continue;
            }
            const isDirectTarget = targetPackages.includes(packageName);
            const strategy = {
                type: bumpType || 'patch',
                package: packageName,
                reason: isDirectTarget ? '直接更新' : '依赖更新'
            };
            strategies.push(strategy);
        }
        return strategies;
    }
    async executeVersionUpdate(packageInfo, newVersion) {
        if (!this.validateVersion(newVersion)) {
            throw new Error(`无效的版本号: ${newVersion}`);
        }
        if (this.compareVersions(newVersion, packageInfo.version) <= 0) {
            throw new Error(`新版本号 ${newVersion} 不能小于或等于当前版本 ${packageInfo.version}`);
        }
        const packageJsonPath = require('path').join(packageInfo.path, 'package.json');
        const fs = require('fs');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }
    async batchUpdateVersions(packages, strategies) {
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        for (const strategy of strategies) {
            const pkg = packageMap.get(strategy.package);
            if (!pkg) {
                console.warn(`找不到包: ${strategy.package}`);
                continue;
            }
            const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
            await this.executeVersionUpdate(pkg, newVersion);
            console.log(`✅ 已更新 ${strategy.package}: ${pkg.version} -> ${newVersion} (${strategy.reason})`);
        }
    }
    checkVersionConflicts(packages, strategies) {
        const conflicts = [];
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        for (const strategy of strategies) {
            const pkg = packageMap.get(strategy.package);
            if (!pkg) {
                continue;
            }
            try {
                const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
                const dependents = this.getDependentPackages(strategy.package);
                for (const dependentName of dependents) {
                    const dependent = packageMap.get(dependentName);
                    if (dependent) {
                        const requiredVersion = dependent.dependencies[strategy.package] ||
                            dependent.devDependencies[strategy.package] ||
                            dependent.peerDependencies[strategy.package];
                        if (requiredVersion && !semver_1.default.satisfies(newVersion, requiredVersion)) {
                            conflicts.push(`${dependentName} 需要 ${strategy.package}@${requiredVersion}，但计划更新到 ${newVersion}`);
                        }
                    }
                }
            }
            catch (error) {
                conflicts.push(`${strategy.package}: ${error}`);
            }
        }
        return conflicts;
    }
    getCurrentVersion(packageInfo) {
        return packageInfo.version;
    }
    previewVersionUpdate(packages, strategies) {
        const packageMap = new Map();
        packages.forEach(pkg => packageMap.set(pkg.name, pkg));
        const preview = [];
        for (const strategy of strategies) {
            const pkg = packageMap.get(strategy.package);
            if (!pkg) {
                continue;
            }
            try {
                const newVersion = this.calculateNewVersion(pkg.version, strategy.type);
                preview.push({
                    package: strategy.package,
                    currentVersion: pkg.version,
                    newVersion,
                    reason: strategy.reason
                });
            }
            catch (error) {
                preview.push({
                    package: strategy.package,
                    currentVersion: pkg.version,
                    newVersion: 'ERROR',
                    reason: `错误: ${error}`
                });
            }
        }
        return preview;
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=version.js.map