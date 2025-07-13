import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { CommitInfo, ChangelogEntry, ChangelogMetadata, PackageInfo, DependencyUpdate, ManualEntry } from '../types';
import { CHANGELOG_FILE_NAME, CHANGELOG_METADATA_COMMENT, COMMIT_TYPE_MAPPINGS } from '../utils/constants';

export class ChangelogGenerator {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  /**
   * 生成 changelog 内容
   */
  async generateChangelog(
    packageInfo: PackageInfo,
    entries: ChangelogEntry[],
    metadata: ChangelogMetadata
  ): Promise<string> {
    const lines: string[] = [];

    // 添加标题
    lines.push(`# ${packageInfo.name} 更新日志`);
    lines.push('');

    // 添加元数据注释
    const metadataJson = JSON.stringify(metadata, null, 2);
    lines.push(`${CHANGELOG_METADATA_COMMENT}`);
    lines.push(metadataJson);
    lines.push('-->');
    lines.push('');

    // 添加说明
    lines.push('所有重要的更改都将记录在此文件中。');
    lines.push('');

    // 按版本倒序排列
    const sortedEntries = entries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const entry of sortedEntries) {
      lines.push(`## [${entry.version}] - ${this.formatDate(entry.date)}`);
      lines.push('');

      if (entry.breaking) {
        lines.push('### ⚠️ 破坏性更改');
        lines.push('');
      }

      // 添加手动输入的条目
      if (entry.manualEntries && entry.manualEntries.length > 0) {
        const manualByType = this.groupManualEntriesByType(entry.manualEntries);
        for (const [type, manualEntries] of Object.entries(manualByType)) {
          const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
          lines.push(`### ${typeName}`);
          lines.push('');

          for (const manualEntry of manualEntries) {
            const scope = manualEntry.scope ? `(${manualEntry.scope})` : '';
            const breaking = manualEntry.breaking ? ' ⚠️' : '';
            lines.push(`- ${manualEntry.message}${scope}${breaking}`);
          }
          lines.push('');
        }
      }

      // 按提交类型分组
      if (entry.commits && entry.commits.length > 0) {
        const commitsByType = this.groupCommitsByType(entry.commits);
        for (const [type, commits] of Object.entries(commitsByType)) {
          const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
          lines.push(`### ${typeName}`);
          lines.push('');

          for (const commit of commits) {
            const shortHash = commit.hash.substring(0, 7);
            const message = this.formatCommitMessage(commit.message);
            lines.push(`- ${message} (${shortHash})`);
          }
          lines.push('');
        }
      }

      // 添加依赖更新信息
      if (entry.dependencyUpdates && entry.dependencyUpdates.length > 0) {
        lines.push('### 📦 依赖更新');
        lines.push('');

        for (const depUpdate of entry.dependencyUpdates) {
          const changeIcon = this.getChangeIcon(depUpdate.changeType);
          lines.push(`- ${changeIcon} 更新 ${depUpdate.packageName}: ${depUpdate.oldVersion} → ${depUpdate.newVersion}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 更新已存在的 changelog 文件
   */
  async updateChangelog(
    packagePath: string,
    newEntry: ChangelogEntry,
    metadata: ChangelogMetadata
  ): Promise<void> {
    const changelogPath = join(packagePath, CHANGELOG_FILE_NAME);
    
    if (existsSync(changelogPath)) {
      const existingContent = readFileSync(changelogPath, 'utf-8');
      const updatedContent = this.insertNewEntry(existingContent, newEntry, metadata);
      writeFileSync(changelogPath, updatedContent);
    } else {
      // 创建新的 changelog 文件
      const packageInfo = await this.getPackageInfo(packagePath);
      const content = await this.generateChangelog(packageInfo, [newEntry], metadata);
      writeFileSync(changelogPath, content);
    }
  }

  /**
   * 插入新条目到现有 changelog 中
   */
  private insertNewEntry(
    existingContent: string,
    newEntry: ChangelogEntry,
    metadata: ChangelogMetadata
  ): string {
    const lines = existingContent.split('\n');
    const entryLines = this.generateEntryLines(newEntry);

    // 找到插入位置（第一个版本条目之前）
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## [')) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex === -1) {
      // 没有找到现有版本，添加到文件末尾
      return existingContent + '\n' + entryLines.join('\n');
    } else {
      // 插入到现有版本之前
      const beforeLines = lines.slice(0, insertIndex);
      const afterLines = lines.slice(insertIndex);
      return [...beforeLines, ...entryLines, '', ...afterLines].join('\n');
    }
  }

  /**
   * 生成条目行
   */
  private generateEntryLines(entry: ChangelogEntry): string[] {
    const lines: string[] = [];
    
    lines.push(`## [${entry.version}] - ${this.formatDate(entry.date)}`);
    lines.push('');

    if (entry.breaking) {
      lines.push('### ⚠️ 破坏性更改');
      lines.push('');
    }

    // 添加手动输入的条目
    if (entry.manualEntries && entry.manualEntries.length > 0) {
      const manualByType = this.groupManualEntriesByType(entry.manualEntries);
      for (const [type, manualEntries] of Object.entries(manualByType)) {
        const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
        lines.push(`### ${typeName}`);
        lines.push('');

        for (const manualEntry of manualEntries) {
          const scope = manualEntry.scope ? `(${manualEntry.scope})` : '';
          const breaking = manualEntry.breaking ? ' ⚠️' : '';
          lines.push(`- ${manualEntry.message}${scope}${breaking}`);
        }
        lines.push('');
      }
    }

    // 按提交类型分组
    if (entry.commits && entry.commits.length > 0) {
      const commitsByType = this.groupCommitsByType(entry.commits);
      for (const [type, commits] of Object.entries(commitsByType)) {
        const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
        lines.push(`### ${typeName}`);
        lines.push('');

        for (const commit of commits) {
          const shortHash = commit.hash.substring(0, 7);
          const message = this.formatCommitMessage(commit.message);
          lines.push(`- ${message} (${shortHash})`);
        }
        lines.push('');
      }
    }

    // 添加依赖更新信息
    if (entry.dependencyUpdates && entry.dependencyUpdates.length > 0) {
      lines.push('### 📦 依赖更新');
      lines.push('');

      for (const depUpdate of entry.dependencyUpdates) {
        const changeIcon = this.getChangeIcon(depUpdate.changeType);
        lines.push(`- ${changeIcon} 更新 ${depUpdate.packageName}: ${depUpdate.oldVersion} → ${depUpdate.newVersion}`);
      }
      lines.push('');
    }

    return lines;
  }

  /**
   * 按类型分组手动条目
   */
  private groupManualEntriesByType(manualEntries: ManualEntry[]): Record<string, ManualEntry[]> {
    const grouped: Record<string, ManualEntry[]> = {};
    
    for (const entry of manualEntries) {
      const type = entry.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entry);
    }
    
    return grouped;
  }

  /**
   * 按提交类型分组
   */
  private groupCommitsByType(commits: CommitInfo[]): Record<string, CommitInfo[]> {
    const grouped: Record<string, CommitInfo[]> = {};
    
    for (const commit of commits) {
      const type = this.extractCommitType(commit.message);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(commit);
    }
    
    return grouped;
  }

  /**
   * 提取提交类型
   */
  private extractCommitType(message: string): string {
    const match = message.match(/^(\w+)(\(.+\))?:/);
    return match ? match[1] : 'other';
  }

  /**
   * 格式化提交消息
   */
  private formatCommitMessage(message: string): string {
    // 移除类型前缀
    const cleanMessage = message.replace(/^(\w+)(\(.+\))?:\s*/, '');
    
    // 首字母大写
    return cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
  }

  /**
   * 获取变更类型图标
   */
  private getChangeIcon(changeType: 'major' | 'minor' | 'patch'): string {
    switch (changeType) {
      case 'major':
        return '🚨';
      case 'minor':
        return '✨';
      case 'patch':
        return '🐛';
      default:
        return '🔧';
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 获取包信息
   */
  private async getPackageInfo(packagePath: string): Promise<PackageInfo> {
    const packageJsonPath = join(packagePath, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    return {
      name: packageJson.name,
      version: packageJson.version || '0.0.0',
      path: packagePath,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      peerDependencies: packageJson.peerDependencies || {}
    };
  }

  /**
   * 检查是否有破坏性更改
   */
  private hasBreakingChanges(commits: CommitInfo[]): boolean {
    return commits.some(commit => 
      commit.message.includes('BREAKING CHANGE') || 
      commit.message.includes('!:') ||
      commit.message.match(/^(\w+)(\(.+\))?!:/)
    );
  }

  /**
   * 创建 changelog 条目
   */
  createChangelogEntry(
    version: string,
    commits: CommitInfo[],
    date: Date = new Date(),
    dependencyUpdates?: DependencyUpdate[],
    manualEntries?: ManualEntry[]
  ): ChangelogEntry {
    return {
      version,
      date,
      commits,
      breaking: this.hasBreakingChanges(commits),
      dependencyUpdates,
      manualEntries
    };
  }

  /**
   * 生成包的 changelog
   */
  async generatePackageChangelog(
    packageInfo: PackageInfo,
    commits: CommitInfo[],
    lastCommitHash: string,
    dependencyUpdates?: DependencyUpdate[],
    manualEntries?: ManualEntry[]
  ): Promise<void> {
    const entry = this.createChangelogEntry(
      packageInfo.version,
      commits,
      new Date(),
      dependencyUpdates,
      manualEntries
    );

    const metadata: ChangelogMetadata = {
      lastCommitHash,
      lastUpdateTime: new Date(),
      packageName: packageInfo.name,
      packagePath: packageInfo.path
    };

    await this.updateChangelog(packageInfo.path, entry, metadata);
  }
} 