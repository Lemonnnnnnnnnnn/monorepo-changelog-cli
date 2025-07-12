import { PackageInfo, VersionUpdateStrategy, DependencyGraph } from '../types';
export declare class VersionManager {
    private dependencyGraph;
    constructor(dependencyGraph?: DependencyGraph);
    updateDependencyGraph(graph: DependencyGraph): void;
    calculateVersionBump(currentVersion: string, commitMessages: string[], bumpType?: 'major' | 'minor' | 'patch'): 'major' | 'minor' | 'patch';
    calculateNewVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch'): string;
    validateVersion(version: string): boolean;
    compareVersions(version1: string, version2: string): -1 | 0 | 1;
    getDependentPackages(packageName: string): string[];
    getPackagesToUpdate(packageNames: string[]): string[];
    createUpdatePlan(packages: PackageInfo[], targetPackages: string[], bumpType?: 'major' | 'minor' | 'patch'): VersionUpdateStrategy[];
    executeVersionUpdate(packageInfo: PackageInfo, newVersion: string): Promise<void>;
    batchUpdateVersions(packages: PackageInfo[], strategies: VersionUpdateStrategy[]): Promise<void>;
    checkVersionConflicts(packages: PackageInfo[], strategies: VersionUpdateStrategy[]): string[];
    getCurrentVersion(packageInfo: PackageInfo): string;
    previewVersionUpdate(packages: PackageInfo[], strategies: VersionUpdateStrategy[]): Array<{
        package: string;
        currentVersion: string;
        newVersion: string;
        reason: string;
    }>;
}
//# sourceMappingURL=version.d.ts.map