import { CommitInfo } from '../types';
export declare class GitManager {
    private git;
    private rootPath;
    constructor(rootPath?: string);
    getAllCommits(since?: string): Promise<CommitInfo[]>;
    getCommitFiles(commitHash: string): Promise<string[]>;
    getFilesBetweenCommits(fromCommit: string, toCommit: string): Promise<string[]>;
    getLatestCommitHash(): Promise<string>;
    isGitRepository(): Promise<boolean>;
    getRepoRoot(): Promise<string>;
    private parseCommitType;
    doesCommitAffectPath(commitHash: string, targetPath: string): Promise<boolean>;
    getCommitsForPath(pathPattern: string, since?: string): Promise<CommitInfo[]>;
    getCommitDetails(commitHash: string): Promise<CommitInfo | null>;
}
//# sourceMappingURL=git.d.ts.map