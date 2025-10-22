import { Component } from '../core/Component';
import { ComponentType } from '../types';

/**
 * 组件对象池
 * 用于复用组件对象，减少GC压力
 */
export class ComponentPool<T extends Component> {
    /** 对象池 */
    private pool: T[] = [];

    /** 组件类型 */
    private componentType: ComponentType<T>;

    /** 池大小 */
    private size: number;

    /** 已创建的组件数量 */
    private createdCount: number = 0;

    constructor(componentType: ComponentType<T>, size: number = 100) {
        this.componentType = componentType;
        this.size = size;

        // 预创建组件对象
        for (let i = 0; i < size; i++) {
            this.pool.push(new componentType());
        }

        this.createdCount = size;
    }

    /**
     * 从池中获取组件
     */
    acquire(): T {
        if (this.pool.length > 0) {
            const component = this.pool.pop()!;
            component.reset();
            return component;
        }

        // 池中没有可用对象，创建新对象
        this.createdCount++;
        return new this.componentType();
    }

    /**
     * 归还组件到池中
     */
    release(component: T): void {
        // 重置组件状态
        component.reset();

        // 只保留池大小限制内的对象
        if (this.pool.length < this.size) {
            this.pool.push(component);
        }
    }

    /**
     * 获取池中可用对象数量
     */
    getAvailableCount(): number {
        return this.pool.length;
    }

    /**
     * 获取已创建的总对象数量
     */
    getTotalCreatedCount(): number {
        return this.createdCount;
    }

    /**
     * 清空对象池
     */
    clear(): void {
        this.pool = [];
    }
}

