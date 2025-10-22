import { ISystem, SystemPriority } from '../types';
import { World } from './World';

/**
 * 系统基类
 * 系统包含处理实体和组件的逻辑
 */
export abstract class System implements ISystem {
    /** 系统优先级 */
    priority: SystemPriority = 0;

    /** 所属World */
    protected world!: World;

    /** 系统是否启用 */
    protected _enabled: boolean = true;

    /** 设置World引用 */
    setWorld(world: World): void {
        this.world = world;
    }

    /** 获取是否启用 */
    get enabled(): boolean {
        return this._enabled;
    }

    /** 设置是否启用 */
    set enabled(value: boolean) {
        if (this._enabled === value) return;

        this._enabled = value;
        if (value) {
            this.onEnable?.();
        } else {
            this.onDisable?.();
        }
    }

    /** 系统初始化 */
    onInit?(): void;

    /** 系统更新 */
    onUpdate?(dt: number): void;

    /** 系统销毁 */
    onDestroy?(): void;

    /** 系统启用 */
    onEnable?(): void;

    /** 系统禁用 */
    onDisable?(): void;
}

