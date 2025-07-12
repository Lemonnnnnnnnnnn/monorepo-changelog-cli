import { CommitInfo, ChangelogEntry, ChangelogMetadata, PackageInfo } from '../types';
export declare class ChangelogGenerator {
    private rootPath;
    constructor(rootPath?: string);
    generateChangelog(packageInfo: PackageInfo, entries: ChangelogEntry[], metadata: ChangelogMetadata): Promise<string>;
    updateChangelog(packagePath: string, newEntry: ChangelogEntry, metadata: ChangelogMetadata): Promise<void>;
    private insertNewEntry;
    private generateEntryLines;
    private groupCommitsByType;
    private formatCommitMessage;
    private formatDate;
    private getPackageInfo;
    private hasBreakingChanges;
    createChangelogEntry(version: string, commits: CommitInfo[], date?: Date): ChangelogEntry;
    generatePackageChangelog(packageInfo: PackageInfo, commits: CommitInfo[], lastCommitHash: string): Promise<void>;
}
//# sourceMappingURL=changelog.d.ts.map