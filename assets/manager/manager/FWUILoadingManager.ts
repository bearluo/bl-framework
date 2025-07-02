import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, EventTouch, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { func, uiFunc } from '../../common/FWFunction';
import { FWUILoading,FWUIMask } from '../../ui';
const { ccclass, property } = _decorator;

/**
 * UI加载管理器
 * 负责管理所有UI加载界面的显示、隐藏和层级关系
 * 使用单例模式确保全局唯一实例
 */
export class FWUILoadingManager extends FWBaseManager {
    /** 静态实例，用于单例模式 */
    protected static _instance: FWUILoadingManager | null = null;
    
    /**
     * 获取单例实例
     * @returns FWUILoadingManager 实例
     */
    public static get instance(): FWUILoadingManager {
        if (!FWUILoadingManager._instance) {
            FWUILoadingManager._instance = new FWUILoadingManager();
        }
        return FWUILoadingManager._instance;
    }

    /** 遮罩节点的名称 */
    private _maskName = "_mask";
    
    /** 加载界面队列，存储所有待显示的加载界面 */
    private _queue:FWUILoading[] = [];
    
    /** 队列是否已修改的标记，用于优化更新性能 */
    private _queueDirty = false;
    
    /** 根节点，所有加载界面的父节点 */
    private _root:Node;
    
    /** 遮罩节点，用于阻止用户交互 */
    private _mask:Node;
    
    /** 当前显示的加载界面 */
    private _cur:FWUILoading;

    /**
     * 设置根节点
     * 当设置根节点时，会自动创建或获取遮罩节点
     */
    set root(node:Node) {
        this._root = node;
        this._mask = this._root.getChildByName(this._maskName) ?? this.createMask()
    }

    /**
     * 创建遮罩节点
     * 遮罩节点用于阻止用户与背景的交互
     * @returns 创建的遮罩节点
     */
    private createMask() {
        assert(this._root != null,"dialogRoot is null")
        // 创建遮罩节点
        let maskNode = uiFunc.newNodeWidget(this._maskName);
        // 添加触摸吞噬组件，阻止事件穿透
        maskNode.addComponent(FWUIMask);
        maskNode.parent = this._root;
        maskNode.active = false;
        return maskNode
    }

    /**
     * 添加加载界面到队列
     * @param dialog 要添加的加载界面
     */
    add(dialog: FWUILoading) {
        assert(this._root != null, "dialogRoot is null");
        dialog.node.parent = this._root;
        this._queue.push(dialog);
        this._queueDirty = true;
    }

    /**
     * 从队列中移除加载界面
     * @param dialog 要移除的加载界面
     */
    remove(dialog: FWUILoading) {
        assert(this._root != null, "dialogRoot is null");
        let index = this._queue.indexOf(dialog);
        if(index!=-1) {
            this._queue.splice(index, 1);
            this._queueDirty = true;
        }
    }

    /**
     * 关闭所有加载界面
     * 清空队列并隐藏所有加载界面
     */
    closeAll() {
        let oldQueue = this._queue;
        this._queue = [];
        oldQueue.forEach(dialog => {
            dialog.hide();
        });
        this._queueDirty = true;
    }

    /**
     * 更新方法，每帧调用
     * 检查队列是否有变化，如果有则更新队列显示状态
     * @param deltaTime 帧间隔时间
     */
    update(deltaTime: number) {
        if (this._queueDirty) {
            this._queueDirty = false;
            this.updateQueue();
        }
    }

    /**
     * 更新队列显示状态
     * 确保只有最顶层的加载界面可见，其他都隐藏
     * 同时控制遮罩的显示状态和层级
     */
    updateQueue() {
        let length = this._queue.length;
        if(length==0) {
            // 队列为空时，隐藏遮罩并清空当前显示
            this._mask.active = false;
            this._cur = null;
            return;
        }
        
        // 队列不为空时，显示遮罩
        this._mask.active = true;
        
        // 隐藏除最后一个之外的所有加载界面
        for (let index = 0; index < length-1; index++) {
            const element = this._queue[index];
            element._hide();
        }
        
        // 获取最顶层的加载界面
        let cur = this._queue[length-1];
        if(this._cur != cur) {
            // 如果当前显示的界面发生变化，播放显示动画
            cur.playShowAnim();
            this._cur = cur;
        }
        
        // 调整遮罩的层级，确保遮罩在加载界面下方
        let siblingIndex = this._cur.node.getSiblingIndex()
        this._mask.setSiblingIndex(siblingIndex == 0 ? siblingIndex : siblingIndex - 1)
    }
}