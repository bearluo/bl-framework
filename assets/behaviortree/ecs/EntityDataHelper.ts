/**
 * Entity 数据访问辅助类
 * 提供便捷的方法来访问 Entity 的 Component 数据
 */

import { ComponentType, EntityId, IComponent } from '../../ecs/types';
import { World } from '../../ecs/core/World';
import { Component } from '../../ecs/core/Component';

/**
 * Entity 数据访问辅助类
 */
export class EntityDataHelper {
    /**
     * 从 Entity 的 Component 中获取数据
     * @param world World 实例
     * @param entityId Entity ID
     * @param componentType 组件类型
     * @param key 数据键（组件属性名）
     * @returns 数据值
     */
    static getEntityData<T extends IComponent>(
        world: World,
        entityId: EntityId,
        componentType: ComponentType<T>,
        key: string
    ): T[keyof T] | undefined {
        const component = world.getComponent(entityId, componentType);
        if (!component) {
            return undefined;
        }

        // 从组件中获取属性值
        return (component as T)[key];
    }

    /**
     * 设置 Entity 的 Component 数据
     * @param world World 实例
     * @param entityId Entity ID
     * @param componentType 组件类型
     * @param key 数据键（组件属性名）
     * @param value 数据值
     */
    static setEntityData<T extends IComponent>(
        world: World,
        entityId: EntityId,
        componentType: ComponentType<T>,
        key: keyof T,
        value: T[keyof T]
    ): void {
        const component = world.getComponent(entityId, componentType);
        if (!component) {
            return;
        }

        // 设置组件属性值
        (component as T)[key] = value;
    }

    /**
     * 检查 Entity 是否有指定的 Component
     * @param world World 实例
     * @param entityId Entity ID
     * @param componentType 组件类型
     * @returns 是否有该组件
     */
    static hasComponent<T extends IComponent>(
        world: World,
        entityId: EntityId,
        componentType: ComponentType<T>
    ): boolean {
        return world.getComponent(entityId, componentType) !== undefined;
    }
}

