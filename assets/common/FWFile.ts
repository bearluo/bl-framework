import { _decorator, Component, native, Node, sys } from 'cc';
const { ccclass, property } = _decorator;

import CryptoES from 'crypto-es';
import { log } from './FWLog';
import { constant } from './FWConstant';

/**
 * localStorage 错误类型
 */
enum LocalStorageError {
    DISABLED = 'localStorage_disabled',
    QUOTA_EXCEEDED = 'quota_exceeded',
    UNKNOWN = 'unknown_error'
}

/**
 * @class FWFile
 * @description 文件操作工具类，提供文件的读写、加密解密等功能
 * 支持原生平台和Web平台的文件操作
 */
@ccclass('FWFile')
export class FWFile {
    /** 文件存储键前缀 */
    static fileKey = '_file_';

    /**
     * 加密字符串
     * @param string 需要加密的字符串
     * @returns 加密后的字符串
     */
    static encrypt(string: string) {
        return CryptoES.AES.encrypt(string, constant.encrypt_key).toString(CryptoES.enc.Utf8);
    }

    /**
     * 解密字符串
     * @param string 需要解密的字符串
     * @returns 解密后的字符串
     */
    static decrypt(string: string) {
        return CryptoES.AES.decrypt(string, constant.encrypt_key).toString(CryptoES.enc.Utf8);
    }

    /**
     * 将字符串写入文件
     * @param path 文件路径
     * @param data 要写入的字符串数据
     * @returns 是否写入成功
     */
    static writeStringToFile(path:string,data: string) {
        return FWFile.writeFile(path,data);
    }

    /**
     * 从文件读取字符串
     * @param path 文件路径
     * @returns 读取的字符串内容
     */
    static getStringFromFile(path:string) {
        return FWFile.readFile(path) as string;
    }

    /**
     * 检查文件是否存在
     * @param path 文件路径
     * @returns 文件是否存在
     */
    static isFileExist(path:string) {
        if(sys.isNative) {
            return native.fileUtils.isFileExist(path);
        } else {
            return FWFile.getItem(path) !== null;
        }
    }

    /**
     * 检查 localStorage 是否可用
     * @returns {boolean} localStorage是否可用
     */
    private static checkLocalStorageAvailable(): boolean {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            log.info('localStorage不可用:', e);
            return false;
        }
    }

    /**
     * 存储数据到本地存储
     * @param key 存储键
     * @param value 存储值
     * @throws {Error} 当localStorage不可用或存储空间已满时抛出异常
     */
    private static setItem(key: string, value: string) {
        try {
            if (!this.checkLocalStorageAvailable()) {
                throw new Error(LocalStorageError.DISABLED);
            }
            sys.localStorage.setItem(FWFile.fileKey + key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                // 存储空间已满
                log.info('localStorage存储空间已满:', e);
                throw new Error(LocalStorageError.QUOTA_EXCEEDED);
            } else if (e.message === LocalStorageError.DISABLED) {
                // localStorage 被禁用
                log.info('localStorage被禁用');
                throw e;
            } else {
                // 其他未知错误
                log.info('localStorage未知错误:', e);
                throw new Error(LocalStorageError.UNKNOWN);
            }
        }
    }

    /**
     * 从本地存储获取数据
     * @param key 存储键
     * @returns 存储的值
     * @throws {Error} 当localStorage不可用时抛出异常
     */
    private static getItem(key: string) {
        try {
            if (!this.checkLocalStorageAvailable()) {
                throw new Error(LocalStorageError.DISABLED);
            }
            return sys.localStorage.getItem(FWFile.fileKey + key);
        } catch (e) {
            log.info('localStorage读取错误:', e);
            throw e;
        }
    }

    /**
     * 获取文件所在目录路径
     * @param filePath 文件完整路径
     * @returns 目录路径
     */
    private static getFilePathDir(filePath: string): string {
        return filePath.replace(filePath.match(/[^\\/]+\.?[^.\\/]+$/)[0], ``);
    }

    /**
     * 写入文件
     * @param path 文件路径
     * @param data 要写入的数据（字符串或二进制数据）
     * @returns 是否写入成功
     */
    static writeFile(path: string, data: string | ArrayBuffer) {
        if(sys.isNative) {
            // 原生平台：使用文件系统API
            let finalPath = native.fileUtils.getWritablePath() + path;
            let fileDir = FWFile.getFilePathDir(finalPath);
            if (!native.fileUtils.isDirectoryExist(fileDir) && !native.fileUtils.createDirectory(fileDir)) {
                log.info(`writeDataToFile error createDirectory fileDir : `, fileDir);
                return false;
            }
            if (data instanceof ArrayBuffer) {
                native.fileUtils.writeDataToFile(data, finalPath);
            }else {
                native.fileUtils.writeStringToFile(data, finalPath);
            }
        } else {
            // Web平台：使用localStorage存储
            try {
                if (data instanceof ArrayBuffer) {
                    FWFile.setItem(path, CryptoES.enc.Base64.stringify(CryptoES.lib.WordArray.create(data)));
                } else {
                    FWFile.setItem(path, data);
                }
            } catch (e) {
                log.info('Web平台存储失败:', e);
                return false;
            }
        }
        return true;
    }

    /**
     * 读取文件
     * @param path 文件路径
     * @param bByte 是否以二进制方式读取
     * @returns 文件内容（字符串或二进制数据）
     */
    static readFile(path: string, bByte=false) {
        if(sys.isNative) {
            // 原生平台读取
            if (bByte) {
                return native.fileUtils.getDataFromFile(path);
            }else {
                return native.fileUtils.getStringFromFile(path);
            }
        } else {
            // Web平台读取
            try {
                if (bByte) {
                    const data = FWFile.getItem(path);
                    return data ? new Uint8Array(CryptoES.enc.Base64.parse(data).words).buffer : null;
                } else {
                    return FWFile.getItem(path);
                }
            } catch (e) {
                log.info('Web平台读取失败:', e);
                return null;
            }
        }
    }

    /**
     * 浏览器端保存文件（触发下载）
     * @param data 要保存的数据
     * @param fileName 文件名
     */
    static async save(data:string,fileName?:string) {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 浏览器端读取文件（打开文件选择器）
     * @returns Promise<string> 文件内容
     */
    static async read() {
        // @ts-ignore
        const fileHandle = await window.showOpenFilePicker();
        const file = await fileHandle[0].getFile() as File;
        return await new Promise((resolve: (value: string) => void, reject: (reason?: any) => void)=>{
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result.toString());
            };
            reader.readAsText(file);
        })
    }
}
