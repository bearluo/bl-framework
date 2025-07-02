import { _decorator, error, game, native, EventTarget } from 'cc';
import { log } from '../common/FWLog';
import CryptoES from 'crypto-es';
import { FWFile } from '../common/FWFile';
import { func } from '../common/FWFunction';
import { FWHttp, HttpResponse } from '../network';

/**
 * 热更新事件类型定义
 */
const HotUpdateEvent = {
    /** 下载进度事件 */
    Progress: `HotUpdateProgress`,
    /** 下载完成事件 */
    Complete: `HotUpdateComplete`,
}

/**
 * C++ 原生层事件枚举定义
 */
enum EventCode {
    /** 本地 manifest 文件不存在 */
    ERROR_NO_LOCAL_MANIFEST = 0,
    /** 下载 manifest 文件失败 */
    ERROR_DOWNLOAD_MANIFEST = 1,
    /** manifest 文件解析失败 */
    ERROR_PARSE_MANIFEST = 2,
    /** 发现新版本 */
    NEW_VERSION_FOUND = 3,
    /** 当前已是最新版本 */
    ALREADY_UP_TO_DATE = 4,
    /** 更新进度 */
    UPDATE_PROGRESSION = 5,
    /** 资源更新完成 */
    ASSET_UPDATED = 6,
    /** 资源更新失败 */
    ERROR_UPDATING = 7,
    /** 更新完成 */
    UPDATE_FINISHED = 8,
    /** 更新失败 */
    UPDATE_FAILED = 9,
    /** 资源解压失败 */
    ERROR_DECOMPRESS = 10
};

/**
 * 热更新监听器接口定义
 */
export interface IHotUpdateLister {
    /**
     * 无需更新时的回调
     * @param am 热更新管理器实例
     */
    notUpdate: (am?: FWHotUpdate) => void;
    
    /**
     * 热更新失败时的回调
     * @param am 热更新管理器实例
     * @param error 错误信息
     */
    updateFail: (am?: FWHotUpdate, error?: string) => void;
    
    /**
     * 热更新成功时的回调
     * @param am 热更新管理器实例
     */
    updateSuccess: (am?: FWHotUpdate) => void;
    
    /**
     * 准备更新
     * @param am 热更新管理器实例
     */
    prepareUpdate: (am?: FWHotUpdate) => void;
    
    /**
     * 下载更新配置失败时的回调
     * @param am 热更新管理器实例
     * @param error 错误信息
     */
    downloadUpdateConfigFail: (am?: FWHotUpdate, error?: string) => void;
}

/**
 * 热更新监听器默认实现类
 */
export class HotUpdateLister implements IHotUpdateLister {
    notUpdate(am: FWHotUpdate) { }
    updateFail(am: FWHotUpdate, error: string) { }
    updateSuccess(am: FWHotUpdate) { }
    prepareUpdate(am: FWHotUpdate) { }
    downloadUpdateConfigFail(am: FWHotUpdate, error: string) { }
}

/**
 * 热更新管理器类
 * 用于处理游戏资源的热更新流程
 * 
 * 注意：
 * 1. 子包更新需要自定义引擎修改 js 代码卸载方式
 * 2. 需要在 jsb-loader.js 中添加以下代码：
 *    downloader.downloadScript = downloadScript;
 *    downloader.removeDownloadScriptCache = function (scriptUrl) {
 *      loadedScripts[scriptUrl] = null;
 *    };
 */
export class FWHotUpdate extends EventTarget {
    /** 检测版本次数（用于调整显示） */
    private checkCount = 0;
    
    /** AssetsManager 实例 */
    private _am: native.AssetsManager = null;
    
    /** Bundle 名称 */
    private _bundleName: string;
    
    /** 热更新缓存路径 */
    private _storagePath: string;
    
    /** 相对路径 */
    private _relativePath: string;
    
    /** project.manifest 文件路径 */
    private _projectManifest: string;
    
    /** 当前处理的热更新配置 */
    private _hConfigs: HotUpdateConfigs;
    
    /** 更新完成回调监听器 */
    private _hLister: IHotUpdateLister;

    /**
     * 获得一个热更对象
     * @重点 完成后需要手动调用destroy的释放对象
     * @param data 热更配置
     * @returns FWHotUpdateManager对象
     */
    public static getOnce(data: HotUpdateConfigs) {
        //实例一个热更对象
        let once = new FWHotUpdate();
        //初始化
        once.init(data);
        //返回实例
        return once;
    }

    /**
     * 获取native.AssetsManager
     */
    get ctrl() {
        return this._am;
    }
    /**初始化（回调通过事件传递，文件头部有注释，需要界面处理的添加事件监听即可） */
    init(config: HotUpdateConfigs) {
        this._hConfigs = config;
        //热更仅在native端生效
        if (!func.isNative()) {
            log.warn(`当前非原生环境`);
            return this;
        }
        //打印当前处理信息
        log.info(`FWHotUpdate HotUpdateConfigs`);
        log.info(`${this._hConfigs}`);
        let bundleName = this._hConfigs.bundleName;
        //resources特殊处理一下
        // if (bundleName == `resources`) {
        //     this._bundleName = `main`;
        //     this._storagePath = `${this._hConfigs.storagePath}${this._bundleName}/`;
        //     this._relativePath = ``;
        // } else {
        //     this._bundleName = bundleName;
        //     this._storagePath = `${this._hConfigs.storagePath}main/assets/${this._bundleName}/`;
        //     this._relativePath = `assets/${this._bundleName}/`;
        // }
        this._storagePath = this._hConfigs.storagePath;
        this._bundleName = bundleName;
        this._projectManifest = `${this._storagePath}/assets/${this._bundleName}/project.manifest`;
        log.info(`热更缓存路径: ${this._storagePath}`);
        log.info(`热更bundleName: ${this._bundleName}`);
        log.info(`热更projectManifest路径: ${this._projectManifest}`);
        //热更监听
        this._hLister = this._hConfigs.lister ?? new HotUpdateLister();
        return this;
    }
    /**设置热更监听 */
    setHotUpdateLister(lister: IHotUpdateLister) {
        this._hLister = lister;
    }
    /**检测是否需要更新 */
    async checkUpdate() {
        /**
         * 浏览器下不执行热更
         */
        if (func.isBrowser()) {
            this._hLister?.notUpdate(this);
            return;
        }
        try {
            //资源热更
            if (!await this.checkResourcesUpdate()) {
                this._hLister?.notUpdate(this);
            }
        } catch (error) {
            log.error(error);
            this._hLister?.updateFail(this, func.getErroMessage(error));
        }
    }
    /**执行热更 */
    public doHotUpdate() {
        log.info(`执行更新`);
        //清理回调
        this.clearCallback();
        //设置回调
        this._am.setEventCallback(this.updateCb.bind(this));
        //执行更新
        this._am.update();
    }
    /**本地回调 */
    checkCb(event: native.EventAssetsManager) {
        let bError = false;
        let bDoUpdate = false;
        switch (event.getEventCode()) {
            case EventCode.ERROR_NO_LOCAL_MANIFEST:
                log.error(`本地manifest文件未找到~`);
                bError = true;
                break;
            case EventCode.ERROR_DOWNLOAD_MANIFEST:
                log.error(`下载manifest发生错误~`);
                bError = true;
                break;
            case EventCode.ERROR_PARSE_MANIFEST:
                log.error(`解析manifest发生错误~`);
                bError = true;
                break;
            case EventCode.ALREADY_UP_TO_DATE:
                log.info(`已经是最新版本了~`);
                break;
            case EventCode.NEW_VERSION_FOUND:
                this._am.prepareUpdate();
                log.info(`发现新版本~`);
                log.info(`需更新的包体大小为: ${Math.ceil(this._am.getTotalBytes() / 1024)}kb`);
                bDoUpdate = this._am.getTotalBytes() > 0;
                break;
            default:
                log.info(`热更checkCb code : ${event.getEventCode()}`);
                return;
        }
        //清理回调
        this.clearCallback();
        //版本文件处理是否失败
        if (bError) {
            log.error(`更新失败：manifest文件处理失败`, event.getMessage());
            this._hLister?.downloadUpdateConfigFail(this, event.getMessage());
        } else {
            //执行更新 或者 执行回调
            if (bDoUpdate) {
                this._hLister?.prepareUpdate(this);
            } else {
                this._hLister?.notUpdate(this);
            }
        }
    }
    /**热更回调 */
    updateCb(event: native.EventAssetsManager) {
        let failed = false;
        let successed = false;
        switch (event.getEventCode()) {
            case EventCode.ERROR_NO_LOCAL_MANIFEST:
                failed = true;
                log.error(`本地manifest文件未找到~`);
                break;
            case EventCode.UPDATE_PROGRESSION:
                //print(`byteProgress : ${event.getPercent()}`);
                //print(`fileProgress : ${event.getPercentByFile()}`);
                //print(`${event.getDownloadedFiles()} / ${event.getTotalFiles()}`);
                //print(`${event.getDownloadedBytes()} / ${event.getTotalBytes()}`);
                //事件通知
                // this._lastFWDispatchEventParam = {
                //     event: event,
                //     data: this._hConfigs,
                //     eventName: HotUpdateEvent.Progress,
                // }
                // app.event.dispatchEvent(this._lastFWDispatchEventParam);
                return;
            case EventCode.ERROR_DOWNLOAD_MANIFEST:
                failed = true;
                log.error(`下载manifest发生错误~`);
                break;
            case EventCode.ERROR_PARSE_MANIFEST:
                failed = true;
                log.error(`解析manifest发生错误~`);
                break;
            case EventCode.ALREADY_UP_TO_DATE:
                successed = true;
                log.info(`已经是最新版本了~`);
                break;
            case EventCode.UPDATE_FINISHED:
                successed = true;
                log.info(`更新完成~`);
                this.emit(HotUpdateEvent.Complete,this._hConfigs);
                this._hLister?.updateSuccess(this);
                break;
            case EventCode.UPDATE_FAILED:
                failed = true;
                log.error(`更新失败 : ${event.getMessage()}`);
                this._hLister?.updateFail(this, "update failed");
                break
            case EventCode.ERROR_UPDATING:
                failed = true;
                log.error(`资源更新失败 : ${event.getAssetId()}, ${event.getMessage()}`);
                // //重试
                // this.retry();
                break;
            case EventCode.ERROR_DECOMPRESS:
                failed = true;
                log.error(`解压资源失败 : ${event.getMessage()}`);
                break;
            default:
                log.info(`热更updateCb : ${event.getEventCode()}`);
                return;
        }
    }
    /**强更 */
    checkForceUpdate(): boolean {
        return false;
    }
    /**apk热更 */
    checkApkUpdate() {
        return false;
    }
    /**资源热更 */
    async checkResourcesUpdate() {
        let { nLocalVersion, projectManifest } = await this.getLocalVersion();
        if (this.compareVersion(nLocalVersion)) {
            return false;
        }
        let remoteVersion = this._hConfigs.newVersion;
        let url = `${this._hConfigs.updateUrl}${this._bundleName}/${remoteVersion}/project.manifest`;
        FWHttp.get(url, (error, response:HttpResponse) => {
            if (error) {
                log.error(error);
                this._hLister?.downloadUpdateConfigFail(this, `download fail: ${url}`);
            } else {
                let data = response.data as VersionManifestConfig;
                log.info(data);//初始化
                this.initAssetsManager();
                //加载本地配置，如果版本"小于等于"缓存版本则会使用缓存版本的Manifest文件
                this._am.loadLocalManifest(projectManifest);
                //用来恢复之前的搜索路径
                app.manager.hotupdate.resumeSearchPaths();
                //当前manifest信息
                let manifest = this._am.getLocalManifest();
                if (manifest) {
                    log.info(`manifest info:`);
                    log.info(`version: ${manifest.getVersion()}`);
                    log.info(`packageUrl: ${manifest.getPackageUrl()}`);
                    log.info(`versionFileUrl: ${manifest.getVersionFileUrl()}`);
                    log.info(`manifestFileUrl: ${manifest.getManifestFileUrl()}`);
                }
                //清理回调
                this.clearCallback();
                //设置回调
                this._am.setEventCallback(this.checkCb.bind(this));
                //替换域名
                data.packageUrl = `${this._hConfigs.updateUrl}${this._bundleName}/${remoteVersion}/`;
                data.remoteManifestUrl = `${data.packageUrl}project.manifest`;
                data.remoteVersionUrl = `${data.packageUrl}version.manifest`;

                //加载远程版本文件（自己合成）
                if (!this._am.loadRemoteManifest(new native.Manifest(JSON.stringify(response), this._storagePath))) {
                    this._hLister?.downloadUpdateConfigFail(this, `parse fail: ${url}`);
                }
            }
        });
        return true;
    }
    /**获取本地版本号和文件路径 */
    async getLocalVersion() {
        //版本
        let nLocalVersion: string = `0`;
        //projectManifest解析后的json对象
        let versionConfig: VersionManifestConfig | null;
        //加载资源
        let projectManifest = `${this._relativePath}project.manifest`;
        
        //版本资源配置
        log.info(`load ${this._bundleName}`);
        if (!FWFile.isFileExist(projectManifest)) {
            //没有版本文件初始化一份版本文件
            FWFile.writeStringToFile(`${this._storagePath}project.manifest`,`{"packageUrl": "", "remoteManifestUrl": "", "remoteVersionUrl": "", "version": "0"}`);
        }
        //读取文件内容
        let content = FWFile.getStringFromFile(projectManifest);
        if (content) {
            //解析
            versionConfig = JSON.safeParse(content);
            if (versionConfig) {
                nLocalVersion = versionConfig.version;
            }
        }

        return { nLocalVersion, projectManifest, versionConfig };
    }
    /**
     * 对比本地版本
     * @param oldVersion 缓存版本
     */
    compareVersion(oldVersion: string) {
        log.debug(`compareVersion ${this._bundleName}`);
        log.debug(`newVersion: ${this._hConfigs.newVersion}`, Number(this._hConfigs.newVersion));
        log.debug(`oldVersion: ${oldVersion}`, Number(oldVersion));
        //版本相同或者更新则无需更新
        return Number(oldVersion) >= Number(this._hConfigs.newVersion);
    }
    /**
     * 初始化热更新c++插件
     * @returns 
     */
    initAssetsManager() {
        if (this._am) {
            return;
        }
        //用于测试自定义清单的具有空清单url的初始化
        this._am = new native.AssetsManager(``, this._storagePath, (versionA: string, versionB: string) => {
            /**
             * 设置您自己的版本比较处理程序
             * 当versionA为"传入版本"时，versionB为"缓存版本"
             * 当versionA为"缓存版本"时，versionB为"远程版本"
             * C代码的处理：
             *     （1）用"传入版本"还是用"缓存版本"，"versionA" > "versionB"时用"传入版本"
             *     （2）是否需要更新，"versionA" < "versionB"时执行认定需要更新
             */
            let vA = Number(versionA);
            let vB = Number(versionB);
            if (++this.checkCount > 0) {
                log.debug(`传入版本：${vA}`);
                log.debug(`缓存版本：${vB}`);
            } else {
                log.debug(`当前版本：${vA}`);
                log.debug(`远程版本：${vB}`);
            }
            if (vA > vB) {
                return 1;
            } else if (vA == vB) {
                return 0;
            } else {
                return -1;
            }
        });
        //设置验证回调，但是我们还没有md5 check函数，所以只打印一些消息
        //验证通过返回true，否则返回false
        this._am.setVerifyCallback((path: string, asset: native.ManifestAsset) => {
            // var md5 = calculateMD5(filePath);
            // if (md5 === asset.md5)
            //     return true;
            // else 
            //     return false;
            // 因为还没有md5 check函数，所以直接返回true
            return true;
        });
        //android特殊处理
        if (func.isAndroid()) {
            //当并发任务太多时，一些Android设备可能会减慢下载过程。
            //数值可能不准确，请多做测试，找出最适合您的游戏。
            //最大并发任务数限制为2
            this._am.setMaxConcurrentTask(10);
        }
    }
    /**清理回调 */
    clearData() {
        //清理零时数据
        this.checkCount = 0;
        this._hConfigs = null;
        //清理回调
        this.clearCallback();
        //清理am
        if (this._am) {
            delete this._am;
            this._am = null;
        }
    }
    /**清理回调 */
    clearCallback() {
        this._am?.setEventCallback(() => { });
    }
    /**重试 */
    retry() {
        this._am?.downloadFailedAssets();
    }
    /**清理缓存 */
    deleteCache() {
        log.info(`delete : ${this._storagePath}`);
        if (native.fileUtils?.removeDirectory(this._storagePath)) {
            log.info(`successed`);
        } else {
            log.info(`failed`);
        }
    }
    /**销毁 */
    destroy() {
        this.clearData();
    }
}

/**
 * 热更新配置类型定义
 */
declare global {
    namespace globalThis {
        type HotUpdateConfigs = {
            /** 远程版本号 */
            newVersion: string;
            /** 热更新缓存路径 */
            storagePath: string;
            /** 更新链接前缀 */
            updateUrl: string;
            /** Bundle 名称 */
            bundleName: string;
            /** 更新回调监听器 */
            lister: IHotUpdateLister;
            /** 更新完成回调 */
            callback?: (config: HotUpdateConfigs) => void;
            /** 开始更新回调 */
            startCallback?: (config: HotUpdateConfigs) => void;
        }

        /** 版本清单配置类型定义 */
        type VersionManifestConfig = {
            /** 包体文件下载路径 */
            packageUrl: string;
            /** project 文件下载路径 */
            remoteManifestUrl: string;
            /** version 文件下载路径 */
            remoteVersionUrl: string;
            /** 当前版本号 */
            version: string;
            /** 资源列表 */
            assets: { 
                /** 文件大小 */
                size: number;
                /** MD5 校验值 */
                md5: string;
                /** 是否压缩 */
                compressed?: boolean;
                /** 文件扩展名 */
                extension?: string;
            }[];
        }
    }
}

declare module "cc" {
    namespace AssetManager {
        interface Downloader {
            /**
             * 删除已下载脚本的缓存
             * 注意：需要自行实现 jsb-loader.js 中的卸载方式
             * 实现后需要重新编译生成：npm run build:adapter
             */
            removeDownloadScriptCache?: (scriptUrl: string) => void;
            
            /**
             * 所有 Bundle 的版本信息
             * @engineInternal
             */
            bundleVers: Record<string, string> | null;
        }
    }
}