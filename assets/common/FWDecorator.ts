import { Component } from "cc";
/**
 * 装饰器
 */

/**
 * TryCatch装饰器使用示例:
 * ```ts
 * class DataService {
 *     // 当方法抛出异常时，将返回默认值 'default value'
 *     @TryCatch('default value')
 *     fetchData() {
 *         // 模拟一个可能会抛出异常的操作
 *         if (Math.random() > 0.5) {
 *             throw new Error('网络请求失败');
 *         }
 *         return '请求成功数据';
 *     }
 * 
 *     // 也可以返回一个对象作为默认值
 *     @TryCatch({ code: -1, msg: '操作失败', data: null })
 *     getUserInfo(userId: string) {
 *         // 业务逻辑...
 *         throw new Error('用户不存在');
 *     }
 * }
 */
/**
 * try catch 装饰器
 * @param ret 当方法抛出异常时的返回值
 * @returns 装饰器函数
 */
export const TryCatch = function (ret: any) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            try {
                return originalMethod.apply(this, args);
            } catch (error) {
                return ret;
            }
        };
    };
}

/**
 * 主线程装饰器使用示例:
 * ```ts
 * class GameUI extends Component {
 *     private score: number = 0;
 * 
 *     // 确保在主线程更新UI
 *     @MainThread()
 *     updateScore(newScore: number) {
 *         this.score = newScore;
 *         // 安全地更新UI组件
 *         this.node.getChildByName('ScoreLabel').getComponent(Label).string = `分数: ${this.score}`;
 *     }
 * 
 *     // 可以在子线程中调用这个方法，装饰器会确保实际更新在主线程执行
 *     async onScoreChanged() {
 *         const newScore = await this.calculateScoreInWorker();
 *         this.updateScore(newScore);
 *     }
 * }
 */

/**
 * 主线程装饰器
 * @returns 
 */
export const MainThrend = function() {
    return function (target: Component, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            this.scheduleOnce(function() {
                originalMethod.apply(this, args);
            })
        };
    };
}