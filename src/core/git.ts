import { simpleGit, SimpleGit, LogOptions } from 'simple-git';
import { CommitInfo } from '../types';
import { glob } from 'glob';
import path from 'path';

export class GitManager {
  private git: SimpleGit;
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);
  }

  /**
   * 获取仓库的所有提交记录
   */
  async getAllCommits(since?: string): Promise<CommitInfo[]> {
    const options: any = {};

    if (since) {
      options.from = since;
    }

    const log = await this.git.log(options);
    const commits: CommitInfo[] = [];

    for (const commit of log.all) {
      const files = await this.getCommitFiles(commit.hash);
      const commitInfo: CommitInfo = {
        hash: commit.hash,
        message: commit.message,
        author: `${commit.author_name} <${commit.author_email}>`,
        date: new Date(commit.date),
        files,
        type: this.parseCommitType(commit.message)
      };
      commits.push(commitInfo);
    }

    return commits;
  }

  /**
   * 获取指定提交的变更文件列表
   */
  async getCommitFiles(commitHash: string): Promise<string[]> {
    try {
      const result = await this.git.show([commitHash, '--name-only', '--format=']);
      return result.split('\n').filter(file => file.trim() !== '');
    } catch (error) {
      console.warn(`无法获取提交 ${commitHash} 的文件列表:`, error);
      return [];
    }
  }

  /**
   * 获取两个提交之间的变更文件
   */
  async getFilesBetweenCommits(fromCommit: string, toCommit: string): Promise<string[]> {
    try {
      const result = await this.git.raw(['diff', '--name-only', fromCommit, toCommit]);
      return result.split('\n').filter(file => file.trim() !== '');
    } catch (error) {
      console.warn(`无法获取提交 ${fromCommit}...${toCommit} 之间的文件列表:`, error);
      return [];
    }
  }

  /**
   * 获取最新的提交哈希
   */
  async getLatestCommitHash(): Promise<string> {
    const log = await this.git.log(['--max-count=1']);
    return log.latest?.hash || '';
  }

  /**
   * 检查是否是 Git 仓库
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取仓库根目录
   */
  async getRepoRoot(): Promise<string> {
    try {
      const result = await this.git.raw(['rev-parse', '--show-toplevel']);
      return result.trim();
    } catch {
      return this.rootPath;
    }
  }

  /**
   * 从提交消息中解析提交类型
   */
  private parseCommitType(message: string): string | undefined {
    const match = message.match(/^(\w+)(\(.+\))?:/);
    return match ? match[1] : undefined;
  }

  /**
   * 检查提交是否影响指定路径
   */
  async doesCommitAffectPath(commitHash: string, targetPath: string): Promise<boolean> {
    const files = await this.getCommitFiles(commitHash);
    const normalizedPath = path.normalize(targetPath);
    
    return files.some(file => {
      const normalizedFile = path.normalize(file);
      return normalizedFile.startsWith(normalizedPath);
    });
  }

  /**
   * 获取指定路径的相关提交
   */
  async getCommitsForPath(pathPattern: string, since?: string): Promise<CommitInfo[]> {
    const allCommits = await this.getAllCommits(since);
    const filteredCommits: CommitInfo[] = [];

    for (const commit of allCommits) {
      const affectedFiles = commit.files.filter(file => {
        const normalizedFile = path.normalize(file);
        const normalizedPattern = path.normalize(pathPattern);
        return normalizedFile.startsWith(normalizedPattern);
      });

      if (affectedFiles.length > 0) {
        filteredCommits.push({
          ...commit,
          files: affectedFiles
        });
      }
    }

    return filteredCommits;
  }

  /**
   * 获取指定提交的详细信息
   */
  async getCommitDetails(commitHash: string): Promise<CommitInfo | null> {
    try {
      const log = await this.git.show([commitHash, '--format=fuller', '--name-only']);
      const lines = log.split('\n');
      
      let message = '';
      let author = '';
      let date = '';
      let files: string[] = [];
      let inFiles = false;

      for (const line of lines) {
        if (line.startsWith('commit ')) {
          continue;
        } else if (line.startsWith('Author:')) {
          author = line.replace('Author:', '').trim();
        } else if (line.startsWith('Date:')) {
          date = line.replace('Date:', '').trim();
        } else if (line.trim() === '' && !inFiles) {
          inFiles = true;
        } else if (inFiles && line.trim() !== '') {
          if (line.startsWith('    ')) {
            message += line.trim() + '\n';
          } else {
            files.push(line.trim());
          }
        }
      }

      return {
        hash: commitHash,
        message: message.trim(),
        author,
        date: new Date(date),
        files,
        type: this.parseCommitType(message)
      };
    } catch (error) {
      console.warn(`无法获取提交 ${commitHash} 的详细信息:`, error);
      return null;
    }
  }
} 