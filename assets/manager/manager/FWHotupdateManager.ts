import { _decorator, assert, assetManager, AudioClip, AudioSource, BlockInputEvents, color, Component, director, Eventify, EventTouch, js, native, Node, Pool, RenderRoot2D, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { FWBaseManager } from "./base/FWBaseManager";
import { func } from '../../common/FWFunction';
import { log, FWPath } from '../../common';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;

/** js 系统 */
const system_js = self["System"];
/**类注册缓存 */
const script_cache_tab: Record<string, any> = system_js[Reflect.ownKeys(system_js).find((v) => typeof v === "symbol")];
@ccclass('FWHotupdateManager')
export class FWHotupdateManager extends FWBaseManager {
    /**文件搜索路径优先级 */
    private _searchPaths: string[] = func.isNative() ? native.fileUtils.getSearchPaths() : [];
    // 重写静态实例类型
    protected static _instance: FWHotupdateManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWHotupdateManager {
        if (!FWHotupdateManager._instance) {
            FWHotupdateManager._instance = new FWHotupdateManager();
        }
        return FWHotupdateManager._instance;
    }

    constructor() {
        super();
        if (func.isNative()) {
            let path = FWPath.join(native.fileUtils.getWritablePath(),"HotUpdate");
            this.addSearchPaths([path]);
        }
    }

    /**
     * 刷新搜索路径（去重处理）
     * @param searchPaths 搜索路径
     */
    refreshSearchPaths(searchPaths?: string[]): void {
        if (!func.isNative()) {
            return;
        }
        if (!EDITOR) {
            searchPaths = searchPaths || native.fileUtils.getSearchPaths();
            //规范化路径
            searchPaths = searchPaths.map(path => FWPath.normalize(path));
            //去重
            searchPaths = Array.from(new Set(searchPaths));
            //重新调整搜索路径
            native.fileUtils.setSearchPaths(searchPaths);
            this._searchPaths = searchPaths;
            //打印
            log.info(`HotUpdateSearchPaths :`, searchPaths);
            //缓存热更搜索路径
            localStorage.setItem(`HotUpdateSearchPaths`, JSON.stringify(searchPaths));
        }
    }

    /**
     * 添加（往前添加）
     * @param newSearchPaths 新搜索路径
     * @returns 搜索路径
     */
    addSearchPaths(newSearchPaths: string[]): string[] {
        let searchPaths = [];
        if (!EDITOR) {
            //获取当前搜索路径表
            searchPaths = native.fileUtils.getSearchPaths();
            log.info(`addSearthPaths :`, newSearchPaths);
            //打印old
            log.info(`HotUpdateSearchPaths old:`, searchPaths);
            //将热更路径表添加到最前面
            Array.prototype.unshift.apply(searchPaths, newSearchPaths);
            //重新调整搜索路径
            this.refreshSearchPaths(searchPaths);
        }
        return searchPaths;
    }
    /** 
     * 恢复搜索路径优先级 
     * */
    resumeSearchPaths() {
        this.refreshSearchPaths(this._searchPaths);
    }
    /**
     * 获取搜索路径
     * @returns 
     */
    getSearchPaths() {
        return this._searchPaths;
    }
    /**
     * 检测路径下是否存在_temp目录，如果存在则将_temp目录下的文件复制到storagePath目录下
     */
    checkTemp(storagePath:string) {
        if (!func.isNative()) {
            return;
        }
        var fileList = [];
        var storagePath = FWPath.normalize(storagePath);
        var tempPath = storagePath + '_temp/';
        var baseOffset = tempPath.length;
        if (native.fileUtils.isDirectoryExist(tempPath) && !native.fileUtils.isFileExist(tempPath + 'project.manifest.temp')) {
            native.fileUtils.listFilesRecursively(tempPath, fileList);
            fileList.forEach(srcPath => {
                var relativePath = srcPath.substr(baseOffset);
                var dstPath = storagePath + relativePath;

                if (srcPath[srcPath.length] == '/') {
                    native.fileUtils.createDirectory(dstPath)
                }
                else {
                    if (native.fileUtils.isFileExist(dstPath)) {
                        native.fileUtils.removeFile(dstPath)
                    }
                    native.fileUtils.renameFile(srcPath, dstPath);
                }
            })
            native.fileUtils.removeDirectory(tempPath);
        }
    }
    /**
     * 卸载缓存子包脚本 
    */
    unloadBundleScriptCache(bundleName: string) {
        if (!func.isNative()) {
            //刷新子包脚本配置
            log.info(`unloadBundleScriptCache: ${bundleName} begin`);
            //删除下载的代码缓存
            assetManager.downloader.removeDownloadScriptCache?.(`assets/${bundleName}/index.js`);
            let prerequisiteImportsKey = `virtual:///prerequisite-imports/${bundleName}`
            let virtualKey = `chunks:///_virtual/${bundleName}`
            let bundle_root = script_cache_tab[virtualKey]
            let unregisterClassArray: Function[] = []
            if (bundle_root) {
                bundle_root.d.forEach((v: { id: string, C: {} }) => {
                    let C = v.C;
                    //获取卸载的class
                    for (const key in C) {
                        let val = C[key];
                        if (val instanceof Function) {
                            unregisterClassArray.push(val)
                        }
                    }
                    delete script_cache_tab[v.id];
                    delete system_js["registerRegistry"][v.id];
                });
                delete script_cache_tab[virtualKey];
                delete system_js["registerRegistry"][virtualKey];
                delete script_cache_tab[prerequisiteImportsKey];
                delete system_js["registerRegistry"][prerequisiteImportsKey];
            }
            js.unregisterClass(...unregisterClassArray);
        }
    }

}

declare global {
    namespace globalThis {
        interface IFWManager {
            hotupdate : FWHotupdateManager
        }
    }
}