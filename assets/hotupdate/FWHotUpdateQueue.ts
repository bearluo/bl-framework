import { EventTarget } from "cc"
import { FWHotUpdate, IHotUpdateLister } from "./FWHotUpdate"

/**
 * 更新结束回调数据接口
 */
export interface IEndUpdateCallbackData {
    /** 是否取消更新 */
    isCancelUpdate: boolean
}

/**
 * 热更新队列事件数据接口
 */
export interface IHotUpdateQueueEvent {
    /** 热更新管理器实例 */
    am: FWHotUpdate;
    /** 错误信息 */
    error: string;
}

/**
 * 热更新队列事件类型枚举
 */
export enum HotUpdateQueueEvent {
    /** 更新失败事件 */
    UPDATE_FAIL = "updateFail",
    /** 下载更新配置失败事件 */
    DOWNLOAD_UPDATE_CONFIG_FAIL = "downloadUpdateConfigFail"
}

/**
 * 热更新队列管理器
 * 用于管理多个热更新包的顺序更新流程
 */
export class HotUpdateQueue extends EventTarget {
    /** 需要更新的热更新管理器队列 */
    private needUpdateHotUpdateManagerQueue: FWHotUpdate[];
    
    /** 更新状态标志数组 */
    private needUpdateHotUpdateManagerQueueUpdateFlag: boolean[];
    
    /** 当前正在更新的包索引 */
    private runIndex: number;
    
    /** 更新结束回调函数 */
    private endUpdateCallback: (value: IEndUpdateCallbackData) => void;
    
    /** 初始化更新数量 */
    initUpdateCount: number;

    /**
     * 开始更新流程
     * @param needUpdateHotUpdateManagerQueue 需要更新的热更新管理器数组
     * @returns Promise<IEndUpdateCallbackData> 更新结束回调
     */
    startUpdate(needUpdateHotUpdateManagerQueue: FWHotUpdate[]) {
        return new Promise<IEndUpdateCallbackData>((resolve) => {
            this.endUpdateCallback = resolve;
            this.needUpdateHotUpdateManagerQueue = needUpdateHotUpdateManagerQueue;
            this.needUpdateHotUpdateManagerQueueUpdateFlag = [];
            this.prepareUpdate();
        });
    }

    /**
     * 准备更新内容
     * 为每个热更新管理器设置监听器并开始检查更新
     */
    private prepareUpdate() {
        this.initUpdateCount = 0;
        this.needUpdateHotUpdateManagerQueue.forEach((am, index) => {
            let lister: IHotUpdateLister = {
                /** 更新失败回调 */
                updateFail: (am: FWHotUpdate, error: string) => {
                    this.emit(HotUpdateQueueEvent.UPDATE_FAIL, {
                        am: am,
                        error: error
                    });
                },
                
                /** 无需更新回调 */
                notUpdate: (am: FWHotUpdate) => {
                    this.initUpdateCount++;
                    this.needUpdateHotUpdateManagerQueueUpdateFlag[index] = true;
                    this.startHotUpdate();
                },
                
                /** 更新成功回调 */
                updateSuccess: (am: FWHotUpdate) => {
                    this.needUpdateHotUpdateManagerQueueUpdateFlag[index] = true;
                    this.updateSuccess();
                },
                
                /** 准备更新回调 */
                prepareUpdate: (am: FWHotUpdate) => {
                    this.initUpdateCount++;
                    this.needUpdateHotUpdateManagerQueueUpdateFlag[index] = false;
                    this.startHotUpdate();
                },
                /** 下载更新配置失败回调 */
                downloadUpdateConfigFail: (am: FWHotUpdate, error: string) => {
                    this.emit(HotUpdateQueueEvent.DOWNLOAD_UPDATE_CONFIG_FAIL, {
                        am: am,
                        error: error
                    });
                },
            }
            am.setHotUpdateLister(lister);
            am.checkUpdate();
        });
    }

    /**
     * 检查下一个需要更新的包
     */
    private checkNextUpdate() {
        if (this.runIndex >= this.needUpdateHotUpdateManagerQueue.length) {
            this.endUpdate();
            return;
        }
        if (this.needUpdateHotUpdateManagerQueueUpdateFlag[this.runIndex]) {
            this.updateSuccess();
        } else {
            this.needUpdateHotUpdateManagerQueue[this.runIndex].doHotUpdate();
        }
    }

    /**
     * 更新结束处理
     */
    private endUpdate() {
        this.needUpdateHotUpdateManagerQueue.forEach(v => {
            v.destroy();
        });
        this.endUpdateCallback({
            isCancelUpdate: false
        });
    }

    /**
     * 更新成功处理
     * 移动到下一个包的更新
     */
    private updateSuccess() {
        this.runIndex++;
        this.checkNextUpdate();
    }

    /**
     * 获取所有包的总字节数
     * @returns 总字节数
     */
    public getTotalBytes() {
        let ret = 0;
        this.needUpdateHotUpdateManagerQueue.forEach((am, index) => {
            ret += am.ctrl.getTotalBytes();
        });
        return ret;
    }

    /**
     * 获取所有包已下载的字节数
     * @returns 已下载字节数
     */
    public getDownloadedBytes() {
        let ret = 0;
        this.needUpdateHotUpdateManagerQueue.forEach((am, index) => {
            ret += am.ctrl.getDownloadedBytes();
        });
        return ret;
    }

    /**
     * 执行热更新
     * 当所有包都准备就绪时开始顺序更新
     */
    private startHotUpdate() {
        if (this.initUpdateCount == this.needUpdateHotUpdateManagerQueue.length) {
            this.runIndex = 0;
            this.checkNextUpdate();
        }
    }

    /**
     * 取消更新
     * 清理所有热更新管理器并返回取消状态
     */
    private cancelUpdate() {
        this.needUpdateHotUpdateManagerQueue.forEach(v => {
            v.destroy()
        })
        this.endUpdateCallback({
            isCancelUpdate: true
        });
    }
}