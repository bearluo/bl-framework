/**
 * 黑板（共享数据存储）
 * 用于行为树节点之间共享数据
 */

import { ComponentType, EntityId, IComponent } from '../../ecs/types';

/**
 * 黑板监听器类型
 */
export type BlackboardListener = (newValue: any, oldValue: any) => void;

/**
 * 黑板类
 * 提供类型安全的数据存储和访问
 */
export class Blackboard {
    private data: Map<string, any> = new Map();
    private listeners: Map<string, Set<BlackboardListener>> = new Map();
    /** Entity 绑定：数据键 -> { entityId, componentType, propertyKey } */
    private entityBindings: Map<string, { entityId: EntityId; componentType: ComponentType<IComponent>; propertyKey: string }> = new Map();
    private cache: Map<string, any> = new Map();
    private cacheVersion: number = 0;

    /**
     * 设置值
     * @param key 键
     * @param value 值
     */
    set<T>(key: string, value: T): void {
        const oldValue = this.data.get(key);
        this.data.set(key, value);
        this.cache.set(key, value);
        this.cacheVersion++;

        // 触发监听器
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(listener => listener(value, oldValue));
        }
    }

    /**
     * 获取值
     * @param key 键
     * @param defaultValue 默认值
     * @returns 值
     */
    get<T>(key: string, defaultValue?: T): T {
        // 检查缓存
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // 检查 Entity 绑定
        if (this.entityBindings.has(key) && this.entityAccessor) {
            const binding = this.entityBindings.get(key)!;
            const value = this.entityAccessor(
                binding.entityId,
                binding.componentType,
                binding.propertyKey
            );
            if (value !== undefined) {
                this.cache.set(key, value);
                return value;
            }
        }

        // 从数据存储获取
        const value = this.data.get(key);
        if (value !== undefined) {
            this.cache.set(key, value);
            return value;
        }

        return defaultValue as T;
    }

    /**
     * 检查键是否存在
     * @param key 键
     * @returns 是否存在
     */
    has(key: string): boolean {
        return this.data.has(key) || this.entityBindings.has(key);
    }

    /**
     * 删除键
     * @param key 键
     * @returns 是否删除成功
     */
    delete(key: string): boolean {
        const result = this.data.delete(key);
        this.cache.delete(key);
        this.cacheVersion++;
        return result;
    }

    /**
     * 清空所有数据
     */
    clear(): void {
        this.data.clear();
        this.cache.clear();
        this.entityBindings.clear();
        this.listeners.clear();
        this.cacheVersion++;
    }

    /**
     * 监听数据变化
     * @param key 键
     * @param listener 监听器
     * @returns 取消监听的函数
     */
    watch(key: string, listener: BlackboardListener): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key)!.add(listener);

        // 返回取消监听的函数
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * 绑定 Entity 数据
     * @param entityId Entity ID
     * @param componentType 组件类型
     * @param propertyKey 组件属性名
     * @param dataKey 数据键
     */
    bindEntity<T extends IComponent>(
        entityId: EntityId,
        componentType: ComponentType<T>,
        propertyKey: string,
        dataKey?: string
    ): void {
        const key = dataKey || propertyKey;
        const prop = propertyKey;
        this.entityBindings.set(key, {
            entityId,
            componentType,
            propertyKey: prop
        });
    }

    /**
     * 绑定 Entity 组件属性到数据键
     * @param entityId Entity ID
     * @param componentType 组件类型
     * @param propertyKey 组件属性名
     * @param dataKey 数据键
     */
    bindEntityProperty<T extends IComponent>(
        entityId: EntityId,
        componentType: ComponentType<T>,
        propertyKey: string,
        dataKey: string
    ): void {
        this.entityBindings.set(dataKey, {
            entityId,
            componentType,
            propertyKey
        });
    }


    /**
     * 设置 Entity 数据访问器
     * @param accessor 数据访问器函数
     */
    setEntityAccessor(accessor: (entityId: EntityId, componentType: ComponentType<IComponent>, propertyKey: string) => any): void {
        this.entityAccessor = accessor;
    }

    /** Entity 数据访问器 */
    private entityAccessor?: (entityId: EntityId, componentType: ComponentType<IComponent>, propertyKey: string) => any;

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheVersion++;
    }

    /**
     * 获取缓存版本号
     * @returns 缓存版本号
     */
    getCacheVersion(): number {
        return this.cacheVersion;
    }
}

