/**
 * ECS 类型定义
 */

/** 实体ID类型 */
export type EntityId = number;

/** 组件类型 */
export type ComponentType<T = any> = new (...args: any[]) => T;

/** 组件类型ID */
export type ComponentTypeId = number;

/** 系统优先级 */
export type SystemPriority = number;

/** 组件数据 */
export interface IComponent {
    /** 所属实体ID */
    entityId?: EntityId;
    /** 组件是否激活 */
    enabled?: boolean;
}

/** 系统接口 */
export interface ISystem {
    /** 系统优先级，数值越小越先执行 */
    priority: SystemPriority;
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

/** 查询配置 */
export interface QueryConfig {
    /** 必须包含的组件 */
    all?: ComponentType[];
    /** 至少包含一个的组件 */
    any?: ComponentType[];
    /** 不能包含的组件 */
    none?: ComponentType[];
}

/** 实体快照 */
export interface EntitySnapshot {
    id: EntityId;
    components: Map<ComponentTypeId, any>;
}

/** World配置 */
export interface WorldConfig {
    /** 初始实体池大小 */
    initialEntityPoolSize?: number;
    /** 组件池大小 */
    componentPoolSize?: number;
    /** 是否启用调试模式 */
    debug?: boolean;
}

