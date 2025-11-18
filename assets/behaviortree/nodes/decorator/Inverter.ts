/**
 * 取反装饰器节点 (Inverter)
 * 将子节点的结果取反：成功变失败，失败变成功
 */

import { DecoratorNode } from './DecoratorNode';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';

/**
 * 取反装饰器节点
 * 将子节点的执行结果取反
 */
export class Inverter extends DecoratorNode {
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

        const childStatus = this.child.execute(blackboard);

        // 如果子节点运行中，保持运行状态
        if (childStatus === NodeStatus.RUNNING) {
            this.status = NodeStatus.RUNNING;
            return NodeStatus.RUNNING;
        }

        // 取反：成功变失败，失败变成功
        const invertedStatus = childStatus === NodeStatus.SUCCESS
            ? NodeStatus.FAILURE
            : NodeStatus.SUCCESS;

        this.status = invertedStatus;
        return invertedStatus;
    }
}

