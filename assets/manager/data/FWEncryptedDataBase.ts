import { _decorator, sys } from 'cc';
import { FWDataBase } from './FWDataBase';
import { log } from '../../common/FWLog';
import CryptoES from 'crypto-es';

/**
 * 加密数据基类
 * 继承自FWDataBase，提供数据加密存储和解密读取功能
 * 使用CryptoES.AES加密算法进行数据保护
 */
export class FWEncryptedDataBase extends FWDataBase {
    /**
     * 默认加密密钥
     */
    private static readonly DEFAULT_KEY = 'FW_FRAMEWORK_AES_KEY_2024';
    
    /**
     * 默认初始化向量
     */
    private static readonly DEFAULT_IV = 'FW_FRAMEWORK_IV_16';
    
    /**
     * 当前实例使用的加密密钥
     */
    private _encryptKey: string;
    
    /**
     * 当前实例使用的初始化向量
     */
    private _iv: string;
    
    /**
     * 构造函数
     * @param key 数据实例的唯一标识符
     * @param encryptKey 自定义加密密钥，如果不提供则使用默认密钥
     * @param iv 自定义初始化向量，如果不提供则使用默认向量
     */
    constructor(key: string, encryptKey?: string, iv?: string) {
        super(key);
        this._encryptKey = encryptKey || FWEncryptedDataBase.DEFAULT_KEY;
        this._iv = iv || FWEncryptedDataBase.DEFAULT_IV;
        
        // 确保密钥和IV长度符合AES要求
        this._encryptKey = this.padKey(this._encryptKey, 32); // AES-256需要32字节密钥
        this._iv = this.padKey(this._iv, 16); // AES需要16字节IV
    }

    // ==================== 基础数据类型（加密版本） ====================

    /**
     * 保存加密的浮点数到本地存储
     * @param key 存储键名
     * @param number 要存储的浮点数值
     */
    setFloat(key: string, number: number) {
        if (typeof number !== 'number' || isNaN(number)) {
            log.warn(`Invalid float value for key: ${key}`);
            return;
        }
        const encryptedValue = this.encrypt(number.toString());
        this.setItem(key, encryptedValue);
    }

    /**
     * 从本地存储读取并解密浮点数
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的浮点数值，如果解密失败则返回默认值或NaN
     */
    getFloat(key: string, defaultValue?: number): number {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : NaN;
        }
        
        try {
            const decryptedValue = this.decrypt(encryptedValue);
            const result = Number.parseFloat(decryptedValue);
            return isNaN(result) ? (defaultValue !== undefined ? defaultValue : NaN) : result;
        } catch (error) {
            log.warn(`Failed to decrypt float value for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : NaN;
        }
    }

    /**
     * 保存加密的整数到本地存储
     * @param key 存储键名
     * @param number 要存储的整数值
     */
    setInt(key: string, number: number) {
        if (typeof number !== 'number' || !Number.isInteger(number)) {
            log.warn(`Invalid integer value for key: ${key}`);
            return;
        }
        const encryptedValue = this.encrypt(number.toString());
        this.setItem(key, encryptedValue);
    }
    
    /**
     * 从本地存储读取并解密整数
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的整数值，如果解密失败则返回默认值或NaN
     */
    getInt(key: string, defaultValue?: number): number {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : NaN;
        }
        
        try {
            const decryptedValue = this.decrypt(encryptedValue);
            const result = Number.parseInt(decryptedValue);
            return isNaN(result) ? (defaultValue !== undefined ? defaultValue : NaN) : result;
        } catch (error) {
            log.warn(`Failed to decrypt int value for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : NaN;
        }
    }

    /**
     * 保存加密的字符串到本地存储
     * @param key 存储键名
     * @param value 要存储的字符串值
     */
    setString(key: string, value: string) {
        if (typeof value !== 'string') {
            log.warn(`Invalid string value for key: ${key}`);
            return;
        }
        const encryptedValue = this.encrypt(value);
        this.setItem(key, encryptedValue);
    }

    /**
     * 从本地存储读取并解密字符串
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的字符串值，如果解密失败则返回默认值或null
     */
    getString(key: string, defaultValue?: string): string | null {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : null;
        }
        
        try {
            return this.decrypt(encryptedValue);
        } catch (error) {
            log.warn(`Failed to decrypt string value for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    /**
     * 保存加密的布尔值到本地存储
     * @param key 存储键名
     * @param value 要存储的布尔值
     */
    setBoolean(key: string, value: boolean) {
        if (typeof value !== 'boolean') {
            log.warn(`Invalid boolean value for key: ${key}`);
            return;
        }
        const encryptedValue = this.encrypt(value.toString());
        this.setItem(key, encryptedValue);
    }

    /**
     * 从本地存储读取并解密布尔值
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的布尔值，如果解密失败则返回默认值或false
     */
    getBoolean(key: string, defaultValue?: boolean): boolean {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : false;
        }
        
        try {
            const decryptedValue = this.decrypt(encryptedValue);
            return decryptedValue === 'true';
        } catch (error) {
            log.warn(`Failed to decrypt boolean value for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : false;
        }
    }

    // ==================== 扩展数据类型（加密版本） ====================

    /**
     * 保存加密的JSON对象到本地存储
     * @param key 存储键名
     * @param value 要存储的JSON对象
     */
    setObject<T>(key: string, value: T) {
        try {
            const jsonString = JSON.stringify(value);
            const encryptedValue = this.encrypt(jsonString);
            this.setItem(key, encryptedValue);
        } catch (error) {
            log.error(`Failed to encrypt object for key: ${key}`, error);
        }
    }

    /**
     * 从本地存储读取并解密JSON对象
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的JSON对象，如果解密失败则返回默认值或null
     */
    getObject<T>(key: string, defaultValue?: T): T | null {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : null;
        }
        
        try {
            const decryptedValue = this.decrypt(encryptedValue);
            return JSON.parse(decryptedValue) as T;
        } catch (error) {
            log.warn(`Failed to decrypt object for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    /**
     * 保存加密的数组到本地存储
     * @param key 存储键名
     * @param value 要存储的数组
     */
    setArray<T>(key: string, value: T[]) {
        if (!Array.isArray(value)) {
            log.warn(`Invalid array value for key: ${key}`);
            return;
        }
        this.setObject(key, value);
    }

    /**
     * 从本地存储读取并解密数组
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的数组，如果解密失败则返回默认值或空数组
     */
    getArray<T>(key: string, defaultValue?: T[]): T[] {
        const result = this.getObject<T[]>(key);
        if (result === null || !Array.isArray(result)) {
            return defaultValue !== undefined ? defaultValue : [];
        }
        return result;
    }

    /**
     * 保存加密的日期到本地存储
     * @param key 存储键名
     * @param value 要存储的日期对象
     */
    setDate(key: string, value: Date) {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
            log.warn(`Invalid date value for key: ${key}`);
            return;
        }
        const encryptedValue = this.encrypt(value.toISOString());
        this.setItem(key, encryptedValue);
    }

    /**
     * 从本地存储读取并解密日期
     * @param key 存储键名
     * @param defaultValue 默认值，如果解密失败则返回此值
     * @returns 解密后的日期对象，如果解密失败则返回默认值或null
     */
    getDate(key: string, defaultValue?: Date): Date | null {
        const encryptedValue = this.getItem(key);
        if (!encryptedValue) {
            return defaultValue !== undefined ? defaultValue : null;
        }
        
        try {
            const decryptedValue = this.decrypt(encryptedValue);
            const date = new Date(decryptedValue);
            return isNaN(date.getTime()) ? (defaultValue !== undefined ? defaultValue : null) : date;
        } catch (error) {
            log.warn(`Failed to decrypt date for key: ${key}`, error);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    // ==================== 高级功能（加密版本） ====================

    /**
     * 检查指定键是否存在（加密数据）
     * @param key 存储键名
     * @returns 是否存在该键
     */
    hasKey(key: string): boolean {
        return this.getItem(key) !== null;
    }

    /**
     * 删除指定键的加密数据
     * @param key 要删除的存储键名
     */
    removeItem(key: string) {
        sys.localStorage.removeItem(this._data_file_key_ + key);
    }

    /**
     * 清除当前实例的所有加密数据
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
        log.info('All encrypted data cleared for current instance');
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
     * 批量设置加密数据
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
                log.warn(`Unsupported data type for key: ${key}`);
            }
        });
    }

    /**
     * 批量获取解密数据
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
                    try {
                        // 先尝试解密
                        const decryptedValue = this.decrypt(value);
                        
                        // 尝试解析为数字
                        const numValue = Number.parseFloat(decryptedValue);
                        if (!isNaN(numValue) && decryptedValue === numValue.toString()) {
                            result[key] = Number.isInteger(numValue) ? this.getInt(key) : this.getFloat(key);
                        } else if (decryptedValue === 'true' || decryptedValue === 'false') {
                            result[key] = this.getBoolean(key);
                        } else {
                            // 尝试解析为JSON
                            try {
                                const jsonValue = JSON.parse(decryptedValue);
                                result[key] = jsonValue;
                            } catch {
                                result[key] = decryptedValue;
                            }
                        }
                    } catch (error) {
                        log.warn(`Failed to decrypt value for key: ${key}`, error);
                        result[key] = null;
                    }
                }
            }
        });
        return result;
    }

    /**
     * 获取加密数据统计信息
     * @returns 数据统计信息对象
     */
    getStats() {
        const keys = this.getKeys();
        const stats = {
            totalKeys: keys.length,
            totalSize: 0,
            encryptedSize: 0,
            keyTypes: {} as Record<string, string>
        };

        keys.forEach(key => {
            const value = this.getItem(key);
            if (value !== null) {
                stats.totalSize += value.length;
                
                try {
                    // 尝试解密并推断数据类型
                    const decryptedValue = this.decrypt(value);
                    stats.encryptedSize += decryptedValue.length;
                    
                    try {
                        const jsonValue = JSON.parse(decryptedValue);
                        if (Array.isArray(jsonValue)) {
                            stats.keyTypes[key] = 'array';
                        } else {
                            stats.keyTypes[key] = 'object';
                        }
                    } catch {
                        const numValue = Number.parseFloat(decryptedValue);
                        if (!isNaN(numValue) && decryptedValue === numValue.toString()) {
                            stats.keyTypes[key] = Number.isInteger(numValue) ? 'integer' : 'float';
                        } else if (decryptedValue === 'true' || decryptedValue === 'false') {
                            stats.keyTypes[key] = 'boolean';
                        } else {
                            stats.keyTypes[key] = 'string';
                        }
                    }
                } catch (error) {
                    stats.keyTypes[key] = 'encrypted';
                }
            }
        });

        return stats;
    }

    // ==================== 加密相关方法 ====================

    /**
     * 使用CryptoES.AES加密字符串
     * @param value 要加密的字符串
     * @returns 加密后的字符串
     */
    private encrypt(value: string): string {
        try {
            // 使用CryptoES.AES加密
            const encrypted = CryptoES.AES.encrypt(value, this._encryptKey, {
                iv: CryptoES.enc.Hex.parse(this._iv),
                mode: CryptoES.mode.CBC,
                padding: CryptoES.pad.Pkcs7
            });
            return encrypted.toString();
        } catch (error) {
            log.error('Encryption failed:', error);
            return value; // 加密失败时返回原值
        }
    }

    /**
     * 使用CryptoES.AES解密字符串
     * @param encryptedValue 要解密的字符串
     * @returns 解密后的字符串
     */
    private decrypt(encryptedValue: string): string {
        try {
            // 使用CryptoES.AES解密
            const decrypted = CryptoES.AES.decrypt(encryptedValue, this._encryptKey, {
                iv: CryptoES.enc.Hex.parse(this._iv),
                mode: CryptoES.mode.CBC,
                padding: CryptoES.pad.Pkcs7
            });
            return decrypted.toString(CryptoES.enc.Utf8);
        } catch (error) {
            log.error('Decryption failed:', error);
            throw error;
        }
    }

    /**
     * 填充密钥到指定长度
     * @param key 原始密钥
     * @param length 目标长度
     * @returns 填充后的密钥
     */
    private padKey(key: string, length: number): string {
        if (key.length >= length) {
            return key.substring(0, length);
        }
        
        // 如果密钥长度不足，用0填充
        while (key.length < length) {
            key += '0';
        }
        return key;
    }

    /**
     * 获取当前使用的加密密钥（用于调试）
     * @returns 当前加密密钥
     */
    getEncryptKey(): string {
        return this._encryptKey;
    }

    /**
     * 设置新的加密密钥
     * @param newKey 新的加密密钥
     */
    setEncryptKey(newKey: string) {
        this._encryptKey = this.padKey(newKey, 32);
        log.info('Encryption key updated');
    }

    /**
     * 获取当前使用的初始化向量（用于调试）
     * @returns 当前初始化向量
     */
    getIV(): string {
        return this._iv;
    }

    /**
     * 设置新的初始化向量
     * @param newIV 新的初始化向量
     */
    setIV(newIV: string) {
        this._iv = this.padKey(newIV, 16);
        log.info('Initialization vector updated');
    }

    /**
     * 验证加密配置
     * @returns 配置是否有效
     */
    validateEncryptionConfig(): boolean {
        try {
            const testValue = 'test_encryption';
            const encrypted = this.encrypt(testValue);
            const decrypted = this.decrypt(encrypted);
            return decrypted === testValue;
        } catch (error) {
            log.error('Encryption configuration validation failed:', error);
            return false;
        }
    }

    /**
     * 获取加密算法信息
     * @returns 加密算法信息对象
     */
    getEncryptionInfo() {
        return {
            algorithm: 'AES-256-CBC',
            keyLength: this._encryptKey.length,
            ivLength: this._iv.length,
            padding: 'PKCS7',
            mode: 'CBC'
        };
    }
} 