import { CacheData, ChangelogMetadata } from '../types';
export declare class CacheManager {
    private rootPath;
    private cacheDir;
    private cacheFile;
    constructor(rootPath?: string, cacheDir?: string);
    private ensureCacheDir;
    readCache(): Promise<CacheData | null>;
    writeCache(data: CacheData): Promise<void>;
    updatePackageCommit(packageName: string, commitHash: string): Promise<void>;
    getPackageLastCommit(packageName: string): Promise<string | null>;
    setGlobalLastCommit(commitHash: string): Promise<void>;
    getGlobalLastCommit(): Promise<string | null>;
    clearCache(): Promise<void>;
    extractMetadataFromChangelog(changelogPath: string): Promise<ChangelogMetadata | null>;
    rebuildCache(packagePaths: string[]): Promise<void>;
    validateCache(): Promise<boolean>;
    getCacheStatus(): Promise<{
        exists: boolean;
        valid: boolean;
        lastUpdateTime?: Date;
        packageCount?: number;
    }>;
    batchUpdatePackageCommits(updates: Record<string, string>): Promise<void>;
    getAllPackageCommits(): Promise<Record<string, string>>;
}
//# sourceMappingURL=cache.d.ts.map