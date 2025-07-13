import { resolve, normalize, relative } from 'path';

export class PathMatcher {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
  }

  /**
   * 检查Git相对路径是否属于指定的包路径
   * @param gitRelativePath Git仓库中的相对路径 (如: packages/pkg-a/index.js)
   * @param packageAbsolutePath 包的绝对路径 (如: /path/to/project/packages/pkg-a)
   * @returns 是否匹配
   */
  doesFileAffectPackage(gitRelativePath: string, packageAbsolutePath: string): boolean {
    // 将Git相对路径转换为绝对路径
    const fileAbsolutePath = resolve(this.rootPath, gitRelativePath);
    
    // 规范化包路径
    const normalizedPackagePath = resolve(packageAbsolutePath);
    
    // 检查文件是否在包目录内
    return fileAbsolutePath.startsWith(normalizedPackagePath);
  }

  /**
   * 检查Git相对路径是否匹配指定的路径模式
   * @param gitRelativePath Git仓库中的相对路径
   * @param targetPath 目标路径（可以是绝对路径或相对路径）
   * @returns 是否匹配
   */
  doesFileMatchPath(gitRelativePath: string, targetPath: string): boolean {
    const fileAbsolutePath = resolve(this.rootPath, gitRelativePath);
    
    // 如果targetPath是绝对路径，直接使用；否则相对于rootPath解析
    const normalizedTargetPath = resolve(targetPath.startsWith('/') || targetPath.includes(':\\') 
      ? targetPath 
      : this.rootPath, targetPath);
    
    return fileAbsolutePath.startsWith(normalizedTargetPath);
  }

  /**
   * 将包的绝对路径转换为相对于项目根目录的路径
   * @param packageAbsolutePath 包的绝对路径
   * @returns 相对路径
   */
  getPackageRelativePath(packageAbsolutePath: string): string {
    return relative(this.rootPath, packageAbsolutePath);
  }

  /**
   * 检查多个Git相对路径中是否有任何一个影响指定包
   * @param gitRelativePaths Git相对路径数组
   * @param packageAbsolutePath 包的绝对路径
   * @returns 是否有文件影响该包
   */
  doesAnyFileAffectPackage(gitRelativePaths: string[], packageAbsolutePath: string): boolean {
    return gitRelativePaths.some(filePath => 
      this.doesFileAffectPackage(filePath, packageAbsolutePath)
    );
  }

  /**
   * 过滤出影响指定包的Git相对路径
   * @param gitRelativePaths Git相对路径数组
   * @param packageAbsolutePath 包的绝对路径
   * @returns 影响该包的文件路径数组
   */
  filterFilesAffectingPackage(gitRelativePaths: string[], packageAbsolutePath: string): string[] {
    return gitRelativePaths.filter(filePath => 
      this.doesFileAffectPackage(filePath, packageAbsolutePath)
    );
  }

  /**
   * 调试用：显示路径转换信息
   */
  debugPaths(gitRelativePath: string, packageAbsolutePath: string): {
    gitRelativePath: string;
    gitAbsolutePath: string;
    packageAbsolutePath: string;
    packageRelativePath: string;
    matches: boolean;
  } {
    const gitAbsolutePath = resolve(this.rootPath, gitRelativePath);
    const packageRelativePath = this.getPackageRelativePath(packageAbsolutePath);
    const matches = this.doesFileAffectPackage(gitRelativePath, packageAbsolutePath);

    return {
      gitRelativePath,
      gitAbsolutePath,
      packageAbsolutePath: resolve(packageAbsolutePath),
      packageRelativePath,
      matches
    };
  }
} 