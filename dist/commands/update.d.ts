export interface UpdateOptions {
    packages?: string[];
    all?: boolean;
    type?: 'major' | 'minor' | 'patch';
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
}
export declare class UpdateCommand {
    private gitManager;
    private workspaceManager;
    private cacheManager;
    private configManager;
    private changelogGenerator;
    private versionManager;
    private verbose;
    constructor(rootPath?: string);
    execute(options: UpdateOptions): Promise<void>;
    private checkEnvironment;
    private loadConfiguration;
    private getPackages;
    private initializeVersionManager;
    private determineTargetPackages;
    private selectPackagesInteractively;
    private getNewCommits;
    private createUpdateStrategies;
    private checkVersionConflicts;
    private previewUpdate;
    private executeUpdate;
    private updateChangelogFiles;
    private updateCache;
}
//# sourceMappingURL=update.d.ts.map