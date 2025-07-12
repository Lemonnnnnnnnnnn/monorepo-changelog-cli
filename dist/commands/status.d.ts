export interface StatusOptions {
    verbose?: boolean;
}
export declare class StatusCommand {
    private gitManager;
    private workspaceManager;
    private cacheManager;
    private configManager;
    constructor(rootPath?: string);
    execute(options: StatusOptions): Promise<void>;
    private checkEnvironmentStatus;
    private checkConfigStatus;
    private checkCacheStatus;
    private checkPackageStatus;
}
//# sourceMappingURL=status.d.ts.map