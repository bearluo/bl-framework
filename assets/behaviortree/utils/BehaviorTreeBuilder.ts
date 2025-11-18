/**
 * 行为树构建器
 * 提供流畅的链式 API 构建行为树
 */

import { Node } from '../core/Node';
import { BehaviorTree } from '../core/BehaviorTree';
import { Blackboard } from '../core/Blackboard';
import { Selector } from '../nodes/composite/Selector';
import { Sequence } from '../nodes/composite/Sequence';
import { Parallel } from '../nodes/composite/Parallel';
import { Inverter } from '../nodes/decorator/Inverter';
import { Repeater } from '../nodes/decorator/Repeater';
import { UntilSuccess } from '../nodes/decorator/UntilSuccess';
import { UntilFailure } from '../nodes/decorator/UntilFailure';
import { Condition } from '../nodes/condition/Condition';
import { Action } from '../nodes/action/Action';
import { ConditionFunction, ActionFunction, DecoratorType, DecoratorConfig, ParallelPolicy } from '../core/types';

/**
 * 行为树构建器
 * 提供链式 API 构建行为树
 */
export class BehaviorTreeBuilder {
    private root: Node | null = null;
    private nodeStack: Node[] = [];
    private currentNode: Node | null = null;

    /**
     * 创建选择器节点
     * @param name 节点名称
     */
    selector(name: string): this {
        const node = new Selector(name);
        this.addNode(node);
        return this;
    }

    /**
     * 创建序列器节点
     * @param name 节点名称
     */
    sequence(name: string): this {
        const node = new Sequence(name);
        this.addNode(node);
        return this;
    }

    /**
     * 创建并行节点
     * @param name 节点名称
     * @param policy 并行策略（可选）
     */
    parallel(name: string, policy?: ParallelPolicy): this {
        const node = new Parallel(name, policy);
        this.addNode(node);
        return this;
    }

    /**
     * 创建条件节点
     * @param name 节点名称
     * @param condition 条件函数
     */
    condition(name: string, condition: ConditionFunction): this {
        const node = new Condition(name, condition);
        this.addNode(node);
        return this;
    }

    /**
     * 创建动作节点
     * @param name 节点名称
     * @param action 动作函数
     */
    action(name: string, action: ActionFunction): this {
        const node = new Action(name, action);
        this.addNode(node);
        return this;
    }

    /**
     * 添加装饰器节点
     * @param decorator 装饰器类型
     * @param config 装饰器配置（可选）
     */
    decorator(decorator: DecoratorType, config?: DecoratorConfig): this {
        if (!this.currentNode) {
            throw new Error('BehaviorTreeBuilder: No current node to decorate');
        }

        let decoratorNode: Node;

        switch (decorator) {
            case DecoratorType.INVERTER:
                decoratorNode = new Inverter(`${this.currentNode.name}_inverter`, this.currentNode);
                break;
            case DecoratorType.REPEATER:
                const count = config?.count ?? -1;
                decoratorNode = new Repeater(`${this.currentNode.name}_repeater`, count, this.currentNode);
                break;
            case DecoratorType.UNTIL_SUCCESS:
                decoratorNode = new UntilSuccess(`${this.currentNode.name}_untilSuccess`, this.currentNode);
                break;
            case DecoratorType.UNTIL_FAILURE:
                decoratorNode = new UntilFailure(`${this.currentNode.name}_untilFailure`, this.currentNode);
                break;
            default:
                throw new Error(`BehaviorTreeBuilder: Unknown decorator type: ${decorator}`);
        }

        // 替换当前节点
        if (this.nodeStack.length > 0) {
            const parent = this.nodeStack[this.nodeStack.length - 1];
            const index = parent.children.indexOf(this.currentNode);
            if (index !== -1) {
                parent.children[index] = decoratorNode;
            }
        } else {
            this.root = decoratorNode;
        }

        this.currentNode = decoratorNode;
        return this;
    }

    /**
     * 结束当前节点（返回到父节点）
     */
    end(): this {
        if (this.nodeStack.length > 0) {
            this.currentNode = this.nodeStack.pop()!;
        } else {
            this.currentNode = null;
        }
        return this;
    }

    /**
     * 构建行为树
     * @param blackboard 可选的黑板对象
     */
    build(blackboard?: Blackboard): BehaviorTree {
        if (!this.root) {
            throw new Error('BehaviorTreeBuilder: No root node defined');
        }

        return new BehaviorTree(this.root, blackboard);
    }

    /**
     * 添加节点到当前节点
     * @param node 节点
     */
    private addNode(node: Node): void {
        if (!this.root) {
            // 第一个节点作为根节点
            this.root = node;
            this.currentNode = node;
        } else if (this.currentNode) {
            // 添加到当前节点
            this.currentNode.addChild(node);
            // 如果是组合节点，进入该节点
            if (node instanceof Selector || node instanceof Sequence || node instanceof Parallel) {
                this.nodeStack.push(this.currentNode);
                this.currentNode = node;
            }
        } else {
            throw new Error('BehaviorTreeBuilder: Invalid state');
        }
    }
}

