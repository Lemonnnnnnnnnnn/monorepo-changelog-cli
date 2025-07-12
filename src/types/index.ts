export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
  type?: string | undefined; // feat, fix, docs, etc.
}

export interface PackageCommit {
  packageName: string;
  packagePath: string;
  commits: CommitInfo[];
}

export interface CacheData {
  lastCommitHash: string;
  lastUpdateTime: Date;
  packageCommits: Record<string, string>; // packageName -> lastCommitHash
}

export interface ChangelogConfig {
  outputDir: string;
  cacheDir: string;
  commitTypes: string[];
  includeAllCommits: boolean;
  conventionalCommits: boolean;
  dependencyUpdate: boolean;
  excludePatterns: string[];
  customTemplate?: string;
}

export interface VersionUpdateStrategy {
  type: 'major' | 'minor' | 'patch';
  package: string;
  reason: string;
}

export interface DependencyGraph {
  [packageName: string]: string[];
}

export interface CliOptions {
  packages?: string[];
  all?: boolean;
  version?: 'major' | 'minor' | 'patch';
  dry?: boolean;
  verbose?: boolean;
  config?: string;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  commits: CommitInfo[];
  breaking?: boolean;
}

export interface ChangelogMetadata {
  lastCommitHash: string;
  lastUpdateTime: Date;
  packageName: string;
  packagePath: string;
} 