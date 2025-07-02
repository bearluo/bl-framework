import { _decorator, assetManager, Component, EventTarget, director, Node, UITransform, Widget, Prefab, instantiate, AssetManager, RenderRoot2D, System, ISchedulable, Director, Scene } from 'cc';

import { FWTimer } from './common/FWTimer';
import { FWManager } from './manager';
const { ccclass, property } = _decorator;

/**
 * FWApplication - 框架应用程序主类
 * 负责初始化和管理整个应用程序的生命周期
 * 实现单例模式，确保全局只有一个应用实例
 */
@ccclass('FWApplication')
export class FWApplication implements ISchedulable {
    /** 应用实例ID */
    id?: string;
    /** 应用实例UUID */
    uuid?: string;

    /** 单例实例 */
    private static _instance: FWApplication;
    
    /**
     * 获取应用单例实例
     * @returns FWApplication 应用实例
     */
    static get instance(): FWApplication {
        return this._instance;
    }
    
    /** 框架管理器实例 */
    manager: FWManager;

    /**
     * 构造函数
     * 初始化应用程序，设置单例，启动定时器，初始化管理器
     */
    constructor() {
        // 设置实例标识
        this.id = this.uuid = "FWApplication"
        
        // 如果已存在实例，先销毁
        if(FWApplication._instance) FWApplication._instance.dectroy();
        
        // 设置全局应用实例
        globalThis.app = this as any;
        FWApplication._instance = this;
        
        // 启动高优先级定时器更新
        FWTimer.scheduleUpdate(this, System.Priority.HIGH, false);
        
        // 初始化管理器
        this.initManager();
        
        // 预加载资源
        this.__preload();
        
        // 启动应用
        this.start();
        
        // 发送管理器初始化完成事件
        app.manager.event.emit(app.manager.event.events.MANAGER_INIT_END);
    }

    /**
     * 初始化框架管理器
     * 创建并初始化FWManager实例
     */
    protected initManager() {
        this.manager = new FWManager();
        this.manager.initManager();
    }

    /**
     * 预加载资源
     * 在应用启动前预加载必要的资源
     */
    __preload() {
        this.manager.__preload();
    }

    /**
     * 启动应用
     * 启动框架管理器的运行
     */
    start() {
        this.manager.start();
    }

    /**
     * 更新方法
     * 每帧调用，更新框架管理器的状态
     * @param deltaTime 帧间隔时间
     */
    update(deltaTime: number) {
        this.manager.update(deltaTime);
    }

    /**
     * 销毁应用
     * 清理定时器、销毁管理器、清理全局引用
     */
    dectroy() {
        // 停止定时器更新
        FWTimer.unscheduleUpdate(this);
        
        // 销毁管理器
        this.manager.dectroy();
        
        // 清理全局引用
        globalThis.app = null;
        FWApplication._instance = null;
    }
}

/** 应用类型定义 */
export type ApplicationType = InstanceType<typeof FWApplication>

/**
 * 全局类型声明
 * 为全局app对象定义接口
 */
declare global {
    interface IFWApp {
        /** 销毁应用 */
        dectroy():void;
        /** 获取应用实例 */
        get instance(): FWApplication;
    }
}