export interface ConfigOptions {
    init?: boolean;
    reset?: boolean;
    show?: boolean;
}
export declare class ConfigCommand {
    private configManager;
    constructor(rootPath?: string);
    execute(options: ConfigOptions): Promise<void>;
    private initConfig;
    private resetConfig;
    private showConfig;
}
//# sourceMappingURL=config.d.ts.map