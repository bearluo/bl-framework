/**
 * 装饰器节点基类
 * 所有装饰器节点的基类
 */

import { Node } from '../../core/Node';
import { Blackboard } from '../../core/Blackboard';
import { NodeStatus } from '../../core/NodeStatus';

/**
 * 装饰器节点抽象基类
 * 装饰器节点只有一个子节点，用于修改子节点的行为
 */
export abstract class DecoratorNode extends Node {
    /**
     * 获取子节点（装饰器只有一个子节点）
     */
    get child(): Node | null {
        return this.children.length > 0 ? this.children[0] : null;
    }

    /**
     * 设置子节点
     * @param child 子节点
     */
    setChild(child: Node): void {
        this.clearChildren();
        this.addChild(child);
    }

    /**
     * 构造函数
     * @param name 节点名称
     * @param child 子节点（可选）
     */
    constructor(name: string, child?: Node) {
        super(name);
        if (child) {
            this.addChild(child);
        }
    }

    /**
     * 节点进入时调用
     */
    onEnter(): void {
        super.onEnter();
        // 装饰器节点进入时，子节点也应该进入
        if (this.child && this.child.status === NodeStatus.READY) {
            if (this.child.onEnter) {
                this.child.onEnter();
            }
        }
    }

    /**
     * 节点退出时调用
     */
    onExit(): void {
        super.onExit();
        // 装饰器节点退出时，子节点也应该退出
        if (this.child && this.child.status === NodeStatus.RUNNING) {
            if (this.child.onExit) {
                this.child.onExit();
            }
        }
    }

    /**
     * 重置节点状态
     */
    reset(): void {
        super.reset();
        if (this.child && this.child.reset) {
            this.child.reset();
        }
    }
}

