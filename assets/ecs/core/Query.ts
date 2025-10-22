import { ComponentType, ComponentTypeId, EntityId, QueryConfig } from '../types';
import { ComponentManager } from './ComponentManager';
import { Entity } from './Entity';
import { EntityManager } from './EntityManager';
import { BitSet } from '../utils/BitSet';

/**
 * 查询器
 * 用于查询符合条件的实体
 * 使用 BitSet 进行高性能组件匹配
 */
export class Query {
    /** 必须包含的组件类型位集合 */
    private allBits: BitSet = new BitSet(256);

    /** 至少包含一个的组件类型位集合 */
    private anyBits: BitSet = new BitSet(256);

    /** 不能包含的组件类型位集合 */
    private noneBits: BitSet = new BitSet(256);

    /** 是否有 all 条件 */
    private hasAllCondition: boolean = false;

    /** 是否有 any 条件 */
    private hasAnyCondition: boolean = false;

    /** 是否有 none 条件 */
    private hasNoneCondition: boolean = false;

    /** 缓存的查询结果 */
    private cachedEntities: Set<EntityId> = new Set();

    /** 缓存是否有效 */
    private cacheDirty: boolean = true;

    constructor(
        private config: QueryConfig,
        private componentManager: ComponentManager,
        private entityManager: EntityManager
    ) {
        this.buildQuery();
    }

    /**
     * 构建查询条件
     */
    private buildQuery(): void {
        // 构建 all 位集合
        if (this.config.all && this.config.all.length > 0) {
            this.hasAllCondition = true;
            for (const type of this.config.all) {
                const typeId = this.componentManager.registerComponentType(type);
                this.allBits.set(typeId);
            }
        }

        // 构建 any 位集合
        if (this.config.any && this.config.any.length > 0) {
            this.hasAnyCondition = true;
            for (const type of this.config.any) {
                const typeId = this.componentManager.registerComponentType(type);
                this.anyBits.set(typeId);
            }
        }

        // 构建 none 位集合
        if (this.config.none && this.config.none.length > 0) {
            this.hasNoneCondition = true;
            for (const type of this.config.none) {
                const typeId = this.componentManager.registerComponentType(type);
                this.noneBits.set(typeId);
            }
        }
    }

    /**
     * 检查实体是否匹配查询条件（使用 BitSet 位运算）
     */
    private matchesEntity(entityId: EntityId): boolean {
        const entityBits = this.componentManager.getEntityComponentBits(entityId);
        if (!entityBits) {
            return false;
        }

        // 检查 all 条件：实体必须包含所有指定的组件
        if (this.hasAllCondition) {
            if (!entityBits.containsAll(this.allBits)) {
                return false;
            }
        }

        // 检查 any 条件：实体至少包含一个指定的组件
        if (this.hasAnyCondition) {
            if (!entityBits.containsAny(this.anyBits)) {
                return false;
            }
        }

        // 检查 none 条件：实体不能包含任何指定的组件
        if (this.hasNoneCondition) {
            if (!entityBits.containsNone(this.noneBits)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 更新缓存
     */
    private updateCache(): void {
        if (!this.cacheDirty) return;

        this.cachedEntities.clear();

        const entities = this.entityManager.getActiveEntities();
        for (const entity of entities) {
            if (this.matchesEntity(entity.id)) {
                this.cachedEntities.add(entity.id);
            }
        }

        this.cacheDirty = false;
    }

    /**
     * 标记缓存为脏
     */
    markDirty(): void {
        this.cacheDirty = true;
    }

    /**
     * 获取匹配的实体ID列表
     */
    getEntityIds(): EntityId[] {
        this.updateCache();
        return Array.from(this.cachedEntities);
    }

    /**
     * 获取匹配的实体列表
     */
    getEntities(): Entity[] {
        this.updateCache();
        const result: Entity[] = [];
        for (const id of this.cachedEntities) {
            const entity = this.entityManager.getEntity(id);
            if (entity) {
                result.push(entity);
            }
        }
        return result;
    }

    /**
     * 遍历匹配的实体
     */
    forEach(callback: (entity: Entity) => void): void {
        const entities = this.getEntities();
        for (const entity of entities) {
            callback(entity);
        }
    }

    /**
     * 获取第一个匹配的实体
     */
    getFirst(): Entity | undefined {
        this.updateCache();
        const firstId = this.cachedEntities.values().next().value;
        return firstId !== undefined
            ? this.entityManager.getEntity(firstId)
            : undefined;
    }

    /**
     * 获取匹配的实体数量
     */
    getCount(): number {
        this.updateCache();
        return this.cachedEntities.size;
    }

    /**
     * 检查是否有匹配的实体
     */
    isEmpty(): boolean {
        return this.getCount() === 0;
    }
}

