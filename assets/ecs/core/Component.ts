import { EntityId, IComponent } from '../types';

/**
 * 组件基类
 * 组件只包含数据，不包含逻辑
 */
export abstract class Component implements IComponent {
    /** 所属实体ID */
    entityId?: EntityId;

    /** 组件是否启用 */
    enabled: boolean = true;

    /** 重置组件（对象池使用） */
    reset(): void {
        this.entityId = undefined;
        this.enabled = true;
    }

    /** 组件初始化（可选） */
    onInit?(): void;

    /** 组件销毁时调用（可选） */
    onDestroy?(): void;
}

