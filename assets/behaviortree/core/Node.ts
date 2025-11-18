/**
 * 节点基类
 * 所有行为树节点的基类
 */

import { NodeStatus } from './NodeStatus';
import { Blackboard } from './Blackboard';

/**
 * 节点接口
 */
export interface INode {
    /** 节点名称 */
    name: string;

    /** 子节点列表 */
    children: Node[];

    /** 节点状态 */
    status: NodeStatus;

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    execute(blackboard: Blackboard): NodeStatus;

    /**
     * 节点进入时调用
     */
    onEnter?(): void;

    /**
     * 节点退出时调用
     */
    onExit?(): void;

    /**
     * 重置节点状态
     */
    reset?(): void;
}

/**
 * 节点抽象基类
 */
export abstract class Node implements INode {
    /** 节点名称 */
    name: string;

    /** 子节点列表 */
    children: Node[] = [];

    /** 节点状态 */
    status: NodeStatus = NodeStatus.READY;

    /**
     * 构造函数
     * @param name 节点名称
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * 执行节点
     * @param blackboard 黑板对象
     * @returns 执行状态
     */
    abstract execute(blackboard: Blackboard): NodeStatus;

    /**
     * 节点进入时调用
     */
    onEnter(): void {
        this.status = NodeStatus.RUNNING;
    }

    /**
     * 节点退出时调用
     */
    onExit(): void {
        // 子类可以重写
    }

    /**
     * 添加子节点
     * @param child 子节点
     */
    addChild(child: Node): void {
        this.children.push(child);
    }

    /**
     * 移除子节点
     * @param child 子节点
     */
    removeChild(child: Node): boolean {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 清空所有子节点
     */
    clearChildren(): void {
        this.children = [];
    }

    /**
     * 重置节点状态
     */
    reset(): void {
        this.status = NodeStatus.READY;
        this.children.forEach(child => {
            if (child.reset) {
                child.reset();
            }
        });
    }

    /**
     * 获取节点信息（用于调试）
     */
    toString(): string {
        return `${this.constructor.name}(${this.name})`;
    }
}

