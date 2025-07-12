# Monorepo Changelog CLI

基于 git commit 记录生成 changelog 的 CLI 工具，主要服务于 pnpm monorepo 架构。

## 🚀 功能特性

- 📝 **智能分析**：根据 git commit 记录自动识别影响的包
- 🔄 **增量更新**：支持基于缓存的增量更新机制
- 📦 **版本管理**：自动更新版本号并协调依赖包
- 🎨 **灵活配置**：支持提交类型过滤和自定义模板
- 💻 **双重接口**：支持 CLI 和编程接口两种使用方式
- 🔍 **智能缓存**：缓存文件丢失时可从 changelog 重建

## 📋 主要功能

### Init 命令
- 收集所有 monorepo 的提交信息
- 分析提交与包的关联关系
- 在各包目录下生成 CHANGELOG.md 文件
- 建立配置和缓存文件

### Update 命令
- 基于缓存增量更新 changelog
- 支持版本号自动更新（major/minor/patch）
- 协调相互依赖包的版本更新
- 支持手动选择包或全量更新

## 🛠️ 安装使用

### 安装依赖
```bash
npm install
```

### 构建项目
```bash
npm run build
```

### 使用 CLI
```bash
# 初始化
npx changelog-cli init

# 更新所有包
npx changelog-cli update --all

# 更新指定包
npx changelog-cli update --packages pkg1 pkg2 --type minor

# 预览模式
npx changelog-cli update --all --dry-run

# 显示状态
npx changelog-cli status
```

### 编程接口
```typescript
import { ChangelogCLI } from 'monorepo-changelog-cli';

const cli = new ChangelogCLI();

// 初始化
await cli.init({ verbose: true });

// 更新
await cli.update({ all: true, type: 'patch' });

// 获取包信息
const packages = await cli.getPackages();

// 获取提交信息
const commits = await cli.getCommits();
```

## ⚙️ 配置说明

在项目根目录创建 `changelog.config.json`：

```json
{
  "outputDir": ".",
  "cacheDir": ".changelog",
  "commitTypes": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
  "includeAllCommits": false,
  "conventionalCommits": true,
  "dependencyUpdate": true,
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "*.lock"
  ]
}
```

## 📊 缓存机制

本工具采用混合缓存策略：

1. **独立缓存文件**：`.changelog/cache.json` 存储详细信息
2. **自描述 Changelog**：在 CHANGELOG.md 中嵌入元数据注释
3. **智能重建**：缓存丢失时可从现有 changelog 重建

### 缓存文件结构
```json
{
  "lastCommitHash": "abc123...",
  "lastUpdateTime": "2024-01-01T00:00:00.000Z",
  "packageCommits": {
    "pkg1": "def456...",
    "pkg2": "ghi789..."
  }
}
```

## 🔧 开发指南

### 项目结构
```
src/
├── core/           # 核心功能模块
│   ├── git.ts      # Git 操作
│   ├── workspace.ts # pnpm workspace 解析
│   ├── cache.ts    # 缓存管理
│   ├── config.ts   # 配置管理
│   ├── changelog.ts # Changelog 生成
│   └── version.ts  # 版本管理
├── commands/       # 命令处理
│   ├── init.ts     # 初始化命令
│   ├── update.ts   # 更新命令
│   └── config.ts   # 配置命令
├── types/          # 类型定义
├── utils/          # 工具函数
└── cli.ts          # CLI 入口
```

### 开发脚本
```bash
# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test

# 代码检查
npm run lint

# 格式化
npm run format
```

## 📖 使用案例

### 基本使用流程

1. **初始化项目**
   ```bash
   npx changelog-cli init --verbose
   ```

2. **开发和提交代码**
   ```bash
   git add .
   git commit -m "feat(pkg1): add new feature"
   ```

3. **更新 changelog**
   ```bash
   npx changelog-cli update --packages pkg1 --type minor
   ```

### 依赖协调示例

如果包 A 依赖包 B，更新包 B 时会自动更新包 A：

```bash
# 更新包 B，包 A 会自动被包含
npx changelog-cli update --packages pkg-b --type minor
```

### 批量更新

```bash
# 更新所有有新提交的包
npx changelog-cli update --all --type patch

# 预览更新内容
npx changelog-cli update --all --dry-run
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！ 