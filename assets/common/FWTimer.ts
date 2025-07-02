import { director, ISchedulable } from "cc";

/**
 * FWTimer 类 - 定时器工具类
 * 提供了一系列静态方法用于管理定时器和调度任务
 * 
 * 使用示例:
 * ```typescript
 * // 示例1: 每1秒执行一次，重复3次
 * class MyComponent implements ISchedulable {
 *     start() {
 *         FWTimer.schedule(this.onTick, this, 1, 3);
 *     }
 *     
 *     onTick(dt: number) {
 *         console.log('计时器触发，距离上次触发的时间间隔:', dt);
 *     }
 * }
 * 
 * // 示例2: 延迟2秒后执行一次
 * class MyComponent implements ISchedulable {
 *     start() {
 *         FWTimer.scheduleOnce(this.onceCallback, this, 0, 2);
 *     }
 *     
 *     onceCallback() {
 *         console.log('延迟执行完成');
 *     }
 * }
 * ```
 */
export class FWTimer {
    /**
     * 创建一个定时器
     * @param callback 回调函数，可以接收一个dt参数表示距离上次调用的时间间隔
     * @param target 目标对象（必须实现ISchedulable接口）
     * @param interval 调用间隔时间（秒）
     * @param repeat 重复次数（可选，默认无限重复。设置为 macro.REPEAT_FOREVER 表示无限重复）
     * @param delay 首次调用前的延迟时间（秒）（可选）
     * @param paused 是否以暂停状态创建（可选，默认false）
     */
    static schedule(callback: (dt?: number) => void, target: ISchedulable, interval: number, repeat?: number, delay?: number, paused?: boolean) {
        director.getScheduler().schedule(callback, target, interval, repeat, delay, paused);
    }

    /**
     * 创建一个只执行一次的定时器
     * @param callback 回调函数
     * @param target 目标对象（必须实现ISchedulable接口）
     * @param interval 调用间隔时间（秒）
     * @param delay 延迟时间（秒）（可选）
     * @param paused 是否以暂停状态创建（可选，默认false）
     */
    static scheduleOnce(callback: (dt?: number) => void, target: ISchedulable, interval: number, delay?: number, paused?: boolean) {
        director.getScheduler().schedule(callback, target, interval, 0, delay, paused);
    }

    /**
     * 注册组件的update函数，使其每帧执行
     * @param target 目标对象（必须实现ISchedulable接口）
     * @param priority 优先级，数值越小优先级越高
     * @param paused 是否以暂停状态创建
     */
    static scheduleUpdate(target: ISchedulable, priority: number, paused: boolean) {
        director.getScheduler().scheduleUpdate(target, priority, paused);
    }

    /**
     * 取消组件的update函数注册
     * @param target 目标对象（必须实现ISchedulable接口）
     */
    static unscheduleUpdate(target: ISchedulable) {
        director.getScheduler().unscheduleUpdate(target);
    }

    /**
     * 获取当前时间戳（毫秒）
     * @returns 返回当前时间戳
     */
    static now() {
        return Date.now();
    }
}

export const timer = FWTimer;