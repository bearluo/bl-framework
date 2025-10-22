/**
 * 组件装饰器
 * 用于标记和配置组件类
 */

/**
 * 组件装饰器配置
 */
export interface ComponentDecoratorConfig {
    /** 组件名称 */
    name?: string;
    /** 是否使用对象池 */
    pooled?: boolean;
    /** 对象池大小 */
    poolSize?: number;
}

/** 组件元数据存储 */
const componentMetadataMap = new WeakMap<any, ComponentDecoratorConfig>();

/**
 * 组件装饰器
 * @param config 配置选项
 */
export function component(config: ComponentDecoratorConfig = {}) {
    return function <T extends { new (...args: any[]): {} }>(
        constructor: T
    ): T {
        // 存储元数据
        componentMetadataMap.set(constructor, config);

        // 可以在这里添加更多的组件初始化逻辑

        return constructor;
    };
}

/**
 * 获取组件元数据
 */
export function getComponentMetadata(
    constructor: any
): ComponentDecoratorConfig | undefined {
    return componentMetadataMap.get(constructor);
}

