import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, Eventify, EventTouch, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from "./base/FWBaseManager";
import { Events } from '../../events/FWEvents';
const { ccclass, property } = _decorator;

@ccclass('FWEventManager')
export class FWEventManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWEventManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWEventManager {
        if (!FWEventManager._instance) {
            FWEventManager._instance = new FWEventManager();
        }
        return FWEventManager._instance;
    }
    /**
     * 事件
     */
    events = Events;
}

declare global {
    namespace globalThis {
        interface IFWManager {
            event : FWEventManager
        }
    }
}