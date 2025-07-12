import { PackageInfo, DependencyGraph } from '../types';
export declare class WorkspaceManager {
    private rootPath;
    private packagesCache;
    private dependencyGraph;
    constructor(rootPath?: string);
    isPnpmWorkspace(): Promise<boolean>;
    getWorkspaceConfig(): Promise<{
        packages: string[];
    }>;
    getAllPackages(): Promise<PackageInfo[]>;
    getPackageInfo(packagePath: string): Promise<PackageInfo | null>;
    getPackagesByFilePath(filePath: string): Promise<PackageInfo[]>;
    getDependencyGraph(): Promise<DependencyGraph>;
    private buildDependencyGraph;
    getDependents(packageName: string): Promise<string[]>;
    getDependencies(packageName: string): Promise<string[]>;
    hasPackage(packageName: string): Promise<boolean>;
    getPackageByName(packageName: string): Promise<PackageInfo | null>;
    getRootPackageInfo(): Promise<PackageInfo | null>;
    getRelativePath(packagePath: string): string;
    updatePackageVersion(packageName: string, newVersion: string): Promise<void>;
    clearCache(): void;
}
//# sourceMappingURL=workspace.d.ts.map