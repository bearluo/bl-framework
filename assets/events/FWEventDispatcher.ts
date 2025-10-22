/**
 * 事件映射类型
 * 
 * 定义事件名称和对应的参数类型
 * 
 * @example
 * ```typescript
 * interface MyEvents {
 *     'player:move': [x: number, y: number];
 *     'player:attack': [target: Entity, damage: number];
 *     'game:over': [score: number];
 * }
 * 
 * const dispatcher = new FWEventDispatcher<MyEvents>();
 * dispatcher.on('player:move', (x, y) => {}); // 自动推断 x, y 为 number
 * dispatcher.emit('player:move', 100, 200); // 类型安全
 * ```
 */
export type EventMap = Record<string, any[]>;

/**
 * 事件监听器接口
 */
interface IEventListener<TArgs extends any[] = any[]> {
    /** 回调函数 */
    callback: (...args: TArgs) => void;
    /** 上下文对象 */
    target?: any;
    /** 是否只执行一次 */
    once?: boolean;
    /** 优先级(数字越大越先执行) */
    priority?: number;
}

/**
 * 事件分发器类(带类型约束)
 * 
 * 提供完整的事件订阅-发布机制，支持：
 * - 类型安全的事件系统
 * - 事件监听与移除
 * - 一次性监听
 * - 优先级控制
 * - 事件拦截
 * - 通配符匹配
 * 
 * @template TEvents 事件映射类型
 * 
 * @example
 * ```typescript
 * // 定义事件映射
 * interface GameEvents {
 *     'player:move': [x: number, y: number];
 *     'player:damage': [damage: number, source: string];
 *     'game:start': [];
 * }
 * 
 * // 创建类型安全的事件分发器
 * const dispatcher = new FWEventDispatcher<GameEvents>();
 * 
 * // 监听事件(自动推断参数类型)
 * dispatcher.on('player:move', (x, y) => {
 *     console.log(`Player moved to ${x}, ${y}`);
 * });
 * 
 * // 触发事件(类型检查)
 * dispatcher.emit('player:move', 100, 200); // ✓ 正确
 * // dispatcher.emit('player:move', '100', 200); // ✗ 类型错误
 * ```
 */
export class FWEventDispatcher<TEvents extends EventMap = EventMap> {
    /** 事件监听器映射表 */
    private listeners: Map<keyof TEvents, IEventListener[]> = new Map();
    
    /** 通配符监听器 */
    private wildcardListeners: IEventListener[] = [];
    
    /** 事件拦截器 */
    private interceptors: Map<keyof TEvents, Function[]> = new Map();
    
    /** 是否启用调试日志 */
    private debugMode: boolean = false;
    
    /** 事件统计信息 */
    private stats: Map<keyof TEvents, { count: number; lastTime: number }> = new Map();

    constructor(debugMode: boolean = false) {
        this.debugMode = debugMode;
    }

    /**
     * 监听事件
     * 
     * @param event 事件名称
     * @param callback 回调函数
     * @param target 上下文对象
     * @param priority 优先级(数字越大越先执行)，默认 0
     * @returns 返回自身以支持链式调用
     * 
     * @example
     * ```typescript
     * dispatcher.on('game:start', this.onGameStart, this);
     * dispatcher.on('game:update', this.onUpdate, this, 10); // 高优先级
     * ```
     */
    on<K extends keyof TEvents>(
        event: K,
        callback: (...args: TEvents[K]) => void,
        target?: any,
        priority: number = 0
    ): this {
        if (!event || !callback) {
            console.error('[FWEventDispatcher] event and callback are required');
            return this;
        }

        const listener: IEventListener<TEvents[K]> = {
            callback,
            target,
            once: false,
            priority
        };

        if (event === '*' as K) {
            // 通配符监听器
            this.wildcardListeners.push(listener as any);
            this.sortListeners(this.wildcardListeners);
        } else {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            
            const eventListeners = this.listeners.get(event)!;
            eventListeners.push(listener as any);
            
            // 按优先级排序
            this.sortListeners(eventListeners);
        }

        this.log(`[on] 添加监听: ${String(event)}, 优先级: ${priority}`);
        return this;
    }

    /**
     * 监听事件(仅触发一次)
     * 
     * @param event 事件名称
     * @param callback 回调函数
     * @param target 上下文对象
     * @param priority 优先级，默认 0
     * @returns 返回自身以支持链式调用
     * 
     * @example
     * ```typescript
     * dispatcher.once('level:complete', this.onLevelComplete, this);
     * ```
     */
    once<K extends keyof TEvents>(
        event: K,
        callback: (...args: TEvents[K]) => void,
        target?: any,
        priority: number = 0
    ): this {
        if (!event || !callback) {
            console.error('[FWEventDispatcher] event and callback are required');
            return this;
        }

        const listener: IEventListener<TEvents[K]> = {
            callback,
            target,
            once: true,
            priority
        };

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const eventListeners = this.listeners.get(event)!;
        eventListeners.push(listener as any);
        this.sortListeners(eventListeners);

        this.log(`[once] 添加一次性监听: ${String(event)}`);
        return this;
    }

    /**
     * 移除事件监听
     * 
     * @param event 事件名称(不传则移除所有)
     * @param callback 回调函数(不传则移除该事件的所有监听)
     * @param target 上下文对象
     * @returns 返回自身以支持链式调用
     * 
     * @example
     * ```typescript
     * dispatcher.off('game:start'); // 移除所有 game:start 监听
     * dispatcher.off('game:start', callback); // 移除特定回调
     * dispatcher.off(); // 移除所有监听
     * ```
     */
    off<K extends keyof TEvents>(
        event?: K,
        callback?: (...args: TEvents[K]) => void,
        target?: any
    ): this {
        // 移除所有监听
        if (!event) {
            this.listeners.clear();
            this.wildcardListeners = [];
            this.log('[off] 移除所有监听');
            return this;
        }

        if (event === '*' as K) {
            if (!callback) {
                this.wildcardListeners = [];
            } else {
                this.wildcardListeners = this.wildcardListeners.filter(
                    listener => listener.callback !== callback || listener.target !== target
                );
            }
            return this;
        }

        if (!this.listeners.has(event)) {
            return this;
        }

        const eventListeners = this.listeners.get(event)!;

        // 移除该事件的所有监听
        if (!callback) {
            this.listeners.delete(event);
            this.log(`[off] 移除事件所有监听: ${String(event)}`);
            return this;
        }

        // 移除特定回调
        const filtered = eventListeners.filter(listener => {
            const isMatch = listener.callback === callback && 
                           (target === undefined || listener.target === target);
            return !isMatch;
        });

        if (filtered.length === 0) {
            this.listeners.delete(event);
        } else {
            this.listeners.set(event, filtered);
        }

        this.log(`[off] 移除监听: ${String(event)}`);
        return this;
    }

    /**
     * 移除目标对象的所有监听
     * 
     * @param target 目标对象
     * @returns 返回自身以支持链式调用
     * 
     * @example
     * ```typescript
     * dispatcher.offTarget(this); // 移除当前对象的所有监听
     * ```
     */
    offTarget(target: any): this {
        if (!target) return this;

        let removedCount = 0;

        // 移除普通监听器
        this.listeners.forEach((listeners, event) => {
            const filtered = listeners.filter(listener => listener.target !== target);
            removedCount += listeners.length - filtered.length;
            
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        });

        // 移除通配符监听器
        const wildcardFiltered = this.wildcardListeners.filter(listener => listener.target !== target);
        removedCount += this.wildcardListeners.length - wildcardFiltered.length;
        this.wildcardListeners = wildcardFiltered;

        this.log(`[offTarget] 移除目标的所有监听，共 ${removedCount} 个`);
        return this;
    }

    /**
     * 触发事件
     * 
     * @param event 事件名称
     * @param args 传递给监听器的参数
     * @returns 是否成功触发(是否有监听器)
     * 
     * @example
     * ```typescript
     * dispatcher.emit('player:damage', player, damage, source);
     * dispatcher.emit('game:over', { score: 1000, time: 120 });
     * ```
     */
    emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean {
        if (!event) {
            console.error('[FWEventDispatcher] event is required');
            return false;
        }

        // 检查拦截器
        if (this.shouldIntercept(event, args)) {
            this.log(`[emit] 事件被拦截: ${String(event)}`);
            return false;
        }

        let triggered = false;
        const startTime = performance.now();

        // 触发普通监听器
        if (this.listeners.has(event)) {
            const eventListeners = this.listeners.get(event)!.slice(); // 复制数组避免在回调中修改
            const toRemove: IEventListener[] = [];

            for (const listener of eventListeners) {
                try {
                    if (listener.target) {
                        listener.callback.apply(listener.target, args);
                    } else {
                        listener.callback(...args);
                    }
                    triggered = true;

                    // 标记一次性监听器
                    if (listener.once) {
                        toRemove.push(listener);
                    }
                } catch (error) {
                    console.error(`[FWEventDispatcher] Error in listener for ${String(event)}:`, error);
                }
            }

            // 移除一次性监听器
            if (toRemove.length > 0) {
                const remaining = this.listeners.get(event)!.filter(
                    listener => !toRemove.some(l => l === listener)
                );
                if (remaining.length === 0) {
                    this.listeners.delete(event);
                } else {
                    this.listeners.set(event, remaining);
                }
            }
        }

        // 触发通配符监听器
        if (this.wildcardListeners.length > 0) {
            const wildcardArgs = [event, ...args]; // 第一个参数是事件名
            
            for (const listener of this.wildcardListeners.slice()) {
                try {
                    if (listener.target) {
                        listener.callback.apply(listener.target, wildcardArgs);
                    } else {
                        listener.callback(...wildcardArgs);
                    }
                    triggered = true;
                } catch (error) {
                    console.error(`[FWEventDispatcher] Error in wildcard listener:`, error);
                }
            }
        }

        // 记录统计信息
        const elapsed = performance.now() - startTime;
        this.updateStats(event, elapsed);

        this.log(`[emit] 触发事件: ${String(event)}, 耗时: ${elapsed.toFixed(2)}ms`);
        return triggered;
    }

    /**
     * 添加事件拦截器
     * 
     * 拦截器可以阻止事件触发
     * 
     * @param event 事件名称
     * @param interceptor 拦截器函数，返回 true 表示拦截
     * @returns 返回自身以支持链式调用
     * 
     * @example
     * ```typescript
     * dispatcher.intercept('player:move', (x, y) => {
     *     return x < 0 || y < 0; // 拦截负坐标移动
     * });
     * ```
     */
    intercept<K extends keyof TEvents>(
        event: K,
        interceptor: (...args: TEvents[K]) => boolean
    ): this {
        if (!this.interceptors.has(event)) {
            this.interceptors.set(event, []);
        }
        this.interceptors.get(event)!.push(interceptor as any);
        return this;
    }

    /**
     * 移除事件拦截器
     * 
     * @param event 事件名称
     * @param interceptor 拦截器函数(不传则移除所有)
     * @returns 返回自身以支持链式调用
     */
    removeIntercept<K extends keyof TEvents>(
        event: K,
        interceptor?: (...args: TEvents[K]) => boolean
    ): this {
        if (!interceptor) {
            this.interceptors.delete(event);
        } else if (this.interceptors.has(event)) {
            const filtered = this.interceptors.get(event)!.filter(i => i !== interceptor);
            if (filtered.length === 0) {
                this.interceptors.delete(event);
            } else {
                this.interceptors.set(event, filtered);
            }
        }
        return this;
    }

    /**
     * 检查是否有监听器
     * 
     * @param event 事件名称
     * @param callback 特定回调函数(可选)
     * @returns 是否存在监听器
     * 
     * @example
     * ```typescript
     * if (dispatcher.has('game:start')) {
     *     console.log('有游戏开始的监听器');
     * }
     * ```
     */
    has<K extends keyof TEvents>(event: K, callback?: Function): boolean {
        if (!this.listeners.has(event)) {
            return false;
        }

        if (!callback) {
            return this.listeners.get(event)!.length > 0;
        }

        return this.listeners.get(event)!.some(listener => listener.callback === callback);
    }

    /**
     * 获取事件的监听器数量
     * 
     * @param event 事件名称(不传则返回所有事件的总数)
     * @returns 监听器数量
     */
    getListenerCount<K extends keyof TEvents>(event?: K): number {
        if (event) {
            return this.listeners.has(event) ? this.listeners.get(event)!.length : 0;
        }

        let count = this.wildcardListeners.length;
        this.listeners.forEach(listeners => {
            count += listeners.length;
        });
        return count;
    }

    /**
     * 获取所有事件名称
     * 
     * @returns 事件名称数组
     */
    getEventNames(): (keyof TEvents)[] {
        return Array.from(this.listeners.keys());
    }

    /**
     * 获取事件统计信息
     * 
     * @returns 统计信息映射
     */
    getStats(): Map<keyof TEvents, { count: number; lastTime: number }> {
        return new Map(this.stats);
    }

    /**
     * 清除统计信息
     */
    clearStats(): void {
        this.stats.clear();
    }

    /**
     * 清空所有监听器和拦截器
     */
    clear(): void {
        this.listeners.clear();
        this.wildcardListeners = [];
        this.interceptors.clear();
        this.log('[clear] 清空所有监听器和拦截器');
    }

    /**
     * 启用/禁用调试模式
     * 
     * @param enabled 是否启用
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * 打印当前所有监听器(用于调试)
     */
    debug(): void {
        console.log('=== FWEventDispatcher Debug Info ===');
        console.log(`Total Events: ${this.listeners.size}`);
        console.log(`Total Listeners: ${this.getListenerCount()}`);
        console.log(`Wildcard Listeners: ${this.wildcardListeners.length}`);
        
        console.log('\nEvents:');
        this.listeners.forEach((listeners, event) => {
            console.log(`  ${String(event)}: ${listeners.length} listener(s)`);
            listeners.forEach((listener, i) => {
                console.log(`    [${i}] priority: ${listener.priority}, once: ${listener.once}`);
            });
        });

        if (this.stats.size > 0) {
            console.log('\nStats:');
            this.stats.forEach((stat, event) => {
                console.log(`  ${String(event)}: ${stat.count} times, last: ${stat.lastTime.toFixed(2)}ms`);
            });
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 按优先级排序监听器
     */
    private sortListeners(listeners: IEventListener[]): void {
        listeners.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 检查是否应该拦截事件
     */
    private shouldIntercept<K extends keyof TEvents>(event: K, args: TEvents[K]): boolean {
        if (!this.interceptors.has(event)) {
            return false;
        }

        const interceptors = this.interceptors.get(event)!;
        for (const interceptor of interceptors) {
            try {
                if (interceptor(...args) === true) {
                    return true;
                }
            } catch (error) {
                console.error(`[FWEventDispatcher] Error in interceptor for ${String(event)}:`, error);
            }
        }

        return false;
    }

    /**
     * 更新统计信息
     */
    private updateStats<K extends keyof TEvents>(event: K, time: number): void {
        if (!this.stats.has(event)) {
            this.stats.set(event, { count: 0, lastTime: 0 });
        }

        const stat = this.stats.get(event)!;
        stat.count++;
        stat.lastTime = time;
    }

    /**
     * 调试日志
     */
    private log(message: string): void {
        if (this.debugMode) {
            console.log(`[FWEventDispatcher] ${message}`);
        }
    }
}

/**
 * 全局事件分发器(无类型约束)
 * 
 * 如需类型安全，请自行创建带泛型的实例
 * 
 * @example
 * ```typescript
 * import { globalDispatcher } from './FWEventDispatcher';
 * 
 * globalDispatcher.on('app:ready', () => {
 *     console.log('App is ready!');
 * });
 * ```
 */
export const globalDispatcher = new FWEventDispatcher();
