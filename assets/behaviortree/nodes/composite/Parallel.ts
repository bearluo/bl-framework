/**
 * 并行节点 (Parallel)
 * 并行执行所有子节点，根据策略决定结果
 */

import { CompositeNode } from './CompositeNode';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';
import { ParallelPolicy } from '../../core/types';

/**
 * 并行节点
 * 并行执行所有子节点，根据策略决定最终结果
 */
export class Parallel extends CompositeNode {
    /** 并行策略 */
    private policy: ParallelPolicy;

    /**
     * 构造函数
     * @param name 节点名称
     * @param policy 并行策略，默认为 ALL_SUCCESS
     */
    constructor(name: string, policy: ParallelPolicy = ParallelPolicy.ALL_SUCCESS) {
        super(name);
        this.policy = policy;
    }

    /**
     * 节点进入时调用
     */
    onEnter(): void {
        super.onEnter();
        // 并行节点需要重置所有子节点
        this.children.forEach(child => {
            if (child.reset) {
                child.reset();
            }
        });
    }

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus {
        // 如果没有子节点，返回成功
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return NodeStatus.SUCCESS;
        }

        // 执行所有子节点
        const results: NodeStatus[] = [];
        let hasRunning = false;

        for (const child of this.children) {
            const status = this.executeChild(child, blackboard);
            results.push(status);

            if (status === NodeStatus.RUNNING) {
                hasRunning = true;
            }
        }

        // 如果有运行中的子节点，返回运行中
        if (hasRunning) {
            this.status = NodeStatus.RUNNING;
            return NodeStatus.RUNNING;
        }

        // 根据策略决定结果
        let finalStatus: NodeStatus;

        switch (this.policy) {
            case ParallelPolicy.ALL_SUCCESS:
                // 全部成功才成功
                finalStatus = results.every(r => r === NodeStatus.SUCCESS)
                    ? NodeStatus.SUCCESS
                    : NodeStatus.FAILURE;
                break;

            case ParallelPolicy.ALL_FAILURE:
                // 全部失败才失败
                finalStatus = results.every(r => r === NodeStatus.FAILURE)
                    ? NodeStatus.FAILURE
                    : NodeStatus.SUCCESS;
                break;

            case ParallelPolicy.ANY_SUCCESS:
                // 任一成功即成功
                finalStatus = results.some(r => r === NodeStatus.SUCCESS)
                    ? NodeStatus.SUCCESS
                    : NodeStatus.FAILURE;
                break;

            case ParallelPolicy.ANY_FAILURE:
                // 任一失败即失败
                finalStatus = results.some(r => r === NodeStatus.FAILURE)
                    ? NodeStatus.FAILURE
                    : NodeStatus.SUCCESS;
                break;

            default:
                finalStatus = NodeStatus.FAILURE;
        }

        this.status = finalStatus;
        return finalStatus;
    }
}

