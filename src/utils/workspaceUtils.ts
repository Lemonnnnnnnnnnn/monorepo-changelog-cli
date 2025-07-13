/**
   * 检查是否是特殊的 workspace 版本号（如 workspace:*、workspace:^）
   */
export function isSpecialWorkspaceVersion(version: string): boolean {
    return version === 'workspace:*' || version === 'workspace:^' || version === "workspace:~";
}