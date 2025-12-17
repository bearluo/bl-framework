import { __private, _decorator, assert, Asset, assetManager, AssetManager, Component, Constructor, director, Eventify, EventTarget, instantiate, js, JsonAsset, Node, Prefab, Scene, SceneAsset } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { func, qAsset, uiFunc } from '../../common/FWFunction';
import { NATIVE } from 'cc/env';
import { log } from '../../common';
import { FWBundle } from './FWAssetManager';
import { constant } from '../../common/FWConstant';
import { FWUILoading } from '../../ui';
const { ccclass, property } = _decorator;

/**
 * 预加载JSON数据接口
 */
interface IPreloadJson {
    url:string;
}

/**
 * 场景数据接口 - 定义场景的配置信息
 */
interface ISceneData {
    bundleName?: string;        // 资源包名称
    sceneName?: string;         // 场景名称
    loadPrefab?: string;        // 加载界面预制体路径
    preloadDirsList?: IPreloadJson[];  // 预加载目录列表
    preloadList?: IPreloadJson[];      // 预加载资源列表
    [key:string] : any;         // 其他扩展属性
}

/**
 * 场景队列数据接口 - 用于场景切换队列
 */
interface ISceneQueueData {
    bundleName: string;         // 资源包名称
    sceneName: string;          // 场景名称
}


/**
 * 场景管理器类
 * 负责场景的加载、切换和预加载管理
 */
@ccclass('FWSceneManager')
export class FWSceneManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWSceneManager | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWSceneManager {
        if (!FWSceneManager._instance) {
            FWSceneManager._instance = new FWSceneManager();
        }
        return FWSceneManager._instance;
    }

    /** 场景切换队列 */
    private _queue:ISceneQueueData[] = [];
    /** 是否正在加载场景的标志 */
    private _bLoading:boolean = false;

    /**
     * 切换场景
     * @param bundleName 资源包名称
     * @param sceneName 场景名称
     */
    changeScene(bundleName: string, sceneName: string) {
        this._queue.push({
            bundleName: bundleName,
            sceneName: sceneName,
        });
    }

    /**
     * 更新方法 - 每帧调用，处理场景队列
     * @param deltaTime 帧间隔时间
     */
    update(deltaTime: number) {
        if(!this._bLoading) {
            this._autoLoadScene()
        }
    }

    /**
     * 自动加载场景 - 处理场景队列
     */
    private async _autoLoadScene() {
        let data = this._queue.shift();
        if(data) {
            this._bLoading = true;
            try {
                let scene = await this._LoadScene(data);
                director.runScene(scene);
            } catch (error) {
                log.error(error);
            }
            this._bLoading = false;
        }
    }

    /**
     * 加载场景的核心方法
     * @param data 场景队列数据
     * @returns 加载完成的场景资源
     */
    private async _LoadScene(data:ISceneQueueData) {
        let {bundleName,sceneName} = data;
        
        // 加载资源包
        let bundle = await func.doPromise<FWBundle>((resolve,reject) => {
            app.manager.asset.loadBundle({
                name:bundleName,
                onComplete:(err: Error, bundle:FWBundle)=>{
                    if(err) {
                        reject(err)
                    }else {
                        resolve(bundle)
                    }
                }
            });
        })
        
        // 加载场景配置数据
        let sceneData = await func.doPromise<ISceneData>((resolve,reject) => {
            // 检查是否存在场景配置文件
            if(bundle.bundle.getInfoWithPath(sceneName,JsonAsset)) {
                bundle.load({
                    paths:sceneName,
                    assetType:JsonAsset,
                    onComplete:(err: Error,data:JsonAsset)=>{
                        if(err) {
                            reject(err)
                        }else {
                            resolve(data.json)
                        }
                    }
                });
            } else {
                resolve({})
            }
        })
        
        // 设置场景数据的基本信息
        sceneData.bundleName = bundleName;
        sceneData.sceneName = sceneName;
        
        // 解构场景配置数据
        let {loadPrefab,preloadDirsList=[],preloadList=[]} = sceneData;
        
        // 加载界面预制体
        let prefab = constant.default_loadPrefab;
        if (loadPrefab) {
            prefab = await func.doPromise<Prefab>((resolve,reject) => {
                bundle.load({
                    paths:loadPrefab,
                    assetType:Prefab,
                    onComplete:(err: Error,data:Prefab)=>{
                        if(err) {
                            reject(err)
                        }else {
                            resolve(data)
                        }
                    }
                });
            })
        }
        
        // 创建并显示加载界面
        let uiLoading:FWUILoading
        if(prefab) {
            let obj = instantiate(prefab);
            uiLoading = obj.getComponent(FWUILoading) ?? obj.addComponent(FWUILoading);
            uiFunc.showLoading(uiLoading);
        }

        // 创建资源加载映射表
        let input:Map<string,{
            uuid: string,
            __isNative__: boolean, 
            ext: string, 
            bundle: string
        }> = new Map();

        let assetInfos
        
        // 处理预加载资源列表
        preloadList.forEach(data=>{
            //@ts-ignore 这里是有这个config 的 只是没声明
            assetInfos = bundle.bundle.config.paths.get(data.url);
            assetInfos.forEach(assetInfo=>{
                let {uuid,extension} = assetInfo;
                if(!input.has(uuid)) {
                    input.set(assetInfo.uuid,{ uuid: uuid, __isNative__: false, ext: extension || '.json', bundle: bundleName })
                }
            })
        })

        // 处理预加载目录列表
        preloadDirsList.forEach(data=>{
            assetInfos = bundle.bundle.getDirWithPath(data.url)
            assetInfos.forEach(assetInfo=>{
                let {uuid,extension} = assetInfo;
                if(!input.has(uuid)) {
                    input.set(assetInfo.uuid,{ uuid: uuid, __isNative__: false, ext: extension || '.json', bundle: bundleName })
                }
            })
        })

        // 批量加载所有预加载资源
        await func.doPromise<any>((resolve,reject) => {
            assetManager.loadAny(
                Array.from(input.values()),
                (finished, total, item: AssetManager.RequestItem) => {
                    //加载过程中total会增加因为预设一些资源有依赖项需要加载
                    let newProgress = finished / total;
                    uiLoading?.updateProgress({
                        progress: newProgress,
                        finished: finished,
                        total: total,
                    })
                },
                (err:Error, res) => {
                    if(err) {
                        reject(err);
                    }else {
                        resolve(res);
                    }
                }
            );
        })

        // 加载场景资源
        let scene = await func.doPromise<SceneAsset>((resolve,reject) => {
                bundle.bundle.loadScene(sceneName,(err: Error, data: SceneAsset)=>{
                if(err) {
                    reject(err)
                }else {
                    resolve(data)
                }
            });
        })

        // 隐藏加载界面
        uiLoading?.hide();
        return scene;
    }
}

// 全局类型声明扩展
declare global {
    namespace globalThis {
        interface IFWManager {
            scene : FWSceneManager
        }
    }
}