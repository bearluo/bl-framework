import { System } from './System';
import { World } from './World';

/**
 * 系统管理器
 * 负责系统的注册、更新和生命周期管理
 */
export class SystemManager {
    /** 系统列表（按优先级排序） */
    private systems: System[] = [];

    /** 系统类型映射 */
    private systemTypes: Map<new () => System, System> = new Map();

    /** 所属World */
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    /**
     * 注册系统
     */
    registerSystem<T extends System>(systemType: new () => T): T {
        // 检查是否已注册
        if (this.systemTypes.has(systemType)) {
            return this.systemTypes.get(systemType) as T;
        }

        // 创建系统实例
        const system = new systemType();
        system.setWorld(this.world);

        // 添加到列表
        this.systems.push(system);
        this.systemTypes.set(systemType, system);

        // 按优先级从小到大排序，优先级数字越小越先执行
        this.systems.sort((a, b) => a.priority - b.priority);

        // 初始化系统
        system.onInit?.();

        return system;
    }

    /**
     * 获取系统
     */
    getSystem<T extends System>(systemType: new () => T): T | undefined {
        return this.systemTypes.get(systemType) as T | undefined;
    }

    /**
     * 移除系统
     */
    removeSystem<T extends System>(systemType: new () => T): boolean {
        const system = this.systemTypes.get(systemType);
        if (!system) return false;

        // 销毁系统
        system.onDestroy?.();

        // 从列表移除
        const index = this.systems.indexOf(system);
        if (index !== -1) {
            this.systems.splice(index, 1);
        }

        this.systemTypes.delete(systemType);

        return true;
    }

    /**
     * 更新所有系统
     */
    update(dt: number): void {
        for (const system of this.systems) {
            if (system.enabled) {
                system.onUpdate?.(dt);
            }
        }
    }

    /**
     * 获取所有系统
     */
    getAllSystems(): System[] {
        return this.systems.slice();
    }

    /**
     * 清空所有系统
     */
    clear(): void {
        // 销毁所有系统
        for (const system of this.systems) {
            system.onDestroy?.();
        }

        this.systems = [];
        this.systemTypes.clear();
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.clear();
    }
}

