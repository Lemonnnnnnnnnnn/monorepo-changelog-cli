"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHANGELOG_METADATA_COMMENT = exports.VERSION_BUMP_TYPES = exports.COMMIT_TYPE_MAPPINGS = exports.CHANGELOG_FILE_NAME = exports.CONFIG_FILE_NAME = exports.CACHE_FILE_NAME = exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
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
exports.CACHE_FILE_NAME = 'cache.json';
exports.CONFIG_FILE_NAME = 'changelog.config.json';
exports.CHANGELOG_FILE_NAME = 'CHANGELOG.md';
exports.COMMIT_TYPE_MAPPINGS = {
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
exports.VERSION_BUMP_TYPES = ['major', 'minor', 'patch'];
exports.CHANGELOG_METADATA_COMMENT = '<!-- CHANGELOG_METADATA:';
//# sourceMappingURL=constants.js.map