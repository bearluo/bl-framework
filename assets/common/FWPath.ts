/**
 * 路径操作工具类
 */
export class FWPath {
  /**
   * 路径分隔符
   */
  private static readonly SEPARATOR = '/';

  /**
   * 将多个路径片段拼接成一个完整路径
   * @param paths 路径片段数组
   * @returns 拼接后的路径
   */
  public static join(...paths: string[]): string {
    return paths
      .map(path => path.replace(/[\\/]+/g, this.SEPARATOR))
      .join(this.SEPARATOR)
      .replace(/\/+/g, this.SEPARATOR);
  }

  /**
   * 获取文件扩展名
   * @param path 文件路径
   * @returns 文件扩展名（包含点号）
   */
  public static getExtension(path: string): string {
    const lastDotIndex = path.lastIndexOf('.');
    return lastDotIndex !== -1 ? path.slice(lastDotIndex) : '';
  }

  /**
   * 获取文件名（包含扩展名）
   * @param path 文件路径
   * @returns 文件名
   */
  public static getFileName(path: string): string {
    const normalizedPath = path.replace(/[\\/]+/g, this.SEPARATOR);
    const lastSeparatorIndex = normalizedPath.lastIndexOf(this.SEPARATOR);
    return lastSeparatorIndex !== -1 ? normalizedPath.slice(lastSeparatorIndex + 1) : normalizedPath;
  }

  /**
   * 获取文件名（不包含扩展名）
   * @param path 文件路径
   * @returns 不含扩展名的文件名
   */
  public static getFileNameWithoutExtension(path: string): string {
    const fileName = this.getFileName(path);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  }

  /**
   * 获取目录路径
   * @param path 文件路径
   * @returns 目录路径
   */
  public static getDirectory(path: string): string {
    const normalizedPath = path.replace(/[\\/]+/g, this.SEPARATOR);
    const lastSeparatorIndex = normalizedPath.lastIndexOf(this.SEPARATOR);
    return lastSeparatorIndex !== -1 ? normalizedPath.slice(0, lastSeparatorIndex) : '';
  }

  /**
   * 规范化路径
   * @param path 原始路径
   * @returns 规范化后的路径
   */
  public static normalize(path: string): string {
    return path
      .replace(/[\\/]+/g, this.SEPARATOR)
      .replace(/\/+/g, this.SEPARATOR)
      .replace(/\/$/, '');
  }

  /**
   * 判断路径是否为绝对路径
   * @param path 文件路径
   * @returns 是否为绝对路径
   */
  public static isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
  }

  /**
   * 将路径转换为相对路径
   * @param from 起始路径
   * @param to 目标路径
   * @returns 相对路径
   */
  public static relative(from: string, to: string): string {
    const fromParts = this.normalize(from).split(this.SEPARATOR);
    const toParts = this.normalize(to).split(this.SEPARATOR);
    
    let i = 0;
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
      i++;
    }

    const relativePath = toParts.slice(i).join(this.SEPARATOR);
    return relativePath || '.';
  }
}
