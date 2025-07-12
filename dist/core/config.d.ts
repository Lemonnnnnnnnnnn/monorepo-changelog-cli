import { ChangelogConfig } from '../types';
export declare class ConfigManager {
    private rootPath;
    private configFile;
    private cachedConfig;
    constructor(rootPath?: string);
    readConfig(): Promise<ChangelogConfig>;
    private loadConfigFromFile;
    private createDefaultConfig;
    private validateConfig;
    saveConfig(config: ChangelogConfig): Promise<void>;
    updateConfig(updates: Partial<ChangelogConfig>): Promise<void>;
    resetConfig(): Promise<void>;
    hasConfigFile(): boolean;
    createConfigFile(): Promise<void>;
    getCommitTypeFilter(): Promise<string[]>;
    shouldIncludeAllCommits(): Promise<boolean>;
    isConventionalCommitsEnabled(): Promise<boolean>;
    isDependencyUpdateEnabled(): Promise<boolean>;
    getExcludePatterns(): Promise<string[]>;
    getOutputDir(): Promise<string>;
    getCacheDir(): Promise<string>;
    getCustomTemplate(): Promise<string | undefined>;
    clearCache(): void;
}
//# sourceMappingURL=config.d.ts.map