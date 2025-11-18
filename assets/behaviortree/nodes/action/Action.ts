/**
 * 动作节点基类
 * 所有动作节点的基类
 */

import { Node } from '../../core/Node';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';
import { ActionFunction } from '../../core/types';

/**
 * 动作节点
 * 执行动作，返回成功、失败或运行中
 */
export class Action extends Node {
    /** 动作函数 */
    private actionFn: ActionFunction;

    /**
     * 构造函数
     * @param name 节点名称
     * @param actionFn 动作函数
     */
    constructor(name: string, actionFn: ActionFunction) {
        super(name);
        this.actionFn = actionFn;
    }

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus {
        const result = this.actionFn(blackboard);
        this.status = result;
        return this.status;
    }
}

