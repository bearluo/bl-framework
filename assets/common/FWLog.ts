import { DEV } from "cc/env";
import { _decorator, Node } from 'cc';

/**
 * 日志级别枚举
 * @enum {number}
 */
export enum LogLevel {
    /** 禁用日志 */
    NONE = 0,
    /** 错误日志 */
    ERROR = 1,
    /** 警告日志 */
    WARN = 2,
    /** 信息日志 */
    INFO = 3,
    /** 调试日志 */
    DEBUG = 4,
}

/** 当前日志级别 */
export const CURRENT_LOG_LEVEL = DEV ? LogLevel.DEBUG : LogLevel.NONE;

/** 日志时间格式化选项 */
const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
};

/**
 * 日志工具类
 */
export class Log {
    private static getTimeStamp(): string {
        return new Date().toLocaleTimeString('zh-CN', TIME_FORMAT_OPTIONS);
    }

    private static formatMessage(level: string, ...args: any[]): any[] {
        const timestamp = this.getTimeStamp();
        return [`[${timestamp}][${level}]`, ...args];
    }

    private static dealData(callback: (...args: any[]) => void, level: string, ...data: any[]): void {
        callback(...this.formatMessage(level, ...data));
    }

    /**
     * 输出调试级别日志
     * @param args 日志参数
     */
    public static debug(...args: any[]): void {
        if (CURRENT_LOG_LEVEL >= LogLevel.DEBUG) {
            this.dealData(console.debug, 'DEBUG', ...args);
        }
    }

    /**
     * 输出信息级别日志
     * @param args 日志参数
     */
    public static info(...args: any[]): void {
        if (CURRENT_LOG_LEVEL >= LogLevel.INFO) {
            this.dealData(console.log, 'INFO', ...args);
        }
    }

    /**
     * 输出警告级别日志
     * @param args 日志参数
     */
    public static warn(...args: any[]): void {
        if (CURRENT_LOG_LEVEL >= LogLevel.WARN) {
            this.dealData(console.warn, 'WARN', ...args);
        }
    }

    /**
     * 输出错误级别日志
     * @param args 日志参数
     */
    public static error(...args: any[]): void {
        if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
            this.dealData(console.error, 'ERROR', ...args);
        }
    }

    /**
     * 获取当前调用堆栈
     * @returns 错误堆栈信息
     */
    public static getStack(): Error {
        const error = new Error();
        error.name = 'StackTrace';
        return error;
    }

    /**
     * 输出带堆栈信息的错误日志
     * @param error 错误对象
     * @param message 额外信息
     */
    public static errorWithStack(error: Error, message?: string): void {
        if (CURRENT_LOG_LEVEL >= LogLevel.ERROR) {
            this.error(message || error.message);
            this.error('Stack:', error.stack);
        }
    }
}

/** 日志工具类的默认导出别名 */
export const log = Log;