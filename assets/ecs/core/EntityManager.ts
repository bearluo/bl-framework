import { Entity } from './Entity';
import { EntityId } from '../types';

/**
 * 实体管理器
 * 负责实体的创建、销毁和生命周期管理
 */
export class EntityManager {
    /** 实体映射表 */
    private entities: Map<EntityId, Entity> = new Map();

    /** 下一个实体ID */
    private nextEntityId: EntityId = 1;

    /** 待回收的实体ID队列 */
    private recycledIds: EntityId[] = [];

    /** 实体对象池 */
    private entityPool: Entity[] = [];

    /** 实体池大小 */
    private poolSize: number;

    constructor(initialPoolSize: number = 1000) {
        this.poolSize = initialPoolSize;

        // 预创建实体对象池
        for (let i = 0; i < initialPoolSize; i++) {
            this.entityPool.push(new Entity(0));
        }
    }

    /**
     * 创建实体
     */
    createEntity(name?: string): Entity {
        // 优先使用回收的ID
        const id =
            this.recycledIds.length > 0
                ? this.recycledIds.pop()!
                : this.nextEntityId++;

        // 从对象池获取实体
        let entity: Entity;
        if (this.entityPool.length > 0) {
            entity = this.entityPool.pop()!;
            entity.reset(id);
        } else {
            entity = new Entity(id);
        }

        if (name) {
            entity.name = name;
        }

        this.entities.set(id, entity);
        return entity;
    }

    /**
     * 获取实体
     */
    getEntity(entityId: EntityId): Entity | undefined {
        return this.entities.get(entityId);
    }

    /**
     * 检查实体是否存在
     */
    hasEntity(entityId: EntityId): boolean {
        return this.entities.has(entityId);
    }

    /**
     * 销毁实体
     */
    destroyEntity(entityId: EntityId): boolean {
        const entity = this.entities.get(entityId);
        if (!entity) return false;

        // 标记为已销毁
        entity.markDestroyed();

        // 从映射表移除
        this.entities.delete(entityId);

        // 回收ID
        this.recycledIds.push(entityId);

        // 归还到对象池
        if (this.entityPool.length < this.poolSize) {
            this.entityPool.push(entity);
        }

        return true;
    }

    /**
     * 获取所有实体
     */
    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    /**
     * 获取所有激活的实体
     */
    getActiveEntities(): Entity[] {
        return Array.from(this.entities.values()).filter((e) => e.active);
    }

    /**
     * 获取实体数量
     */
    getEntityCount(): number {
        return this.entities.size;
    }

    /**
     * 清空所有实体
     */
    clear(): void {
        // 归还所有实体到对象池
        for (const entity of this.entities.values()) {
            entity.markDestroyed();
            if (this.entityPool.length < this.poolSize) {
                this.entityPool.push(entity);
            }
        }

        this.entities.clear();
        this.recycledIds = [];
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.clear();
        this.entityPool = [];
    }
}

