/**
 * 直到成功装饰器节点 (UntilSuccess)
 * 重复执行子节点直到成功
 */

import { DecoratorNode } from './DecoratorNode';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';

/**
 * 直到成功装饰器节点
 * 重复执行子节点直到成功
 */
export class UntilSuccess extends DecoratorNode {
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

        while (true) {
            const childStatus = this.child.execute(blackboard);

            // 如果子节点成功，返回成功
            if (childStatus === NodeStatus.SUCCESS) {
                this.status = NodeStatus.SUCCESS;
                return NodeStatus.SUCCESS;
            }

            // 如果子节点运行中，保持运行状态
            if (childStatus === NodeStatus.RUNNING) {
                this.status = NodeStatus.RUNNING;
                return NodeStatus.RUNNING;
            }

            // 子节点失败，重置并继续执行
            if (this.child.reset) {
                this.child.reset();
            }
            if (this.child.onEnter) {
                this.child.onEnter();
            }
        }
    }
}

