import { __private, _decorator, Asset, assetManager, AssetManager, Component, Constructor, Eventify, EventTarget, instantiate, js, Node } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { func } from '../../common/FWFunction';
import { EDITOR, NATIVE } from 'cc/env';
import { log } from '../../common';
const { ccclass, property } = _decorator;

/**
 * 子包加载数据接口
 */
interface IBundleData {
    /** 子包名称 */
    name: string;
    /** 加载选项，包含版本等信息 */
    option?: {
        [k: string]: any;
        /** 资源版本号 */
        version?: string;
    };
    /** 加载完成回调 */
    onComplete?:(err: Error,bundle:FWBundle)=>void;
}

/**
 * 资源管理器类
 * 负责管理游戏资源的加载、缓存和释放
 */
@ccclass('FWAssetManager')
export class FWAssetManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWAssetManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWAssetManager {
        if (!FWAssetManager._instance) {
            FWAssetManager._instance = new FWAssetManager();
        }
        return FWAssetManager._instance;
    }
    
    /** loadRemote缓存 - 存储远程加载的资源 */
    private loadRemoteCache: Map<string, Asset> = new Map();
    
    /** 子包版本缓存 - 存储各子包的版本信息 */
    private bundleVersion: Map<string, string> = new Map();

    /** 已加载的子包缓存 */
    private bundles:Map<string,FWBundle> = new Map();

    start() {
        /**
         * 初始化内置子包
         */
        let fwBundle = new FWBundle(assetManager.main);
        this.bundles.set('main',fwBundle);
        fwBundle = new FWBundle(assetManager.resources);
        this.bundles.set('resources',fwBundle);
    }
    
    /**
     * 加载子包
     * @param data 子包加载配置数据
     * @returns Promise<FWBundle> 返回加载完成的子包对象
     */
    loadBundle(data:IBundleData) {
        let {name : bundleName,option = {},onComplete} = data;
        return func.doPromise<FWBundle>((resolve, reject) => {
            // 检查是否已经加载过该子包
            const cacheBundle = this.getBundle(bundleName);
            if (cacheBundle) {
                resolve(cacheBundle);
            } else {
	            // 加载对应版本的资源包
	            // 不存在就用上一次加载的版本
	            if (this.bundleVersion.has(bundleName)) {
	                option.version = this.bundleVersion.get(bundleName);
	            }
                assetManager.loadBundle(bundleName, option, (err, bundle) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (this.bundles.has(bundleName)) {
                            resolve(this.bundles.get(bundleName));
                        } else {
                            // 创建自定义子包对象并缓存
                            let fwBundle = new FWBundle(bundle);
                            this.bundles.set(bundleName,fwBundle);
                            resolve(fwBundle)
                        }
                    }
                });
            }
        })
        .then((bundle)=>{
            // fw.language.addBundleAutoLanguageConfig(tempName);
            onComplete?.(null,bundle);
            return Promise.resolve(bundle);
        })
        .catch((err: Error)=>{
            onComplete?.(err,null);
            return Promise.reject(err);
        });
    }
    
    /**
     * 获得已加载的子包
     * @param bundleName 子包名称
     * @returns FWBundle | undefined 返回已加载的子包对象，未加载则返回undefined
     */
    getBundle(bundleName: string) {
        return this.bundles.get(bundleName);
    }
    
    /**
     * 卸载子包
     * @param nameOrBundle 子包名称或子包对象，支持单个或数组
     */
    unloadBundle(nameOrBundle: (string | AssetManager.Bundle) | (string | AssetManager.Bundle)[]) {
        // 统一转换为子包名称数组
        let bundleNames = ((nameOrBundle instanceof Array) ? nameOrBundle : [nameOrBundle]).map(element => element instanceof AssetManager.Bundle ? element.name : element);
        bundleNames.forEach(bundleName=>{
            // 删除对应资源引用计数
            let fwBundle = this.getBundle(bundleName)
            if (fwBundle) {
                this.bundles.delete(bundleName);
                fwBundle._onDestroy();
            }
        })
    }

    /**
     * 获取已加载的资源
     * @param path 资源路径
     * @param type 资源类型
     * @returns T | null 返回资源对象，未找到则返回null
     */
    get<T extends Asset>(path: string, type?: Constructor<T> | null): T | null {
        let {bundleName,assetPath} = this.__parsePath(path);
        return this.getBundle(bundleName).get(assetPath,type)
    }

    /**
     * 加载资源
     * @param path 资源路径
     * @param type 资源类型
     * @returns Promise<T> 返回加载完成的资源
     */
    load<T extends Asset>(path: string, type?: Constructor<T> | null): Promise<T> {
        let {bundleName,assetPath} = this.__parsePath(path);
        return func.doPromise<T>((resolve,reject)=>{
            this.loadBundle({name:bundleName,onComplete:(err,bundle)=>{
                if(err) {
                    reject(err)
                } else {
                    bundle.load({paths:assetPath,assetType:type,onComplete:(err,data)=>{
                        if(err) {
                            reject(err)
                        } else {
                            resolve(data as T)
                        }
                    }})
                }
            }})
        })
    }
    /**
     * 解析资源路径
     * @param path 资源路径 bundleName://assetPath
     * @returns {bundleName: string, assetPath: string} 资源路径
     */
    __parsePath(path: string) {
        // Check if path starts with bundleName://
        if (path.includes('://')) {
            // Extract bundle name and asset path
            const [bundleName, assetPath] = path.split('://');
            return {bundleName, assetPath};
        }
        // 默认走resources
        const bundleName = 'resources';
        const assetPath = path;
        return {bundleName,assetPath}
    }
}

/**
 * 资源加载数据接口
 */
interface IAssetData<T extends Asset> {
    /** 资源路径，支持单个路径或路径数组 */
    paths: string|string[];
    /** 资源类型构造函数 */
    assetType?: Constructor<T>;
    /** 加载进度回调 */
    onProgress?:(finished: number, total: number, item: AssetManager.RequestItem|null) => void;
    /** 加载完成回调 */
    onComplete?:(err: Error | null, data: T|T[]) => void;
}

/**
 * 自定义子包类
 * 封装了Cocos Creator的AssetManager.Bundle，提供更便捷的资源管理功能
 */
export class FWBundle {
    /** loadBundleRes缓存 - 存储已加载的资源引用 */
    resCache: Map<string, Asset> = new Map()
    
    /** 原始子包对象 */
    bundle:AssetManager.Bundle;
    
    constructor(bundle:AssetManager.Bundle) {
        this.bundle = bundle;
    }
    
    /**
     * 动态加载目录下的所有资源
     * @param data 加载配置数据
     * @returns Promise<T[]> 返回加载完成的资源数组
     */
    loadDir<T extends Asset>(data:IAssetData<T>) {
        let {paths,assetType,onProgress,onComplete} = data;
        paths = Array.isArray(paths) ? paths : [paths];
        
        // 获取目录下所有资源的地址信息
        let info:__private._cocos_asset_asset_manager_config__IAddressableInfo[] = [];
        paths.forEach(v=>this.bundle.getDirWithPath(v,assetType,info));
        let total = info.length;
        
        // 并行加载所有资源
        return func.dosomething(info.map(v=>{
            return () => this.load({
                paths:v.path,
                assetType:v.ctor,
            }) as Promise<T>
        }),(finished: number, failCount: number)=>{
            onProgress?.(finished+failCount,total,null);
        }).then((data:T[]|Error[])=>{
            // 过滤掉加载失败的资源
            let ret:T[] = []
            data.forEach((v:T|Error) => {
                if( v instanceof Error == false) {
                    ret.push(v);
                }
            })
            onComplete?.(null,ret);
            return Promise.resolve(ret)
        })
    }

    /**
     * 动态加载单个或多个资源
     * 注意：动态加载的资源需要手动释放或者卸载子包自动释放
     * @param data 加载配置数据
     * @returns Promise<T | T[]> 返回加载完成的资源
     */
    load<T extends Asset>(data:IAssetData<T>) {
        let {paths,assetType,onProgress,onComplete} = data;
        let __outputAsArray__ = false
        let inputPaths = Array.isArray(paths) ? (__outputAsArray__ = true) && paths : [paths];
        
        return func.doPromise<T | T[]>((resolve,reject)=>{
            this.bundle.load(inputPaths,assetType,onProgress,(err: Error | null, data: T[]) =>{
                if (err) {
                    onComplete?.(err,null);
                    reject(err);
                } else {
                    // 缓存加载的资源
                    for (let index = 0; index < inputPaths.length; index++) {
                        this._cacheRes<T>(inputPaths[index],assetType,data[index])
                    }
                    if (__outputAsArray__) {
                        onComplete?.(null,data);
                        resolve(data);
                    } else {
                        onComplete?.(null,data[0]);
                        resolve(data[0]);
                    }
                }
            })
        });
    }

    /**
     * 获取已加载的资源
     * @param path 资源路径
     * @param type 资源类型
     * @returns T | null 返回资源对象，未找到则返回null
     */
    get<T extends Asset>(path: string, type?: Constructor<T> | null): T | null {
        return this.bundle.get(path,type)
    }

    /**
     * 缓存资源引用
     * @param path 资源路径
     * @param assetType 资源类型
     * @param res 资源对象
     */
    private _cacheRes<T extends Asset>(path: string,assetType: Constructor<T>, res: Asset) {
        let info = this.bundle.getInfoWithPath(path,assetType)
        if( info ) {
            let uuid = info.uuid;
            if (!this.resCache.has(uuid)) {
                this.resCache.set(uuid,res);
                res.addRef(); // 增加引用计数
            }
        }
    }

    /**
     * 释放指定资源
     * 注意：这里释放存在问题，相同路径可能存在多个资源
     * @param paths 资源路径
     * @param assetType 资源类型
     */
    release<T extends Asset>(path: string,assetType: Constructor<T>) {
        let info = this.bundle.getInfoWithPath(path,assetType)
        if( info ) {
            let uuid = info.uuid;
            let res = this.resCache.get(uuid);
            if (res) {
                this.resCache.delete(uuid);
                res.decRef(false); // 减少引用计数
            }
            this.bundle.release(path,assetType);
        }
    }
    
    /**
     * 释放整个子包
     */
    destroy() {
        app.manager.asset.unloadBundle(this.bundle.name);
    }

    /**
     * 内部销毁方法
     * 清理资源引用、释放子包、发送事件通知
     */
    _onDestroy() {
        let bundleName = this.bundle.name;
        
        // 清理所有缓存的资源引用
        this.resCache.forEach(res=>res.decRef(false));
        this.resCache.clear();

        log.info(`unloadBundle: ${bundleName}`);
        
        //释放资源
        this.bundle.releaseUnusedAssets();
        
        //卸载子包
        assetManager.removeBundle(this.bundle);
        
        //清理自动添加的多语言配置
        // fw.language.delBundleAutoLanguageConfig(bundleName);
        
        // 发送子包释放事件
        app.manager.event.emit(app.manager.event.events.ON_BUNDLE_RELEASE,bundleName);
        log.info(`unloadBundle end: ${bundleName}`);
    }
}

/**
 * 全局类型声明扩展
 */
declare global {
    namespace globalThis {
        interface IFWManager {
            asset : FWAssetManager
        }
    }
}
