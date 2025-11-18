/**
 * 行为树类
 * 行为树的核心类，负责管理和执行行为树
 */

import { Node } from './Node';
import { Blackboard } from './Blackboard';
import { NodeStatus } from './NodeStatus';

/**
 * 行为树类
 */
export class BehaviorTree {
    /** 根节点 */
    root: Node;

    /** 黑板对象（共享数据） */
    blackboard: Blackboard;

    /**
     * 构造函数
     * @param root 根节点
     * @param blackboard 黑板对象（可选，如果不提供则创建新的）
     */
    constructor(root: Node, blackboard?: Blackboard) {
        if (!root) {
            throw new Error('BehaviorTree: root node is required');
        }
        this.root = root;
        this.blackboard = blackboard || new Blackboard();
    }

    /**
     * 执行行为树
     * @returns 执行状态
     */
    execute(): NodeStatus {
        // 如果根节点未开始，调用 onEnter
        if (this.root.status === NodeStatus.READY) {
            if (this.root.onEnter) {
                this.root.onEnter();
            }
        }

        // 执行根节点
        const status = this.root.execute(this.blackboard);

        // 如果根节点完成，调用 onExit
        if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
            if (this.root.onExit) {
                this.root.onExit();
            }
        }

        return status;
    }

    /**
     * 重置行为树状态
     */
    reset(): void {
        if (this.root.reset) {
            this.root.reset();
        }
    }

    /**
     * 检查行为树是否完成
     * @returns 是否完成（成功或失败）
     */
    isComplete(): boolean {
        return this.root.status === NodeStatus.SUCCESS || 
               this.root.status === NodeStatus.FAILURE;
    }

    /**
     * 检查行为树是否运行中
     * @returns 是否运行中
     */
    isRunning(): boolean {
        return this.root.status === NodeStatus.RUNNING;
    }

    /**
     * 获取行为树当前状态
     * @returns 当前状态
     */
    getStatus(): NodeStatus {
        return this.root.status;
    }

    /**
     * 设置黑板对象
     * @param blackboard 黑板对象
     */
    setBlackboard(blackboard: Blackboard): void {
        this.blackboard = blackboard;
    }

    /**
     * 获取黑板对象
     * @returns 黑板对象
     */
    getBlackboard(): Blackboard {
        return this.blackboard;
    }
}

