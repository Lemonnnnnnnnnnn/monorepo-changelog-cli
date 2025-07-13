# Monorepo Changelog CLI

基于 git commit 记录生成 changelog 的 CLI 工具，主要服务于 pnpm monorepo 架构。

## 功能特性

### 核心功能
- 🚀 **自动 changelog 生成**：基于 git commit 记录自动生成 CHANGELOG.md
- 📦 **Monorepo 支持**：专门针对 pnpm workspace 架构设计
- 🔄 **版本管理**：支持语义化版本控制 (semver)
- 🎯 **智能缓存**：增量更新机制，避免重复处理

### 新增功能
- 🔗 **依赖更新**：自动更新依赖包的版本并协调相关包
- 🎨 **工作区依赖**：支持 `workspace:*` 依赖方式
- ✍️ **手动日志**：支持手动输入 changelog 条目
- 📊 **依赖追踪**：自动生成依赖更新的 changelog 信息

## 安装

```bash
npm install -g monorepo-changelog-cli
```

## 使用方法

### 1. 初始化

```bash
# 初始化配置和生成初始 changelog
changelog-cli init

# 预览模式
changelog-cli init --dry-run

# 详细输出
changelog-cli init --verbose
```

### 2. 更新 changelog

#### 基本更新
```bash
# 更新指定包
changelog-cli update --packages pkg-a pkg-b

# 更新所有包
changelog-cli update --all

# 指定版本更新类型
changelog-cli update --packages pkg-a --type major
```

#### 依赖更新功能
```bash
# 当 pkg-b 更新时，自动更新依赖 pkg-b 的其他包
changelog-cli update --packages pkg-b

# 输出示例：
# ✅ 已更新 pkg-b: 1.0.0 -> 1.0.1 (直接更新)
# ✅ 已更新 pkg-a: 1.0.0 -> 1.0.1 (依赖更新)
# ✅ 已更新 pkg-c: 1.0.0 -> 1.0.1 (依赖更新)
# ✅ 已更新 pkg-a 中的依赖 pkg-b: 1.0.0 -> 1.0.1
# ✅ 已更新 pkg-c 中的依赖 pkg-b: 1.0.0 -> 1.0.1
```

#### 预览模式
```bash
# 预览将要执行的更新
changelog-cli update --packages pkg-a --dry-run

# 预览输出：
# 📋 预览模式 - 将要执行的更新:
# 
# 版本更新:
#   📦 pkg-a: 1.0.0 -> 1.0.1 (直接更新)
#   📦 pkg-b: 1.0.0 -> 1.0.1 (依赖更新)
# 
# Changelog 更新:
#   📄 pkg-a/CHANGELOG.md (2 个提交, 1 个手动条目)
#   📄 pkg-b/CHANGELOG.md (0 个提交)
```

### 3. 配置管理

```bash
# 初始化配置文件
changelog-cli config --init

# 显示当前配置
changelog-cli config --show

# 重置配置
changelog-cli config --reset
```

### 4. 状态查看

```bash
# 显示当前状态
changelog-cli status

# 详细状态
changelog-cli status --verbose
```

## 依赖更新示例

### 场景：pkg-a 依赖 pkg-b，pkg-c 通过 workspace:* 依赖 pkg-b

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// packages/pkg-a/package.json
{
  "name": "pkg-a",
  "dependencies": {
    "pkg-b": "1.0.0"
  }
}

// packages/pkg-c/package.json
{
  "name": "pkg-c",
  "dependencies": {
    "pkg-b": "workspace:*"
  }
}
```

### 执行更新
```bash
changelog-cli update --packages pkg-b
```

### 结果
```json
// packages/pkg-a/package.json
{
  "name": "pkg-a",
  "version": "1.0.1",
  "dependencies": {
    "pkg-b": "1.0.1"  // 自动更新
  }
}

// packages/pkg-c/package.json
{
  "name": "pkg-c",
  "version": "1.0.1",
  "dependencies": {
    "pkg-b": "workspace:1.0.1"  // 保持 workspace: 前缀
  }
}
```

### 生成的 CHANGELOG.md
```markdown
## [1.0.1] - 2025-07-13

### 📦 依赖更新

- 🐛 更新 pkg-b: 1.0.0 → 1.0.1
```

## Changelog 格式示例

### 包含手动条目的 changelog
```markdown
# pkg-a 更新日志

## [1.0.1] - 2025-07-13

### ✨ 新功能

- 添加新的用户认证功能(auth)

### 🐛 修复

- Fix critical bug in authentication (a1b2c3d)

### 📦 依赖更新

- ✨ 更新 pkg-b: 1.0.0 → 1.0.1
```

## 命令行选项

### 全局选项
- `-v, --verbose`: 详细输出
- `-c, --config <path>`: 指定配置文件路径
- `--dry-run`: 预览模式，不实际执行操作

### update 命令选项
- `-p, --packages <packages...>`: 指定要更新的包名
- `-a, --all`: 更新所有包
- `-t, --type <type>`: 版本更新类型 (major|minor|patch)

## 支持的提交类型

- `feat`: ✨ 新功能
- `fix`: 🐛 修复
- `docs`: 📚 文档
- `style`: 💄 样式
- `refactor`: ♻️ 重构
- `test`: ✅ 测试
- `chore`: 🔧 构建

## 技术特性

- 🔄 **增量更新**：基于 git commit 哈希的缓存机制
- 🎯 **路径匹配**：智能识别提交影响的包
- 📊 **依赖图**：自动构建和维护包依赖关系
- 🛡️ **版本冲突检查**：避免版本不兼容问题

## 许可证

MIT License 