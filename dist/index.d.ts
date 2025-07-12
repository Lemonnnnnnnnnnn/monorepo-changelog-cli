export { GitManager } from './core/git';
export { WorkspaceManager } from './core/workspace';
export { CacheManager } from './core/cache';
export { ConfigManager } from './core/config';
export { ChangelogGenerator } from './core/changelog';
export { VersionManager } from './core/version';
export { InitCommand } from './commands/init';
export { UpdateCommand } from './commands/update';
export * from './types';
export * from './utils/constants';
export declare class ChangelogCLI {
    private gitManager;
    private workspaceManager;
    private cacheManager;
    private configManager;
    private changelogGenerator;
    private versionManager;
    constructor(rootPath?: string);
    init(options?: {
        config?: string;
        verbose?: boolean;
        dryRun?: boolean;
    }): Promise<void>;
    update(options?: {
        packages?: string[];
        all?: boolean;
        type?: 'major' | 'minor' | 'patch';
        config?: string;
        verbose?: boolean;
        dryRun?: boolean;
    }): Promise<void>;
    getPackages(): Promise<import('./types').PackageInfo[]>;
    getCommits(since?: string): Promise<import('./types').CommitInfo[]>;
    getConfig(): Promise<import('./types').ChangelogConfig>;
    getCacheStatus(): Promise<{
        exists: boolean;
        valid: boolean;
        lastUpdateTime?: Date;
        packageCount?: number;
    }>;
}
//# sourceMappingURL=index.d.ts.map