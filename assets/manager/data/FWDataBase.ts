import { _decorator, Component, EventTarget, Node, assert, sys } from 'cc';
import { FWFile } from '../../common/FWFile';

/**
 * 数据基类构造函数类型定义
 */
type FWDataBaseCtor = () => FWDataBase;

/**
 * 数据注册表，用于存储所有已注册的数据类构造函数
 * key: 数据类标识符
 * value: 对应的构造函数
 */
export const dataRegister: Map<string, FWDataBaseCtor> = new Map();

/**
 * 注册数据类
 * @param key 数据类标识符
 * @param ctor 数据类构造函数
 */
export function registerData(key: string, ctor: FWDataBaseCtor) {
    assert(!dataRegister.has(key), `${key} is already registered`)
    dataRegister.set(key, ctor);
}

/**
 * 注销数据类
 * @param key 数据类标识符
 */
export function unregister(key: string) {
    dataRegister.delete(key);
}

/**
 * 数据基类
 * 提供本地存储的基本操作功能，包括多种数据类型的存取
 */
export class FWDataBase {
    /**
     * 数据文件键前缀，用于在本地存储中区分不同的数据实例
     * 格式: _data_ + key + "_"
     */
    protected _data_file_key_ = '_data_';

    /**
     * 构造函数
     * @param key 数据实例的唯一标识符
     */
    constructor(key: string) {
        this._data_file_key_ = this._data_file_key_ + key + "_";
    }

    // ==================== 基础数据类型 ====================

    /**
     * 保存浮点数到本地存储
     * @param key 存储键名
     * @param number 要存储的浮点数值
     */
    setFloat(key: string, number: number) {
        if (typeof number !== 'number' || isNaN(number)) {
            console.warn(`Invalid float value for key: ${key}`);
            return;
        }
        this.setItem(key, number.toString());
    }

    /**
     * 从本地存储读取浮点数
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的浮点数值，如果不存在则返回默认值或NaN
     */
    getFloat(key: string, defaultValue?: number): number {
        const value = this.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue !== undefined ? defaultValue : NaN;
        }
        const result = Number.parseFloat(value);
        return isNaN(result) ? (defaultValue !== undefined ? defaultValue : NaN) : result;
    }

    /**
     * 保存整数到本地存储
     * @param key 存储键名
     * @param number 要存储的整数值
     */
    setInt(key: string, number: number) {
        if (typeof number !== 'number' || !Number.isInteger(number)) {
            console.warn(`Invalid integer value for key: ${key}`);
            return;
        }
        this.setItem(key, number.toString());
    }

    /**
     * 从本地存储读取整数
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的整数值，如果不存在则返回默认值或NaN
     */
    getInt(key: string, defaultValue?: number): number {
        const value = this.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue !== undefined ? defaultValue : NaN;
        }
        const result = Number.parseInt(value);
        return isNaN(result) ? (defaultValue !== undefined ? defaultValue : NaN) : result;
    }

    /**
     * 保存字符串到本地存储
     * @param key 存储键名
     * @param value 要存储的字符串值
     */
    setString(key: string, value: string) {
        if (typeof value !== 'string') {
            console.warn(`Invalid string value for key: ${key}`);
            return;
        }
        this.setItem(key, value);
    }

    /**
     * 从本地存储读取字符串
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的字符串值，如果不存在则返回默认值或null
     */
    getString(key: string, defaultValue?: string): string | null {
        const value = this.getItem(key);
        return value !== null ? value : (defaultValue !== undefined ? defaultValue : null);
    }

    // ==================== 扩展数据类型 ====================

    /**
     * 保存布尔值到本地存储
     * @param key 存储键名
     * @param value 要存储的布尔值
     */
    setBoolean(key: string, value: boolean) {
        if (typeof value !== 'boolean') {
            console.warn(`Invalid boolean value for key: ${key}`);
            return;
        }
        this.setItem(key, value.toString());
    }

    /**
     * 从本地存储读取布尔值
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的布尔值，如果不存在则返回默认值或false
     */
    getBoolean(key: string, defaultValue?: boolean): boolean {
        const value = this.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue !== undefined ? defaultValue : false;
        }
        return value === 'true';
    }

    /**
     * 保存JSON对象到本地存储
     * @param key 存储键名
     * @param value 要存储的JSON对象
     */
    setObject<T>(key: string, value: T) {
        try {
            const jsonString = JSON.stringify(value);
            this.setItem(key, jsonString);
        } catch (error) {
            console.error(`Failed to serialize object for key: ${key}`, error);
        }
    }

    /**
     * 从本地存储读取JSON对象
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的JSON对象，如果不存在则返回默认值或null
     */
    getObject<T>(key: string, defaultValue?: T): T | null {
        const value = this.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue !== undefined ? defaultValue : null;
        }
        try {
            return JSON.parse(value) as T;
        } catch (error) {
            console.error(`Failed to parse JSON for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    /**
     * 保存数组到本地存储
     * @param key 存储键名
     * @param value 要存储的数组
     */
    setArray<T>(key: string, value: T[]) {
        if (!Array.isArray(value)) {
            console.warn(`Invalid array value for key: ${key}`);
            return;
        }
        this.setObject(key, value);
    }

    /**
     * 从本地存储读取数组
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的数组，如果不存在则返回默认值或空数组
     */
    getArray<T>(key: string, defaultValue?: T[]): T[] {
        const result = this.getObject<T[]>(key);
        if (result === null || !Array.isArray(result)) {
            return defaultValue !== undefined ? defaultValue : [];
        }
        return result;
    }

    /**
     * 保存日期到本地存储
     * @param key 存储键名
     * @param value 要存储的日期对象
     */
    setDate(key: string, value: Date) {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
            console.warn(`Invalid date value for key: ${key}`);
            return;
        }
        this.setItem(key, value.toISOString());
    }

    /**
     * 从本地存储读取日期
     * @param key 存储键名
     * @param defaultValue 默认值，如果读取失败则返回此值
     * @returns 读取到的日期对象，如果不存在则返回默认值或null
     */
    getDate(key: string, defaultValue?: Date): Date | null {
        const value = this.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue !== undefined ? defaultValue : null;
        }
        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? (defaultValue !== undefined ? defaultValue : null) : date;
        } catch (error) {
            console.error(`Failed to parse date for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    // ==================== 高级功能 ====================

    /**
     * 检查指定键是否存在
     * @param key 存储键名
     * @returns 是否存在该键
     */
    hasKey(key: string): boolean {
        return this.getItem(key) !== null;
    }

    /**
     * 删除指定键的数据
     * @param key 要删除的存储键名
     */
    removeItem(key: string) {
        sys.localStorage.removeItem(this._data_file_key_ + key);
    }

    /**
     * 清除当前实例的所有数据
     */
    clear() {
        const keys: string[] = [];
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(this._data_file_key_)) {
                keys.push(key);
            }
        }
        keys.forEach(key => sys.localStorage.removeItem(key));
    }

    /**
     * 获取当前实例的所有键名
     * @returns 当前实例的所有键名数组
     */
    getKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(this._data_file_key_)) {
                // 移除前缀，返回实际的键名
                keys.push(key.substring(this._data_file_key_.length));
            }
        }
        return keys;
    }

    /**
     * 获取当前实例的数据数量
     * @returns 数据项数量
     */
    getSize(): number {
        return this.getKeys().length;
    }

    /**
     * 批量设置数据
     * @param data 要批量设置的数据对象
     */
    setBatch(data: Record<string, any>) {
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    this.setInt(key, value);
                } else {
                    this.setFloat(key, value);
                }
            } else if (typeof value === 'boolean') {
                this.setBoolean(key, value);
            } else if (typeof value === 'string') {
                this.setString(key, value);
            } else if (value instanceof Date) {
                this.setDate(key, value);
            } else if (Array.isArray(value)) {
                this.setArray(key, value);
            } else if (typeof value === 'object' && value !== null) {
                this.setObject(key, value);
            } else {
                console.warn(`Unsupported data type for key: ${key}`);
            }
        });
    }

    /**
     * 批量获取数据
     * @param keys 要获取的键名数组
     * @returns 键值对对象
     */
    getBatch(keys: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        keys.forEach(key => {
            if (this.hasKey(key)) {
                // 尝试推断数据类型并获取
                const value = this.getItem(key);
                if (value !== null) {
                    // 尝试解析为数字
                    const numValue = Number.parseFloat(value);
                    if (!isNaN(numValue) && value === numValue.toString()) {
                        result[key] = Number.isInteger(numValue) ? this.getInt(key) : this.getFloat(key);
                    } else if (value === 'true' || value === 'false') {
                        result[key] = this.getBoolean(key);
                    } else {
                        // 尝试解析为JSON
                        try {
                            const jsonValue = JSON.parse(value);
                            result[key] = jsonValue;
                        } catch {
                            result[key] = value;
                        }
                    }
                }
            }
        });
        return result;
    }

    /**
     * 获取数据统计信息
     * @returns 数据统计信息对象
     */
    getStats() {
        const keys = this.getKeys();
        const stats = {
            totalKeys: keys.length,
            totalSize: 0,
            keyTypes: {} as Record<string, string>
        };

        keys.forEach(key => {
            const value = this.getItem(key);
            if (value !== null) {
                stats.totalSize += value.length;
                
                // 推断数据类型
                try {
                    const jsonValue = JSON.parse(value);
                    if (Array.isArray(jsonValue)) {
                        stats.keyTypes[key] = 'array';
                    } else {
                        stats.keyTypes[key] = 'object';
                    }
                } catch {
                    const numValue = Number.parseFloat(value);
                    if (!isNaN(numValue) && value === numValue.toString()) {
                        stats.keyTypes[key] = Number.isInteger(numValue) ? 'integer' : 'float';
                    } else if (value === 'true' || value === 'false') {
                        stats.keyTypes[key] = 'boolean';
                    } else {
                        stats.keyTypes[key] = 'string';
                    }
                }
            }
        });

        return stats;
    }

    // ==================== 内部方法 ====================

    /**
     * 内部方法：设置本地存储项
     * @param key 存储键名
     * @param value 要存储的值
     */
    protected setItem(key: string, value: string) {
        sys.localStorage.setItem(this._data_file_key_ + key, value);
    }

    /**
     * 内部方法：获取本地存储项
     * @param key 存储键名
     * @returns 存储的值，如果不存在则返回 null
     */
    protected getItem(key: string): string | null {
        return sys.localStorage.getItem(this._data_file_key_ + key);
    }
} 