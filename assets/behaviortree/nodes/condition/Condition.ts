/**
 * 条件节点基类
 * 所有条件节点的基类
 */

import { Node } from '../../core/Node';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';
import { ConditionFunction } from '../../core/types';

/**
 * 条件节点
 * 检查条件是否满足，返回成功或失败
 */
export class Condition extends Node {
    /** 条件函数 */
    private conditionFn: ConditionFunction;

    /**
     * 构造函数
     * @param name 节点名称
     * @param conditionFn 条件函数
     */
    constructor(name: string, conditionFn: ConditionFunction) {
        super(name);
        this.conditionFn = conditionFn;
    }

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus {
        const result = this.conditionFn(blackboard);
        this.status = result ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
        return this.status;
    }
}

