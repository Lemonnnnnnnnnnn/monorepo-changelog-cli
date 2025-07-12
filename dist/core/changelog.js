"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangelogGenerator = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const constants_1 = require("../utils/constants");
class ChangelogGenerator {
    constructor(rootPath = process.cwd()) {
        this.rootPath = rootPath;
    }
    async generateChangelog(packageInfo, entries, metadata) {
        const lines = [];
        lines.push(`# ${packageInfo.name} 更新日志`);
        lines.push('');
        const metadataJson = JSON.stringify(metadata, null, 2);
        lines.push(`${constants_1.CHANGELOG_METADATA_COMMENT}`);
        lines.push(metadataJson);
        lines.push('-->');
        lines.push('');
        lines.push('所有重要的更改都将记录在此文件中。');
        lines.push('');
        const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (const entry of sortedEntries) {
            lines.push(`## [${entry.version}] - ${this.formatDate(entry.date)}`);
            lines.push('');
            if (entry.breaking) {
                lines.push('### ⚠️ 破坏性更改');
                lines.push('');
            }
            const commitsByType = this.groupCommitsByType(entry.commits);
            for (const [type, commits] of Object.entries(commitsByType)) {
                const typeName = constants_1.COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
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
    async updateChangelog(packagePath, newEntry, metadata) {
        const changelogPath = (0, path_1.join)(packagePath, constants_1.CHANGELOG_FILE_NAME);
        if ((0, fs_1.existsSync)(changelogPath)) {
            const existingContent = (0, fs_1.readFileSync)(changelogPath, 'utf-8');
            const updatedContent = this.insertNewEntry(existingContent, newEntry, metadata);
            (0, fs_1.writeFileSync)(changelogPath, updatedContent);
        }
        else {
            const packageInfo = await this.getPackageInfo(packagePath);
            const content = await this.generateChangelog(packageInfo, [newEntry], metadata);
            (0, fs_1.writeFileSync)(changelogPath, content);
        }
    }
    insertNewEntry(existingContent, newEntry, metadata) {
        const lines = existingContent.split('\n');
        const newEntryLines = this.generateEntryLines(newEntry);
        const metadataRegex = new RegExp(`${constants_1.CHANGELOG_METADATA_COMMENT}\\s*(.+?)\\s*-->`, 's');
        const metadataMatch = existingContent.match(metadataRegex);
        if (metadataMatch) {
            const newMetadataJson = JSON.stringify(metadata, null, 2);
            const updatedContent = existingContent.replace(metadataRegex, `${constants_1.CHANGELOG_METADATA_COMMENT}\n${newMetadataJson}\n-->`);
            const versionHeaderIndex = lines.findIndex(line => line.startsWith('## ['));
            if (versionHeaderIndex !== -1) {
                lines.splice(versionHeaderIndex, 0, ...newEntryLines, '');
            }
            else {
                lines.push('', ...newEntryLines);
            }
            return updatedContent.replace(existingContent.substring(existingContent.indexOf('\n## [')), '\n' + lines.slice(lines.findIndex(line => line.startsWith('## ['))).join('\n'));
        }
        return existingContent + '\n' + newEntryLines.join('\n');
    }
    generateEntryLines(entry) {
        const lines = [];
        lines.push(`## [${entry.version}] - ${this.formatDate(entry.date)}`);
        lines.push('');
        if (entry.breaking) {
            lines.push('### ⚠️ 破坏性更改');
            lines.push('');
        }
        const commitsByType = this.groupCommitsByType(entry.commits);
        for (const [type, commits] of Object.entries(commitsByType)) {
            const typeName = constants_1.COMMIT_TYPE_MAPPINGS[type] || `🔧 ${type}`;
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
    groupCommitsByType(commits) {
        const groups = {};
        for (const commit of commits) {
            const type = commit.type || 'other';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(commit);
        }
        return groups;
    }
    formatCommitMessage(message) {
        const conventionalPattern = /^(\w+)(\(.+\))?:\s*/;
        const cleanMessage = message.replace(conventionalPattern, '');
        return cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    async getPackageInfo(packagePath) {
        const packageJsonPath = (0, path_1.join)(packagePath, 'package.json');
        if (!(0, fs_1.existsSync)(packageJsonPath)) {
            throw new Error(`找不到 package.json 文件: ${packageJsonPath}`);
        }
        const content = (0, fs_1.readFileSync)(packageJsonPath, 'utf-8');
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
    hasBreakingChanges(commits) {
        return commits.some(commit => commit.message.includes('BREAKING CHANGE') ||
            commit.message.includes('!:'));
    }
    createChangelogEntry(version, commits, date = new Date()) {
        return {
            version,
            date,
            commits,
            breaking: this.hasBreakingChanges(commits)
        };
    }
    async generatePackageChangelog(packageInfo, commits, lastCommitHash) {
        const changelogPath = (0, path_1.join)(packageInfo.path, constants_1.CHANGELOG_FILE_NAME);
        const entry = this.createChangelogEntry(packageInfo.version, commits);
        const metadata = {
            lastCommitHash,
            lastUpdateTime: new Date(),
            packageName: packageInfo.name,
            packagePath: packageInfo.path
        };
        if ((0, fs_1.existsSync)(changelogPath)) {
            await this.updateChangelog(packageInfo.path, entry, metadata);
        }
        else {
            const content = await this.generateChangelog(packageInfo, [entry], metadata);
            (0, fs_1.writeFileSync)(changelogPath, content);
        }
    }
}
exports.ChangelogGenerator = ChangelogGenerator;
//# sourceMappingURL=changelog.js.map