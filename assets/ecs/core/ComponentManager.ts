import { Component } from './Component';
import { ComponentType, ComponentTypeId, EntityId } from '../types';
import { ComponentPool } from '../utils/ComponentPool';
import { getComponentMetadata } from '../decorators/component';
import { BitSet } from '../utils/BitSet';

/**
 * 组件管理器
 * 负责组件的创建、销毁和查询
 */
export class ComponentManager {
    /** 组件类型映射表 */
    private componentTypes: Map<ComponentType, ComponentTypeId> = new Map();

    /** 组件类型ID计数器 */
    private nextTypeId: ComponentTypeId = 0;

    /** 实体的组件存储 [EntityId -> [ComponentTypeId -> Component]] */
    private entityComponents: Map<EntityId, Map<ComponentTypeId, Component>> =
        new Map();

    /** 实体的组件位集合 [EntityId -> BitSet] */
    private entityComponentBits: Map<EntityId, BitSet> = new Map();

    /** 组件对象池 */
    private componentPools: Map<ComponentTypeId, ComponentPool<Component>> =
        new Map();

    /** 默认组件池大小 */
    private defaultPoolSize: number = 100;

    constructor(poolSize: number = 100) {
        this.defaultPoolSize = poolSize;
    }

    /**
     * 注册组件类型
     */
    registerComponentType<T extends Component>(
        componentType: ComponentType<T>
    ): ComponentTypeId {
        if (this.componentTypes.has(componentType)) {
            return this.componentTypes.get(componentType)!;
        }

        const typeId = this.nextTypeId++;
        this.componentTypes.set(componentType, typeId);

        // 读取装饰器配置
        const metadata = getComponentMetadata(componentType);
        const pooled = metadata?.pooled !== false; // 默认启用对象池
        const poolSize = metadata?.poolSize || this.defaultPoolSize;

        // 根据配置创建组件对象池
        if (pooled) {
            const pool = new ComponentPool<T>(componentType, poolSize);
            this.componentPools.set(typeId, pool as ComponentPool<Component>);
        }

        return typeId;
    }

    /**
     * 获取组件类型ID
     */
    getComponentTypeId<T extends Component>(
        componentType: ComponentType<T>
    ): ComponentTypeId | undefined {
        return this.componentTypes.get(componentType);
    }

    /**
     * 为实体添加组件
     */
    addComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): T {
        const typeId = this.registerComponentType(componentType);

        // 获取或创建实体的组件映射
        let components = this.entityComponents.get(entityId);
        if (!components) {
            components = new Map();
            this.entityComponents.set(entityId, components);
        }

        // 获取或创建实体的位集合
        let bitSet = this.entityComponentBits.get(entityId);
        if (!bitSet) {
            bitSet = new BitSet(256); // 初始支持 256 种组件类型
            this.entityComponentBits.set(entityId, bitSet);
        }

        // 从对象池获取组件实例，如果没有对象池则直接创建
        let component: T;
        const pool = this.componentPools.get(typeId);
        if (pool) {
            component = pool.acquire() as T;
        } else {
            // 没有对象池，直接创建新实例
            component = new componentType();
        }

        component.entityId = entityId;

        // 调用组件初始化
        component.onInit?.();

        components.set(typeId, component);

        // 更新位集合
        bitSet.set(typeId);

        return component;
    }

    /**
     * 获取实体的组件
     */
    getComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): T | undefined {
        const typeId = this.componentTypes.get(componentType);
        if (typeId === undefined) return undefined;

        const components = this.entityComponents.get(entityId);
        return components?.get(typeId) as T | undefined;
    }

    /**
     * 移除实体的组件
     */
    removeComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): boolean {
        const typeId = this.componentTypes.get(componentType);
        if (typeId === undefined) return false;

        const components = this.entityComponents.get(entityId);
        if (!components) return false;

        const component = components.get(typeId);
        if (!component) return false;

        // 调用组件销毁
        component.onDestroy?.();

        // 如果有对象池，归还到对象池
        const pool = this.componentPools.get(typeId);
        if (pool) {
            pool.release(component);
        }

        components.delete(typeId);

        // 更新位集合
        const bitSet = this.entityComponentBits.get(entityId);
        if (bitSet) {
            bitSet.clear(typeId);
        }

        return true;
    }

    /**
     * 检查实体是否有组件
     */
    hasComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): boolean {
        const typeId = this.componentTypes.get(componentType);
        if (typeId === undefined) return false;

        const components = this.entityComponents.get(entityId);
        return components?.has(typeId) ?? false;
    }

    /**
     * 获取实体的所有组件
     */
    getComponents(entityId: EntityId): Component[] {
        const components = this.entityComponents.get(entityId);
        return components ? Array.from(components.values()) : [];
    }

    /**
     * 获取实体的所有组件类型ID
     */
    getComponentTypeIds(entityId: EntityId): ComponentTypeId[] {
        const components = this.entityComponents.get(entityId);
        return components ? Array.from(components.keys()) : [];
    }

    /**
     * 获取实体的组件位集合
     */
    getEntityComponentBits(entityId: EntityId): BitSet | undefined {
        return this.entityComponentBits.get(entityId);
    }

    /**
     * 移除实体的所有组件
     */
    removeAllComponents(entityId: EntityId): void {
        const components = this.entityComponents.get(entityId);
        if (!components) return;

        // 归还所有组件到对象池（如果有）
        for (const [typeId, component] of components) {
            component.onDestroy?.();
            const pool = this.componentPools.get(typeId);
            if (pool) {
                pool.release(component);
            }
        }

        this.entityComponents.delete(entityId);

        // 清除位集合
        this.entityComponentBits.delete(entityId);
    }

    /**
     * 清空所有数据
     */
    clear(): void {
        // 归还所有组件到对象池（如果有）
        for (const components of this.entityComponents.values()) {
            for (const [typeId, component] of components) {
                component.onDestroy?.();
                const pool = this.componentPools.get(typeId);
                if (pool) {
                    pool.release(component);
                }
            }
        }

        this.entityComponents.clear();
        this.entityComponentBits.clear();
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.clear();
        this.componentTypes.clear();
        this.componentPools.clear();
    }
}

