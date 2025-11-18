/**
 * 行为树执行器
 * 提供高级执行功能，如按需执行、性能优化等
 */

import { BehaviorTree } from './BehaviorTree';
import { Blackboard } from './Blackboard';
import { NodeStatus } from './NodeStatus';
import { Node } from './Node';

/**
 * 行为树执行器
 * 提供优化的执行策略
 */
export class BehaviorTreeExecutor {
    /**
     * 执行行为树（优化版）
     * 只执行需要更新的节点
     * @param tree 行为树
     * @returns 执行状态
     */
    static execute(tree: BehaviorTree): NodeStatus {
        const root = tree.root;
        const blackboard = tree.blackboard;

        // 如果根节点已完成，直接返回
        if (root.status === NodeStatus.SUCCESS || 
            root.status === NodeStatus.FAILURE) {
            return root.status;
        }

        // 执行根节点
        return this.executeNode(root, blackboard);
    }

    /**
     * 执行节点（递归）
     * @param node 节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    private static executeNode(node: Node, blackboard: Blackboard): NodeStatus {
        // 如果节点已完成，直接返回
        if (node.status !== NodeStatus.RUNNING && 
            node.status !== NodeStatus.READY) {
            return node.status;
        }

        // 如果节点未开始，调用 onEnter
        if (node.status === NodeStatus.READY) {
            if (node.onEnter) {
                node.onEnter();
            }
        }

        // 执行节点
        const status = node.execute(blackboard);

        // 如果节点完成，调用 onExit
        if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
            if (node.onExit) {
                node.onExit();
            }
        }

        return status;
    }

    /**
     * 重置行为树
     * @param tree 行为树
     */
    static reset(tree: BehaviorTree): void {
        tree.reset();
    }

    /**
     * 检查行为树是否完成
     * @param tree 行为树
     * @returns 是否完成
     */
    static isComplete(tree: BehaviorTree): boolean {
        return tree.isComplete();
    }

    /**
     * 检查行为树是否运行中
     * @param tree 行为树
     * @returns 是否运行中
     */
    static isRunning(tree: BehaviorTree): boolean {
        return tree.isRunning();
    }
}

