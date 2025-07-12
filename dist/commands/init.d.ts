export interface InitOptions {
    config?: string;
    verbose?: boolean;
    dryRun?: boolean;
}
export declare class InitCommand {
    private gitManager;
    private workspaceManager;
    private cacheManager;
    private configManager;
    private changelogGenerator;
    private verbose;
    constructor(rootPath?: string);
    execute(options: InitOptions): Promise<void>;
    private checkEnvironment;
    private initializeConfig;
    private collectCommits;
    private getPackages;
    private analyzePackageCommits;
    private getAffectedPackages;
    private generateChangelogFiles;
    private previewChanges;
    private updateCache;
}
//# sourceMappingURL=init.d.ts.map