/**
 * 行为树组件
 * 用于在 ECS 系统中存储行为树实例
 */

import { EntityId } from '../../ecs';
import { Component } from '../../ecs/core/Component';
import { component } from '../../ecs/decorators/component';
import { BehaviorTree } from '../core/BehaviorTree';
import { Blackboard } from '../core/Blackboard';

/**
 * 行为树组件
 * 存储行为树实例和相关的执行状态
 */
@component({
    name: 'BehaviorTree',
    pooled: false
})
export class BehaviorTreeComponent extends Component {
    /** 行为树实例 */
    behaviorTree: BehaviorTree | null = null;

    /** 是否启用 */
    enabled: boolean = true;

    /** 黑板对象 */
    blackboard: Blackboard | null = null;

    /** 执行间隔（秒），0 表示每帧执行 */
    updateInterval: number = 0;

    /** 累计时间（秒，用于执行间隔控制） */
    accumulatedTime: number = 0;

    /** 优先级（用于批量更新时的排序） */
    priority: number = 0;

    /**
     * 组件初始化
     */
    onInit?(): void {
        // 如果没有黑板，创建新的
        if (!this.blackboard) {
            this.blackboard = new Blackboard();
        }

        // 如果行为树存在，绑定 Entity 数据
        if (this.behaviorTree && this.entityId !== undefined) {
            // 设置 Entity 数据访问器
            this.setupEntityAccessor();
        }
    }

    /**
     * 设置 Entity 数据访问器
     */
    private setupEntityAccessor(): void {
        if (!this.blackboard || this.entityId === undefined) {
            return;
        }

        // 设置访问器，允许从 Entity 的 Component 中获取数据
        // 注意：Component 没有直接访问 World 的方式
        // 实际的访问器会在 BehaviorTreeSystem 中设置
        // 这里只是占位，避免重复设置
    }

    /**
     * 组件销毁
     */
    onDestroy?(): void {
        // 清理资源
        if (this.behaviorTree) {
            this.behaviorTree.reset();
        }
        if (this.blackboard) {
            this.blackboard.clear();
        }
    }

    /**
     * 重置组件
     */
    reset(): void {
        super.reset();
        this.behaviorTree = null;
        this.blackboard = null;
        this.updateInterval = 0;
        this.accumulatedTime = 0;
        this.priority = 0;
    }

    /**
     * 设置行为树
     * @param tree 行为树实例
     */
    setBehaviorTree(tree: BehaviorTree): void {
        this.behaviorTree = tree;
        if (this.blackboard) {
            tree.setBlackboard(this.blackboard);
        }
    }

    /**
     * 设置黑板对象
     * @param blackboard 黑板对象
     */
    setBlackboard(blackboard: Blackboard): void {
        this.blackboard = blackboard;
        if (this.behaviorTree) {
            this.behaviorTree.setBlackboard(blackboard);
        }
    }

    /**
     * 检查是否应该更新
     * @param deltaTime 时间差
     * @returns 是否应该更新
     */
    shouldUpdate(deltaTime: number): boolean {
        if (!this.enabled || !this.behaviorTree) {
            return false;
        }

        // 如果执行间隔为0，每帧都更新
        if (this.updateInterval <= 0) {
            return true;
        }

        // 检查执行间隔
        this.accumulatedTime += deltaTime;
        if (this.accumulatedTime >= this.updateInterval) {
            this.accumulatedTime = 0;
            return true;
        }

        return false;
    }
}

