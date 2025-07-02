/**
 * JWT Core 模块
 * 提供 JWT 客户端请求封装
 */

import { JWTClient } from './JWTClient';

// 导出 JWT 客户端
export { JWTClient };
export type { JWTClientConfig } from './JWTClient';

// 导出便捷的工厂函数
export class JWTCore {
    /**
     * 创建 JWT 客户端实例
     * @param config JWT 客户端配置
     * @returns JWT 客户端实例
     */
    public static createClient(config: any): any {
        return new JWTClient(config);
    }

    /**
     * 创建默认配置的 JWT 客户端
     * @param baseUrl API 基础 URL
     * @returns JWT 客户端实例
     */
    public static createDefaultClient(baseUrl: string): any {
        return new JWTClient({ baseUrl });
    }
} 