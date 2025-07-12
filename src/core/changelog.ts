import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { CommitInfo, ChangelogEntry, ChangelogMetadata, PackageInfo } from '../types';
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

      // 按提交类型分组
      const commitsByType = this.groupCommitsByType(entry.commits);

      for (const [type, commits] of Object.entries(commitsByType)) {
        const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
        lines.push(`### ${typeName}`);
        lines.push('');

        for (const commit of commits) {
          const shortHash = commit.hash.substring(0, 7);
          const message = this.formatCommitMessage(commit.message);
          lines.push(`- ${message} ([${shortHash}](../../commit/${commit.hash}))`);
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
    const newEntryLines = this.generateEntryLines(newEntry);
    
    // 更新元数据
    const metadataRegex = new RegExp(`${CHANGELOG_METADATA_COMMENT}\\s*(.+?)\\s*-->`, 's');
    const metadataMatch = existingContent.match(metadataRegex);
    
    if (metadataMatch) {
      const newMetadataJson = JSON.stringify(metadata, null, 2);
      const updatedContent = existingContent.replace(
        metadataRegex,
        `${CHANGELOG_METADATA_COMMENT}\n${newMetadataJson}\n-->`
      );
      
      // 找到第一个版本标题的位置
      const versionHeaderIndex = lines.findIndex(line => line.startsWith('## ['));
      
      if (versionHeaderIndex !== -1) {
        // 在第一个版本之前插入新条目
        lines.splice(versionHeaderIndex, 0, ...newEntryLines, '');
      } else {
        // 如果没有找到版本标题，在文件末尾添加
        lines.push('', ...newEntryLines);
      }
      
      return updatedContent.replace(
        existingContent.substring(existingContent.indexOf('\n## [')),
        '\n' + lines.slice(lines.findIndex(line => line.startsWith('## ['))).join('\n')
      );
    }
    
    return existingContent + '\n' + newEntryLines.join('\n');
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

    const commitsByType = this.groupCommitsByType(entry.commits);

    for (const [type, commits] of Object.entries(commitsByType)) {
      const typeName = COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
      lines.push(`### ${typeName}`);
      lines.push('');

      for (const commit of commits) {
        const shortHash = commit.hash.substring(0, 7);
        const message = this.formatCommitMessage(commit.message);
        lines.push(`- ${message} ([${shortHash}](../../commit/${commit.hash}))`);
      }
      lines.push('');
    }

    return lines;
  }

  /**
   * 按提交类型分组
   */
  private groupCommitsByType(commits: CommitInfo[]): Record<string, CommitInfo[]> {
    const groups: Record<string, CommitInfo[]> = {};

    for (const commit of commits) {
      const type = commit.type || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(commit);
    }

    return groups;
  }

  /**
   * 格式化提交消息
   */
  private formatCommitMessage(message: string): string {
    // 移除常规提交前缀
    const conventionalPattern = /^(\w+)(\(.+\))?:\s*/;
    const cleanMessage = message.replace(conventionalPattern, '');
    
    // 首字母大写
    return cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
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
    
    if (!existsSync(packageJsonPath)) {
      throw new Error(`找不到 package.json 文件: ${packageJsonPath}`);
    }

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
      commit.message.includes('!:')
    );
  }

  /**
   * 创建 changelog 条目
   */
  createChangelogEntry(
    version: string,
    commits: CommitInfo[],
    date: Date = new Date()
  ): ChangelogEntry {
    return {
      version,
      date,
      commits,
      breaking: this.hasBreakingChanges(commits)
    };
  }

  /**
   * 生成包的 changelog 文件
   */
  async generatePackageChangelog(
    packageInfo: PackageInfo,
    commits: CommitInfo[],
    lastCommitHash: string
  ): Promise<void> {
    const changelogPath = join(packageInfo.path, CHANGELOG_FILE_NAME);
    
    // 创建 changelog 条目
    const entry = this.createChangelogEntry(packageInfo.version, commits);
    
    // 创建元数据
    const metadata: ChangelogMetadata = {
      lastCommitHash,
      lastUpdateTime: new Date(),
      packageName: packageInfo.name,
      packagePath: packageInfo.path
    };

    if (existsSync(changelogPath)) {
      await this.updateChangelog(packageInfo.path, entry, metadata);
    } else {
      const content = await this.generateChangelog(packageInfo, [entry], metadata);
      writeFileSync(changelogPath, content);
    }
  }
} 