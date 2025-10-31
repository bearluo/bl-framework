import { Component } from './Component';
import { ComponentManager } from './ComponentManager';
import { Entity } from './Entity';
import { EntityManager } from './EntityManager';
import { Query } from './Query';
import { System } from './System';
import { SystemManager } from './SystemManager';
import { ComponentType, EntityId, IComponent, IWorld, QueryConfig, WorldConfig } from '../types';

/**
 * ECS World
 * ECS框架的核心，管理所有实体、组件和系统
 */
export class World implements IWorld {
    /** 实体管理器 */
    private entityManager: EntityManager;

    /** 组件管理器 */
    private componentManager: ComponentManager;

    /** 系统管理器 */
    private systemManager: SystemManager;

    /** 查询缓存 */
    private queries: Map<string, Query> = new Map();

    /** World配置 */
    private config: WorldConfig;

    /** 是否启用调试模式 */
    public debug: boolean = false;

    constructor(config: WorldConfig = {}) {
        this.config = {
            initialEntityPoolSize: 1000,
            componentPoolSize: 100,
            debug: false,
            ...config,
        };

        this.debug = this.config.debug!;

        // 初始化管理器
        this.entityManager = new EntityManager(
            this.config.initialEntityPoolSize
        );
        this.componentManager = new ComponentManager(
            this.config.componentPoolSize
        );
        this.systemManager = new SystemManager(this);

        if (this.debug) {
            console.log('[ECS] World created with config:', this.config);
        }
    }

    // ==================== 实体操作 ====================

    /**
     * 创建实体
     */
    createEntity(name?: string): Entity {
        const entity = this.entityManager.createEntity(name);
        entity.world = this;
        this.markQueriesDirty();

        if (this.debug) {
            console.log(`[ECS] Entity created: ${entity.id} (${entity.name})`);
        }

        return entity;
    }

    /**
     * 销毁实体
     */
    destroyEntity(entityId: EntityId): boolean {
        // 移除所有组件
        this.componentManager.removeAllComponents(entityId);

        // 销毁实体
        const result = this.entityManager.destroyEntity(entityId);

        if (result) {
            this.markQueriesDirty();

            if (this.debug) {
                console.log(`[ECS] Entity destroyed: ${entityId}`);
            }
        }

        return result;
    }

    /**
     * 获取实体
     */
    getEntity(entityId: EntityId): Entity | undefined {
        return this.entityManager.getEntity(entityId);
    }

    /**
     * 获取所有实体
     */
    getAllEntities(): Entity[] {
        return this.entityManager.getAllEntities();
    }

    // ==================== 组件操作 ====================

    /**
     * 为实体添加组件
     */
    addComponent<T extends IComponent>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): T {
        const component = this.componentManager.addComponent(
            entityId,
            componentType
        );
        this.markQueriesDirty();

        if (this.debug) {
            console.log(
                `[ECS] Component added: ${componentType.name} to entity ${entityId}`
            );
        }

        return component;
    }

    /**
     * 获取实体的组件
     */
    getComponent<T extends IComponent>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): T | undefined {
        return this.componentManager.getComponent(entityId, componentType);
    }

    /**
     * 移除实体的组件
     */
    removeComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): boolean {
        const result = this.componentManager.removeComponent(
            entityId,
            componentType
        );

        if (result) {
            this.markQueriesDirty();

            if (this.debug) {
                console.log(
                    `[ECS] Component removed: ${componentType.name} from entity ${entityId}`
                );
            }
        }

        return result;
    }

    /**
     * 检查实体是否有组件
     */
    hasComponent<T extends Component>(
        entityId: EntityId,
        componentType: ComponentType<T>
    ): boolean {
        return this.componentManager.hasComponent(entityId, componentType);
    }

    /**
     * 获取实体的所有组件
     */
    getComponents(entityId: EntityId): Component[] {
        return this.componentManager.getComponents(entityId);
    }

    // ==================== 系统操作 ====================

    /**
     * 注册系统
     */
    registerSystem<T extends System>(systemType: new () => T): T {
        const system = this.systemManager.registerSystem(systemType);

        if (this.debug) {
            console.log(`[ECS] System registered: ${systemType.name}`);
        }

        return system;
    }

    /**
     * 获取系统
     */
    getSystem<T extends System>(systemType: new () => T): T | undefined {
        return this.systemManager.getSystem(systemType);
    }

    /**
     * 移除系统
     */
    removeSystem<T extends System>(systemType: new () => T): boolean {
        const result = this.systemManager.removeSystem(systemType);

        if (result && this.debug) {
            console.log(`[ECS] System removed: ${systemType.name}`);
        }

        return result;
    }

    // ==================== 查询操作 ====================

    /**
     * 创建查询
     */
    createQuery(config: QueryConfig): Query {
        const key = this.getQueryKey(config);

        let query = this.queries.get(key);
        if (!query) {
            query = new Query(
                config,
                this.componentManager,
                this.entityManager
            );
            this.queries.set(key, query);

            if (this.debug) {
                console.log(`[ECS] Query created:`, config);
            }
        }

        return query;
    }

    /**
     * 获取查询的唯一键
     */
    private getQueryKey(config: QueryConfig): string {
        const all = config.all
            ?.map((t) => t.name)
            .sort()
            .join(',');
        const any = config.any
            ?.map((t) => t.name)
            .sort()
            .join(',');
        const none = config.none
            ?.map((t) => t.name)
            .sort()
            .join(',');

        return `all:${all || 'none'},any:${any || 'none'},none:${none || 'none'}`;
    }

    /**
     * 标记所有查询为脏
     */
    private markQueriesDirty(): void {
        for (const query of this.queries.values()) {
            query.markDirty();
        }
    }

    // ==================== 更新和生命周期 ====================

    /**
     * 更新World
     */
    update(dt: number): void {
        this.systemManager.update(dt);
    }

    /**
     * 清空World
     */
    clear(): void {
        this.systemManager.clear();
        this.componentManager.clear();
        this.entityManager.clear();
        this.queries.clear();

        if (this.debug) {
            console.log('[ECS] World cleared');
        }
    }

    /**
     * 销毁World
     */
    destroy(): void {
        this.clear();
        this.systemManager.destroy();
        this.componentManager.destroy();
        this.entityManager.destroy();

        if (this.debug) {
            console.log('[ECS] World destroyed');
        }
    }

    // ==================== 调试和统计 ====================

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            entities: this.entityManager.getEntityCount(),
            systems: this.systemManager.getAllSystems().length,
            queries: this.queries.size,
        };
    }
}

