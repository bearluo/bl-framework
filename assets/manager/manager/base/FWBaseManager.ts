import { _decorator, Component, EventTarget, Node, assert, Eventify } from 'cc';
import { managerObject } from '../../../common/FWConstant';
const { ccclass, property } = _decorator;

/**
 * 基础管理器构造函数类型
 */
type FWBaseManagerCtor = () => FWBaseManager;

/**
 * 管理器注册表，用于存储所有已注册的管理器构造函数
 */
export const managerRegister: Map<string, FWBaseManagerCtor> = new Map();

/**
 * 注册管理器
 * @param key 管理器的唯一标识键
 * @param ctor 管理器的构造函数
 */
export function registerManager(key: string, ctor: FWBaseManagerCtor) {
    assert(!managerRegister.has(key), `${key} is already registered`)
    managerRegister.set(key, ctor);
}

/**
 * 注销管理器
 * @param key 要注销的管理器的唯一标识键
 */
export function unregisterManager(key: string) {
    managerRegister.delete(key);
}

/**
 * 框架基础管理器类
 * 所有具体的管理器类都应该继承自此类
 * 提供了基本的生命周期方法和事件系统支持
 */
@ccclass('FWBaseManager')
export class FWBaseManager extends Eventify(EventTarget) {

    /**
     * 构造函数
     * 在创建实例时将自身添加到管理器对象列表中
     */
    public constructor() {
        super();
        managerObject.push(this);
    }

    /**
     * 预加载回调
     */
    __preload(): void {

    }

    /**
     * 启动回调
     */
    start(): void {
    }

    /**
     * 更新回调
     * 每帧调用，用于更新管理器状态
     * @param deltaTime 距离上一帧的时间间隔（秒）
     */
    update(deltaTime: number): void {
    }

    /**
     * 销毁管理器
     * 将自身从管理器对象列表中移除，并调用onDestroy回调
     */
    dectroy(): void {
        let index = managerObject.indexOf(this);
        if (index != -1) {
            managerObject.splice(index, 1);
        }
        this.onDestroy();
    }

    /**
     * 销毁回调
     * 在管理器被销毁时调用，用于清理资源
     */
    onDestroy() {
        
    }
}
