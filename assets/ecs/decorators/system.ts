/**
 * 系统装饰器
 * 用于标记和配置系统类
 */

/**
 * 系统装饰器配置
 */
export interface SystemDecoratorConfig {
    /** 系统名称 */
    name?: string;
    /** 系统优先级 */
    priority?: number;
}

/** 系统元数据存储 */
const systemMetadataMap = new WeakMap<any, SystemDecoratorConfig>();

/**
 * 系统装饰器
 * @param config 配置选项
 */
export function system(config: SystemDecoratorConfig = {}) {
    return function <T extends { new (...args: any[]): {} }>(
        constructor: T
    ): T {
        // 存储元数据
        systemMetadataMap.set(constructor, config);

        // 如果设置了优先级，更新实例的优先级
        if (config.priority !== undefined) {
            const originalConstructor = constructor;
            const newConstructor: any = function (...args: any[]) {
                const instance = new originalConstructor(...args);
                if ('priority' in instance) {
                    (instance as any).priority = config.priority;
                }
                return instance;
            };

            // 复制静态属性
            Object.setPrototypeOf(newConstructor, originalConstructor);
            newConstructor.prototype = originalConstructor.prototype;

            // 保持元数据
            systemMetadataMap.set(newConstructor, config);

            return newConstructor;
        }

        return constructor;
    };
}

/**
 * 获取系统元数据
 */
export function getSystemMetadata(
    constructor: any
): SystemDecoratorConfig | undefined {
    return systemMetadataMap.get(constructor);
}

