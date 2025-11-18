/**
 * 选择器节点 (Selector)
 * 返回第一个成功的子节点，如果所有子节点都失败则返回失败
 */

import { CompositeNode } from './CompositeNode';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';

/**
 * 选择器节点
 * 按顺序执行子节点，返回第一个成功的子节点
 * 如果所有子节点都失败，则返回失败
 */
export class Selector extends CompositeNode {
    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus {
        // 如果没有子节点，返回失败
        if (this.children.length === 0) {
            this.status = NodeStatus.FAILURE;
            return NodeStatus.FAILURE;
        }

        // 从当前索引开始执行子节点
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const child = this.children[i];
            const status = this.executeChild(child, blackboard);

            // 如果子节点成功，返回成功
            if (status === NodeStatus.SUCCESS) {
                this.currentChildIndex = 0;
                this.status = NodeStatus.SUCCESS;
                return NodeStatus.SUCCESS;
            }

            // 如果子节点运行中，保持运行状态
            if (status === NodeStatus.RUNNING) {
                this.currentChildIndex = i;
                this.status = NodeStatus.RUNNING;
                return NodeStatus.RUNNING;
            }

            // 如果子节点失败，继续下一个子节点
            // currentChildIndex 会在下一个循环中自动更新
        }

        // 所有子节点都失败，返回失败
        this.currentChildIndex = 0;
        this.status = NodeStatus.FAILURE;
        return NodeStatus.FAILURE;
    }
}

