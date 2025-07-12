export const DEFAULT_CONFIG: Record<string, any> = {
  outputDir: '.',
  cacheDir: '.changelog',
  commitTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
  includeAllCommits: false,
  conventionalCommits: true,
  dependencyUpdate: true,
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    '*.lock',
    '.git/**'
  ]
};

export const CACHE_FILE_NAME = 'cache.json';
export const CONFIG_FILE_NAME = 'changelog.config.json';
export const CHANGELOG_FILE_NAME = 'CHANGELOG.md';

export const COMMIT_TYPE_MAPPINGS: Record<string, string> = {
  feat: '✨ 新功能',
  fix: '🐛 Bug 修复',
  docs: '📚 文档',
  style: '💄 样式',
  refactor: '♻️ 重构',
  test: '✅ 测试',
  chore: '🔧 其他',
  perf: '⚡ 性能优化',
  ci: '👷 CI/CD',
  build: '📦 构建',
  revert: '⏪ 回退'
};

export const VERSION_BUMP_TYPES = ['major', 'minor', 'patch'] as const;

export const CHANGELOG_METADATA_COMMENT = '<!-- CHANGELOG_METADATA:'; 