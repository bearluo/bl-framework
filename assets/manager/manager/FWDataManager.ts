import { _decorator, assert, AudioClip, AudioSource, BlockInputEvents, color, Component, director, Eventify, EventTouch, log, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from "./base/FWBaseManager";
import { dataRegister } from '../data/FWDataBase';
const { ccclass, property } = _decorator;

@ccclass('FWDataManager')
export class FWDataManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWDataManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWDataManager {
        if (!FWDataManager._instance) {
            FWDataManager._instance = new FWDataManager();
        }
        return FWDataManager._instance;
    }

    constructor() {
        super();
        dataRegister.forEach((element,key) => {
            this[key] = element();
        });
    }
}

declare global {
    namespace globalThis {
        interface IFWManager {
            data : IFWData & FWDataManager
        }
    }
}