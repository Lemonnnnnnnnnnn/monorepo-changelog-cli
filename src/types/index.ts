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
  dependencyUpdates?: DependencyUpdate[];
}

export interface ChangelogMetadata {
  lastCommitHash: string;
  lastUpdateTime: Date;
  packageName: string;
  packagePath: string;
}

// 新增：依赖更新信息
export interface DependencyUpdate {
  packageName: string;
  oldVersion: string;
  newVersion: string;
  changeType: 'major' | 'minor' | 'patch';
}

// 新增：依赖更新策略
export interface DependencyUpdateStrategy {
  packageName: string;
  dependencyName: string;
  oldVersion: string;
  newVersion: string;
  isDirect: boolean; // 是否是直接依赖
} 

// 发布相关类型定义
export interface PublishOptions {
  packages?: string[];
  all?: boolean;
  registry?: string;
  tag?: string;
  access?: 'public' | 'restricted';
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  skipVersionCheck?: boolean;
}

export interface PackagePublishInfo {
  name: string;
  version: string;
  path: string;
  needsPublish: boolean;
  publishedVersions: string[];
  latestVersion?: string;
  isPrivate?: boolean;
  error?: string;
}

export interface NpmRegistryInfo {
  name: string;
  versions: Record<string, any>;
  'dist-tags': Record<string, string>;
  time: Record<string, string>;
}

export interface PublishResult {
  packageName: string;
  version: string;
  success: boolean;
  message?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
} 