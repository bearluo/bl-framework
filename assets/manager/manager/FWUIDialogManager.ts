import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, EventTouch, instantiate, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { func, uiFunc } from '../../common/FWFunction';
import { FWUIDialog, FWUIMask, FWUIDialogLoading } from '../../ui';
import { IAssetConfig } from '../../declare/FWInterface';
const { ccclass, property } = _decorator;

/**
 * UI弹窗管理器
 * 负责管理游戏中的所有弹窗显示、隐藏、层级控制等功能
 * 使用单例模式确保全局唯一实例
 */
export class FWUIDialogManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWUIDialogManager | null = null;
    
    /**
     * 获取弹窗管理器单例实例
     * @returns FWUIDialogManager 单例实例
     */
    public static get instance(): FWUIDialogManager {
        if (!FWUIDialogManager._instance) {
            FWUIDialogManager._instance = new FWUIDialogManager();
        }
        return FWUIDialogManager._instance;
    }

    /** 遮罩节点名称 */
    private _maskName = "_mask";
    
    /** 弹窗队列，存储所有当前显示的弹窗 */
    private _queue:FWUIDialog[] = [];
    
    /** 队列是否脏标记，用于优化更新 */
    private _queueDirty = false;
    
    /** 弹窗根节点，所有弹窗都挂载在此节点下 */
    private _root:Node;
    
    /** 遮罩节点，用于阻止下层UI的交互 */
    private _mask:Node;
    
    /** 当前显示的弹窗 */
    private _cur:FWUIDialog;
    
    /** 加载中弹窗对象池，用于复用加载组件 */
    private _loadPool:Pool<FWUIDialogLoading>

    /**
     * 预加载初始化
     * 创建加载中弹窗的对象池
     */
    __preload(): void {
        this._loadPool = new Pool<FWUIDialogLoading>(()=>{
            let node = new Node();
            let loading = node.addComponent(FWUIDialogLoading);
            return loading;
        },5,(loading)=>{
            loading.node.destroy();
        });
    }

    /**
     * 设置弹窗根节点
     * @param node 根节点
     */
    set root(node:Node) {
        this._root = node;
        this._mask = this._root.getChildByName(this._maskName) ?? this.createMask()
    }

    /**
     * 创建遮罩节点
     * @returns 创建的遮罩节点
     */
    private createMask() {
        assert(this._root != null,"root is null")
        //遮罩节点
        let maskNode = uiFunc.newNodeWidget(this._maskName);
        //添加触摸吞噬
        maskNode.addComponent(FWUIMask);
        maskNode.parent = this._root;
        maskNode.active = false;
        return maskNode
    }

    /**
     * 关闭当前弹窗
     */
    closeDialog() {
        this.curDialog?.hide()
    }

    /**
     * 获取当前显示的弹窗
     * @returns 当前弹窗，如果没有则返回undefined
     */
    get curDialog() {
        let length = this._queue.length;
        if(length==0) {
            return;
        }
        return this._queue[length-1];
    }
    
    /**
     * 加载并显示弹窗
     * @param config 资源配置 {@link IAssetConfig}
     * @param data 传递给弹窗的数据
     * @returns Promise<FWUIDialog> 加载完成后的弹窗实例
     */
    loadAndShowDialog(config: IAssetConfig,data?:any) {
        // 从对象池获取加载组件
        let loading = this._loadPool.alloc();
        loading.show(data);
        
        // 加载预制体
        return loading.loadPrefab(config).then((prefab)=>{
            let index = this._queue.indexOf(loading);
            if(index!=-1) {
                // 实例化预制体
                let node = instantiate(prefab);
                node.parent = this._root;
                
                // 获取或添加弹窗组件
                let newDialog = node.getComponent(FWUIDialog) ?? node.addComponent(FWUIDialog);
                newDialog.show(loading.showData);
                
                // 调整队列顺序：移除加载组件，添加新弹窗
                this._queue.pop();
                this._queue.splice(index, 1,newDialog);
                
                // 回收加载组件到对象池
                loading.node.parent = null;
                this._loadPool.free(loading)
                return Promise.resolve(newDialog);
            } else {
                return Promise.reject(new Error("dialog is not loading"));
            }
        })
    }
    
    /**
     * 添加弹窗到管理器
     * @param dialog 要添加的弹窗
     */
    addDialog(dialog: FWUIDialog) {
        assert(this._root != null, "root is null");
        dialog.node.parent = this._root;
        this._queue.push(dialog);
        this._queueDirty = true;
    }
    
    /**
     * 从管理器中移除弹窗
     * @param dialog 要移除的弹窗
     */
    removeDialog(dialog: FWUIDialog) {
        assert(this._root != null, "root is null");
        let index = this._queue.indexOf(dialog);
        if(index!=-1) {
            this._queue.splice(index, 1);
            this._queueDirty = true;
        }
    }
    
    /**
     * 关闭所有弹窗
     */
    closeAllDialog() {
        let oldQueue = this._queue;
        this._queue = [];
        oldQueue.forEach(dialog => {
            dialog.hide();
        });
        this._queueDirty = true;
    }

    /**
     * 更新方法，处理队列状态变化
     * @param deltaTime 帧间隔时间
     */
    update(deltaTime: number) {
        if (this._queueDirty) {
            this._queueDirty = false;
            this.updateDialogQueue();
        }
    }

    /**
     * 更新弹窗队列状态
     * 控制弹窗的显示层级和遮罩状态
     */
    updateDialogQueue() {
        let length = this._queue.length;
        if(length==0) {
            // 没有弹窗时隐藏遮罩
            this._mask.active = false;
            this._cur = null;
            return;
        }
        
        // 有弹窗时显示遮罩
        this._mask.active = true;
        
        // 隐藏除最顶层外的所有弹窗
        for (let index = 0; index < length-1; index++) {
            const element = this._queue[index];
            element._hide();
        }
        
        // 显示最顶层的弹窗
        let curDialog = this._queue[length-1];
        if(this._cur != curDialog) {
            curDialog.playShowAnim();
            this._cur = curDialog;
        }
        
        // 调整遮罩层级，确保在弹窗下方
        let siblingIndex = this._cur.node.getSiblingIndex()
        this._mask.setSiblingIndex(siblingIndex == 0 ? siblingIndex : siblingIndex - 1)
    }
    
    /**
     * 销毁时清理资源
     */
    onDestroy(): void {
        super.onDestroy();
        this._loadPool?.destroy();
    }
}