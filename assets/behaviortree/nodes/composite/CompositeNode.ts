/**
 * 组合节点基类
 * 所有组合节点的基类
 */

import { Node } from '../../core/Node';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';

/**
 * 组合节点抽象基类
 */
export abstract class CompositeNode extends Node {
    /**
     * 当前执行的子节点索引
     */
    protected currentChildIndex: number = 0;

    /**
     * 构造函数
     * @param name 节点名称
     */
    constructor(name: string) {
        super(name);
    }

    /**
     * 节点进入时调用
     */
    onEnter(): void {
        super.onEnter();
        this.currentChildIndex = 0;
    }

    /**
     * 节点退出时调用
     */
    onExit(): void {
        super.onExit();
        this.currentChildIndex = 0;
    }

    /**
     * 重置节点状态
     */
    reset(): void {
        super.reset();
        this.currentChildIndex = 0;
        this.children.forEach(child => {
            if (child.reset) {
                child.reset();
            }
        });
    }

    /**
     * 执行子节点
     * @param child 子节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    protected executeChild(child: Node, blackboard: Blackboard): NodeStatus {
        // 如果子节点未开始，调用 onEnter
        if (child.status === NodeStatus.READY) {
            if (child.onEnter) {
                child.onEnter();
            }
        }

        // 执行子节点
        const status = child.execute(blackboard);

        // 如果子节点完成，调用 onExit
        if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
            if (child.onExit) {
                child.onExit();
            }
        }

        return status;
    }
}

