import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, EventTouch, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { func, uiFunc } from '../../common/FWFunction';
import { FWUIDialog, IUIDialogHideData, FWUILoading, FWUIRoot } from '../../ui';
import { FWUILoadingManager } from './FWUILoadingManager';
import { FWUIDialogManager } from './FWUIDialogManager';
import { IAssetConfig } from '../../declare/FWInterface';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/**
 * UI管理器类
 * 负责管理整个UI系统，包括对话框、加载界面和UI根节点
 * 继承自FWBaseManager，实现单例模式
 */
@ccclass('FWUIManager')
export class FWUIManager extends FWBaseManager {
    /** 静态实例引用 */
    protected static _instance: FWUIManager | null = null;
    
    /**
     * 获取UI管理器单例实例
     * @returns FWUIManager实例
     */
    public static get instance(): FWUIManager {
        if (!FWUIManager._instance) {
            FWUIManager._instance = new FWUIManager();
        }
        return FWUIManager._instance;
    }

    /** UI根节点引用 */
    uiRoot: FWUIRoot;

    /** 对话框管理器实例 */
    private _dialogManager: FWUIDialogManager = FWUIDialogManager.instance;

    /** 加载界面管理器实例 */
    private _loadingManager: FWUILoadingManager = FWUILoadingManager.instance;

    /**
     * 组件启动时调用
     * 监听管理器初始化完成事件
     */
    start() {
        app.manager.event.on(app.manager.event.events.MANAGER_INIT_END, this.onMangerInitEnd, this);
    }

    /**
     * 管理器初始化完成回调
     * 在编辑器预览模式或非编辑器环境下创建UI根节点
     */
    onMangerInitEnd() {
        if(EDITOR && globalThis.isPreviewProcess) {
            // 编辑器预览模式下创建UI根节点
            this.changeUIRoot(this.createUIRoot());
        }else if(!EDITOR) {
            // 非编辑器环境下创建UI根节点
            this.changeUIRoot(this.createUIRoot());
        }
    }

    /**
     * 切换UI根节点
     * @param uiRoot 新的UI根节点
     */
    changeUIRoot(uiRoot: FWUIRoot): void {
        // 发送UI根节点变更事件
        app.manager.event.emit(app.manager.event.events.ON_UI_ROOT_CHANGED, uiRoot);
        
        // 销毁旧的UI根节点
        let oldUIRoot = this.uiRoot;
        if(oldUIRoot) {
            oldUIRoot.bindApp = false;
            oldUIRoot.node.destroy();
        }
        
        // 设置新的UI根节点
        uiRoot.bindApp = true;
        this.uiRoot = uiRoot;
        
        // 更新对话框和加载界面的根节点引用
        this._dialogManager.root = this.uiRoot.staticNode.dialog;
        this._loadingManager.root = this.uiRoot.staticNode.loading;
        
        // 将UI根节点设置为常驻节点，避免场景切换时被销毁
        director.addPersistRootNode(this.uiRoot.node);
    }

    /**
     * 创建UI根节点
     * @returns 新创建的FWUIRoot实例
     */
    private createUIRoot() {
        // 创建带有Widget组件的节点
        let node = uiFunc.newNodeWidget("_UIRoot");
        
        // 添加2D渲染根组件
        let root2D = node.addComponent(RenderRoot2D);
        
        // 添加UI根组件并初始化
        let uiRoot = node.addComponent(FWUIRoot);
        uiRoot.init();
        
        return uiRoot;
    }

    /**
     * 显示对话框
     * @param config 对话框资源配置
     * @param data 传递给对话框的数据
     * @returns Promise<FWUIDialog> 对话框实例
     */
    async showDialog(config: IAssetConfig, data?: any) {
        return await this._dialogManager.loadAndShowDialog(config, data);
    }

    /**
     * 关闭指定对话框
     * @param dialog 要关闭的对话框实例
     * @param data 关闭时传递的数据
     */
    closeDialog(dialog: FWUIDialog, data?: IUIDialogHideData) {
        dialog.hide(data);
    }

    /**
     * 关闭所有对话框
     */
    closeAllDialog() {
        this._dialogManager.closeAllDialog();
    }

    /**
     * 获取对话框管理器
     * @returns FWUIDialogManager实例
     */
    get dialog() {
        return this._dialogManager;
    }

    /**
     * 显示加载界面
     * @param view 加载界面实例
     */
    showLoading(view: FWUILoading) {
        this._loadingManager.add(view);
    }

    /**
     * 关闭指定加载界面
     * @param view 要关闭的加载界面实例
     */
    closeLoading(view: FWUILoading) {
        view.hide();
    }

    /**
     * 关闭所有加载界面
     */
    closeAllLoading() {
        this._loadingManager.closeAll();
    }

    /**
     * 获取加载界面管理器
     * @returns FWUILoadingManager实例
     */
    get loading() {
        return this._loadingManager;
    }
}

/**
 * 全局类型声明扩展
 * 为全局管理器接口添加UI管理器类型
 */
declare global {
    namespace globalThis {
        interface IFWManager {
            ui: FWUIManager
        }
    }
}