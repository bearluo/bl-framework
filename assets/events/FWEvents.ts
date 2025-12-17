import { EventMap } from '@bl-framework/core';
import { Node, EventTouch, Component } from 'cc';


/**
 * 所有事件名称常量
 * 
 * 从 IFWEvents 接口中提取的所有事件名称常量
 * 用于避免字符串字面量,提供类型安全的事件名称引用
 */
export const FWEventNames = {
    // UI相关事件
    ON_UI_ROOT_CHANGED: 'ON_UI_ROOT_CHANGED' as const,
    // 音频相关事件
    ON_BGM_VOLUME_CHANGED: 'ON_BGM_VOLUME_CHANGED' as const,
    // 资源管理相关事件
    ON_BUNDLE_RELEASE: 'ON_BUNDLE_RELEASE' as const,
    // 触摸输入相关事件
    ON_GAME_TOUCH_START: 'ON_GAME_TOUCH_START' as const,
    ON_GAME_TOUCH_MOVE: 'ON_GAME_TOUCH_MOVE' as const,
    ON_GAME_TOUCH_END: 'ON_GAME_TOUCH_END' as const,
    ON_GAME_TOUCH_CANCEL: 'ON_GAME_TOUCH_CANCEL' as const,
    // 系统管理相关事件
    MANAGER_INIT_END: 'MANAGER_INIT_END' as const,
} as const; 
/**
 * 框架全局事件类型映射
 * 
 * 定义了整个框架中使用的事件名称及其参数类型
 * 提供完整的类型安全支持
 * 
 * @example
 * ```typescript
 * import { FWEventDispatcher } from './FWEventDispatcher';
 * import { IFWEvents, FWEventNames } from './FWEvents';
 * 
 * // 创建类型安全的事件分发器
 * const dispatcher = new FWEventDispatcher<IFWEvents>();
 * 
 * // 监听事件(自动推断参数类型)
 * dispatcher.on('ON_UI_ROOT_CHANGED', (uiRoot) => {
 *     // uiRoot 自动推断为 Component 类型
 *     console.log('UI根节点已更新', uiRoot);
 * });
 * 
 * // 使用常量
 * dispatcher.on(FWEventNames.ON_BGM_VOLUME_CHANGED, (volume) => {
 *     console.log('音量:', volume);
 * });
 * 
 * // 触发事件(类型检查)
 * dispatcher.emit('ON_BGM_VOLUME_CHANGED', 0.8); // ✓ 正确
 * // dispatcher.emit('ON_BGM_VOLUME_CHANGED', '0.8'); // ✗ 类型错误
 * ```
 */
export interface IFWEvents extends EventMap {
    // ==================== UI相关事件 ====================
    
    /**
     * UI根节点发生变化事件
     * 
     * 当场景中的UI根节点（UIRoot）发生变化时触发
     * 通常用于通知其他组件UI层级结构已更新
     */
    'ON_UI_ROOT_CHANGED': [uiRoot: Component];

    // ==================== 音频相关事件 ====================
    
    /**
     * 背景音乐音量变化事件
     * 
     * 当用户在设置面板中调整背景音乐音量时触发
     * 用于同步更新所有相关的音频组件
     * 
     * @param volume - 新的音量值 (0.0 - 1.0)
     */
    'ON_BGM_VOLUME_CHANGED': [volume: number];

    // ==================== 资源管理相关事件 ====================
    
    /**
     * 子包释放事件
     * 
     * 当动态加载的子包被释放时触发
     * 用于清理相关资源和通知依赖组件
     * 
     * @param bundleName - 被释放的子包名称
     */
    'ON_BUNDLE_RELEASE': [bundleName: string];

    // ==================== 触摸输入相关事件 ====================
    
    /**
     * 游戏触摸开始事件
     * 
     * 当用户在游戏界面上开始触摸时触发
     * 
     * @param event - 触摸事件对象
     */
    'ON_GAME_TOUCH_START': [event: EventTouch];
    
    /**
     * 游戏触摸移动事件
     * 
     * 当用户在游戏界面上移动触摸时触发
     * 
     * @param event - 触摸事件对象
     */
    'ON_GAME_TOUCH_MOVE': [event: EventTouch];
    
    /**
     * 游戏触摸结束事件
     * 
     * 当用户在游戏界面上结束触摸时触发
     * 
     * @param event - 触摸事件对象
     */
    'ON_GAME_TOUCH_END': [event: EventTouch];
    
    /**
     * 游戏触摸取消事件
     * 
     * 当用户的触摸被系统取消时触发（如来电、通知等）
     * 
     * @param event - 触摸事件对象
     */
    'ON_GAME_TOUCH_CANCEL': [event: EventTouch];

    // ==================== 系统管理相关事件 ====================
    
    /**
     * 管理器初始化完成事件
     * 
     * 当所有核心管理器初始化完成后触发
     * 通常用于通知游戏可以开始正常运行
     */
    'MANAGER_INIT_END': [];
}

/**
 * 事件名称类型
 * 
 * 从 IFWEvents 接口中提取所有事件名称
 */
export type FWEventName = keyof IFWEvents;

/**
 * 如何扩展事件列表
 * 
 * 方式1: 使用声明合并扩展 IFWEvents 接口（推荐）
 * 
 * @example
 * ```typescript
 * // 在你的项目文件中 (例如: GameEvents.ts)
 * import { IFWEvents } from 'bl-framework/events/FWEvents';
 * 
 * // 扩展框架事件接口
 * declare module 'bl-framework/events/FWEvents' {
 *     interface IFWEvents {
 *         // 添加你的自定义事件
 *         'PLAYER_SPAWN': [x: number, y: number, playerId: string];
 *         'PLAYER_MOVE': [position: Vec2];
 *         'ENEMY_DEFEATED': [enemyId: string, reward: number];
 *         'LEVEL_COMPLETE': [levelId: number, stars: number];
 *     }
 * }
 * 
 * // 现在可以使用扩展的事件了
 * const dispatcher = new FWEventDispatcher<IFWEvents>();
 * dispatcher.on('PLAYER_SPAWN', (x, y, playerId) => {
 *     // 完整的类型推断支持
 * });
 * ```
 * 
 * 方式2: 创建自己的事件类型
 * 
 * @example
 * ```typescript
 * // GameEvents.ts
 * import { IFWEvents } from 'bl-framework/events/FWEvents';
 * 
 * // 定义游戏事件
 * interface IGameEvents {
 *     'PLAYER_SPAWN': [x: number, y: number];
 *     'ENEMY_SPAWN': [enemyType: string];
 * }
 * 
 * // 合并框架事件和游戏事件
 * type IAllEvents = IFWEvents & IGameEvents;
 * 
 * // 使用合并后的类型
 * const dispatcher = new FWEventDispatcher<IAllEvents>();
 * dispatcher.on('ON_UI_ROOT_CHANGED', (root) => {}); // 框架事件
 * dispatcher.on('PLAYER_SPAWN', (x, y) => {}); // 游戏事件
 * ```
 */