import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, Eventify, EventTouch, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from "./base/FWBaseManager";
import { FWEventDispatcher } from '../../events';
import { IFWEvents, FWEventName, FWEventNames } from '../../events/FWEvents';
const { ccclass, property } = _decorator;

@ccclass('FWEventManager')
export class FWEventManager extends FWBaseManager {
    private event: FWEventDispatcher<IFWEvents>;
    // 重写静态实例类型
    protected static _instance: FWEventManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWEventManager {
        if (!FWEventManager._instance) {
            FWEventManager._instance = new FWEventManager();
        }
        return FWEventManager._instance;
    }

    events = FWEventNames;

    constructor() {
        super();
        this.event = new FWEventDispatcher<IFWEvents>();
    }

    emit<K extends FWEventName>(event: K, ...args: IFWEvents[K]) {
        this.event.emit(event, ...args);
    }

    /**
     * 添加事件监听
     * @param event 事件名称
     * @param callback 回调函数
     * @param target 目标对象
     * @param once 是否只触发一次
     * @param priority 优先级(数字越大越先执行)
     */
    on<K extends FWEventName>(
        event: K,
        callback: (...args: IFWEvents[K]) => void,
        target?: any,
        priority?: number
    ) {
        this.event.on(event, callback, target, priority);
    }

    /**
     * 添加一次性事件监听
     * @param event 事件名称
     * @param callback 回调函数
     * @param target 目标对象
     * @param priority 优先级(数字越大越先执行)
     */
    once<K extends FWEventName>(
        event: K,
        callback: (...args: IFWEvents[K]) => void,
        target?: any,
        priority?: number
    ) {
        this.event.once(event, callback, target, priority);
    }

    /**
     * 移除事件监听
     * @param event 事件名称
     * @param callback 回调函数
     * @param target 目标对象
     */
    off<K extends FWEventName>(
        event: K,
        callback?: (...args: IFWEvents[K]) => void,
        target?: any
    ) {
        this.event.off(event, callback, target);
    }

    /**
     * 移除目标对象的所有监听
     * @param target 目标对象
     */
    offTarget(target: any) {
        this.event.offTarget(target);
    }

    /**
     * 移除所有事件监听
     */
    clear() {
        this.event.clear();
    }
}

declare global {
    namespace globalThis {
        interface IFWManager {
            event : FWEventManager
        }
    }
}