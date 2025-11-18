/**
 * 重复装饰器节点 (Repeater)
 * 重复执行子节点指定次数
 */

import { DecoratorNode } from './DecoratorNode';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';
import { Node } from '../../core';

/**
 * 重复装饰器节点
 * 重复执行子节点指定次数
 */
export class Repeater extends DecoratorNode {
    /** 重复次数 */
    private count: number;
    /** 当前执行次数 */
    private currentCount: number = 0;
    /** 是否无限重复 */
    private infinite: boolean;

    /**
     * 构造函数
     * @param name 节点名称
     * @param count 重复次数，-1 表示无限重复
     * @param child 子节点（可选）
     */
    constructor(name: string, count: number = -1, child?: Node) {
        super(name, child);
        this.count = count;
        this.infinite = count === -1;
    }

    /**
     * 节点进入时调用
     */
    onEnter(): void {
        super.onEnter();
        this.currentCount = 0;
    }

    /**
     * 节点退出时调用
     */
    onExit(): void {
        super.onExit();
        this.currentCount = 0;
    }

    /**
     * 重置节点状态
     */
    reset(): void {
        super.reset();
        this.currentCount = 0;
    }

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus {
        if (!this.child) {
            this.status = NodeStatus.FAILURE;
            return NodeStatus.FAILURE;
        }

        // 无限重复
        if (this.infinite) {
            const childStatus = this.child.execute(blackboard);

            // 如果子节点完成，重置并继续执行
            if (childStatus === NodeStatus.SUCCESS || childStatus === NodeStatus.FAILURE) {
                if (this.child.reset) {
                    this.child.reset();
                }
                if (this.child.onEnter) {
                    this.child.onEnter();
                }
                this.status = NodeStatus.RUNNING;
                return NodeStatus.RUNNING;
            }

            // 子节点运行中
            this.status = NodeStatus.RUNNING;
            return NodeStatus.RUNNING;
        }

        // 有限次数重复
        while (this.currentCount < this.count) {
            const childStatus = this.child.execute(blackboard);

            // 如果子节点运行中，保持运行状态
            if (childStatus === NodeStatus.RUNNING) {
                this.status = NodeStatus.RUNNING;
                return NodeStatus.RUNNING;
            }

            // 子节点完成，重置并继续下一次
            this.currentCount++;
            if (this.child.reset) {
                this.child.reset();
            }
            if (this.currentCount < this.count && this.child.onEnter) {
                this.child.onEnter();
            }
        }

        // 达到指定次数，返回成功
        this.status = NodeStatus.SUCCESS;
        return NodeStatus.SUCCESS;
    }
}

