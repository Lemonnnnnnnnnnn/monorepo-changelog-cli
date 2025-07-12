"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitManager = void 0;
const simple_git_1 = require("simple-git");
const path_1 = __importDefault(require("path"));
class GitManager {
    constructor(rootPath = process.cwd()) {
        this.rootPath = rootPath;
        this.git = (0, simple_git_1.simpleGit)(rootPath);
    }
    async getAllCommits(since) {
        const options = {};
        if (since) {
            options.from = since;
        }
        const log = await this.git.log(options);
        const commits = [];
        for (const commit of log.all) {
            const files = await this.getCommitFiles(commit.hash);
            const commitInfo = {
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
    async getCommitFiles(commitHash) {
        try {
            const result = await this.git.show([commitHash, '--name-only', '--format=']);
            return result.split('\n').filter(file => file.trim() !== '');
        }
        catch (error) {
            console.warn(`无法获取提交 ${commitHash} 的文件列表:`, error);
            return [];
        }
    }
    async getFilesBetweenCommits(fromCommit, toCommit) {
        try {
            const result = await this.git.raw(['diff', '--name-only', fromCommit, toCommit]);
            return result.split('\n').filter(file => file.trim() !== '');
        }
        catch (error) {
            console.warn(`无法获取提交 ${fromCommit}...${toCommit} 之间的文件列表:`, error);
            return [];
        }
    }
    async getLatestCommitHash() {
        const log = await this.git.log(['--max-count=1']);
        return log.latest?.hash || '';
    }
    async isGitRepository() {
        try {
            await this.git.status();
            return true;
        }
        catch {
            return false;
        }
    }
    async getRepoRoot() {
        try {
            const result = await this.git.raw(['rev-parse', '--show-toplevel']);
            return result.trim();
        }
        catch {
            return this.rootPath;
        }
    }
    parseCommitType(message) {
        const match = message.match(/^(\w+)(\(.+\))?:/);
        return match ? match[1] : undefined;
    }
    async doesCommitAffectPath(commitHash, targetPath) {
        const files = await this.getCommitFiles(commitHash);
        const normalizedPath = path_1.default.normalize(targetPath);
        return files.some(file => {
            const normalizedFile = path_1.default.normalize(file);
            return normalizedFile.startsWith(normalizedPath);
        });
    }
    async getCommitsForPath(pathPattern, since) {
        const allCommits = await this.getAllCommits(since);
        const filteredCommits = [];
        for (const commit of allCommits) {
            const affectedFiles = commit.files.filter(file => {
                const normalizedFile = path_1.default.normalize(file);
                const normalizedPattern = path_1.default.normalize(pathPattern);
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
    async getCommitDetails(commitHash) {
        try {
            const log = await this.git.show([commitHash, '--format=fuller', '--name-only']);
            const lines = log.split('\n');
            let message = '';
            let author = '';
            let date = '';
            let files = [];
            let inFiles = false;
            for (const line of lines) {
                if (line.startsWith('commit ')) {
                    continue;
                }
                else if (line.startsWith('Author:')) {
                    author = line.replace('Author:', '').trim();
                }
                else if (line.startsWith('Date:')) {
                    date = line.replace('Date:', '').trim();
                }
                else if (line.trim() === '' && !inFiles) {
                    inFiles = true;
                }
                else if (inFiles && line.trim() !== '') {
                    if (line.startsWith('    ')) {
                        message += line.trim() + '\n';
                    }
                    else {
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
        }
        catch (error) {
            console.warn(`无法获取提交 ${commitHash} 的详细信息:`, error);
            return null;
        }
    }
}
exports.GitManager = GitManager;
//# sourceMappingURL=git.js.map