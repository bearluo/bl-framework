/**
 * 行为树系统
 * 负责执行所有 Entity 的行为树
 */

import { System } from '../../ecs/core/System';
import { system } from '../../ecs/decorators/system';
import { BehaviorTreeComponent } from './BehaviorTreeComponent';
import { Query } from '../../ecs/core/Query';
import { Entity } from '../../ecs/core/Entity';
import { EntityDataHelper } from './EntityDataHelper';
import { ComponentType, EntityId, IComponent } from '../../ecs';

/**
 * 行为树系统
 * 自动执行所有拥有 BehaviorTreeComponent 的 Entity 的行为树
 */
@system({
    name: 'BehaviorTreeSystem',
    priority: 100
})
export class BehaviorTreeSystem extends System {
    /** 查询对象 */
    private query!: Query;

    /**
     * 系统初始化
     */
    onInit(): void {
        // 创建查询，查找所有拥有 BehaviorTreeComponent 的 Entity
        this.query = this.world.createQuery({
            all: [BehaviorTreeComponent]
        });
    }

    /**
     * 更新系统
     * @param deltaTime 时间差（秒）
     */
    onUpdate(deltaTime: number): void {
        // 遍历所有匹配的 Entity
        this.query.forEach((entity: Entity) => {
            const component = entity.getComponent(BehaviorTreeComponent);
            
            if (!component) {
                return;
            }

            // 设置 Entity 数据访问器（如果还没有设置）
            if (component.blackboard && component.entityId !== undefined) {
                this.setupEntityAccessor(component, entity);
            }

            // 检查是否应该更新
            if (!component.shouldUpdate(deltaTime)) {
                return;
            }

            // 执行行为树
            if (component.behaviorTree && component.blackboard) {
                try {
                    component.behaviorTree.execute();
                } catch (error) {
                    console.error(`BehaviorTree execution error for entity ${entity.id}:`, error);
                }
            }
        });
    }

    /**
     * 设置 Entity 数据访问器
     * @param component 行为树组件
     * @param entity Entity 实例
     */
    private setupEntityAccessor(component: BehaviorTreeComponent, entity: Entity): void {
        if (!component.blackboard) {
            return;
        }

        // 检查是否已经设置过访问器（避免重复设置）
        // 注意：这里使用私有属性检查，如果已经设置过就跳过
        const blackboardAny = component.blackboard as any;
        if (blackboardAny.entityAccessor) {
            return; // 已经设置过，跳过
        }

        // 设置访问器，允许从 Entity 的 Component 中获取数据
        component.blackboard.setEntityAccessor((entityId: EntityId, componentType: ComponentType<IComponent>, propertyKey: string) => {
            try {
                const comp = this.world.getComponent(entityId, componentType);
                if (!comp) {
                    return undefined;
                }
                // 从组件中获取属性值
                return (comp as any)[propertyKey];
            } catch (error) {
                console.error(`Error accessing component property:`, error);
                return undefined;
            }
        });
    }

    /**
     * 系统销毁
     */
    onDestroy?(): void {
        // 系统销毁逻辑（如果需要）
    }
}

