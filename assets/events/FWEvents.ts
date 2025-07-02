import { _decorator, Component, EventTarget, Node, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 全局事件定义类
 * 
 * 该类定义了整个框架中使用的全局事件名称常量
 * 所有事件名称都应该是唯一的字符串标识符
 * 
 * @example
 * ```typescript
 * // 监听UI根节点变化事件
 * EventTarget.on(Events.onUIRootChanged, this.onUIRootChanged, this);
 * 
 * // 发送背景音乐音量变化事件
 * EventTarget.emit(Events.onBgmVolumeChanged, volume);
 * ```
 */
export class Events {
    // ==================== UI相关事件 ====================
    
    /**
     * UI根节点发生变化事件
     * 
     * 当场景中的UI根节点（UIRoot）发生变化时触发
     * 通常用于通知其他组件UI层级结构已更新
     * 
     * @event onUIRootChanged
     * @param {Node} uiRoot - 新的UI根节点
     */
    static onUIRootChanged: string = "onUIRootChanged";

    // ==================== 音频相关事件 ====================
    
    /**
     * 背景音乐音量变化事件
     * 
     * 当用户在设置面板中调整背景音乐音量时触发
     * 用于同步更新所有相关的音频组件
     * 
     * @event onBgmVolumeChanged
     * @param {number} volume - 新的音量值 (0.0 - 1.0)
     */
    static onBgmVolumeChanged: string = "onBgmVolumeChanged";

    // ==================== 资源管理相关事件 ====================
    
    /**
     * 子包释放事件
     * 
     * 当动态加载的子包被释放时触发
     * 用于清理相关资源和通知依赖组件
     * 
     * @event onBundleRlease
     * @param {string} bundleName - 被释放的子包名称
     */
    static onBundleRlease: string = "onBundleRlease";

    // ==================== 触摸输入相关事件 ====================
    
    /**
     * 游戏触摸开始事件
     * 
     * 当用户在游戏界面上开始触摸时触发
     * 
     * @event onGameTouchStart
     * @param {event} {@link EventTouch} - 触摸事件对象
     */
    static onGameTouchStart: string = "onGameTouchStart";
    
    /**
     * 游戏触摸移动事件
     * 
     * 当用户在游戏界面上移动触摸时触发
     * 
     * @event onGameTouchMove
     * @param {event} {@link EventTouch} - 触摸事件对象
     */
    static onGameTouchMove: string = "onGameTouchMove";
    
    /**
     * 游戏触摸结束事件
     * 
     * 当用户在游戏界面上结束触摸时触发
     * 
     * @event onGameTouchEnd
     * @param {event} {@link EventTouch} - 触摸事件对象
     */
    static onGameTouchEnd: string = "onGameTouchEnd";
    
    /**
     * 游戏触摸取消事件
     * 
     * 当用户的触摸被系统取消时触发（如来电、通知等）
     * 
     * @event onGameTouchCancel
     * @param {event} {@link EventTouch} - 触摸事件对象
     */
    static onGameTouchCancel: string = "onGameTouchCancel";

    // ==================== 系统管理相关事件 ====================
    
    /**
     * 管理器初始化完成事件
     * 
     * 当所有核心管理器初始化完成后触发
     * 通常用于通知游戏可以开始正常运行
     * 
     * @event MANAGER_INIT_END
     */
    static MANAGER_INIT_END = "MANAGER_INIT_END";
}