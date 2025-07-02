
// 应用初始化逻辑


import { Director, director, Scene } from 'cc';
import { BUILD, EDITOR, PREVIEW } from 'cc/env';
import { FWApplication } from './FWApplication';
import { FWBaseManager, registerManager, FWAssetManager, FWHotupdateManager, FWAudioManager, FWDataManager, FWEventManager, FWNativeManager, FWSceneManager, FWUIManager } from './manager';


export interface IInitApplicationConfig {
    assetManager?: () => FWBaseManager;
    uiManager?: () => FWBaseManager;
    sceneManager?: () => FWBaseManager;
    nativeManager?: () => FWBaseManager;
    dataManager?: () => FWBaseManager;
    hotupdateManager?: () => FWBaseManager;
    audioManager?: () => FWBaseManager;
    eventManager?: () => FWBaseManager;
}

export function initApplication(config: IInitApplicationConfig = {}) {
    console.log("初始化Application");

    registerManager("asset", config.assetManager ? config.assetManager : () =>  FWAssetManager.instance);
    registerManager("ui", config.uiManager ? config.uiManager : () => FWUIManager.instance);
    registerManager("scene", config.sceneManager ? config.sceneManager : () => FWSceneManager.instance);
    registerManager("native", config.nativeManager ? config.nativeManager : () => FWNativeManager.instance);
    registerManager("data", config.dataManager ? config.dataManager : () => FWDataManager.instance);
    // hotupdate 还未完成，暂时不注册
    // registerManager("hotupdate",config.hotupdateManager ? config.hotupdateManager : () => FWHotupdateManager.instance);
    registerManager("audio", config.audioManager ? config.audioManager : () => FWAudioManager.instance);
    registerManager("event", config.eventManager ? config.eventManager : () => FWEventManager.instance);

    new FWApplication();
}

// 根据不同的运行环境（编辑器、预览、构建）采用不同的初始化策略
if (!BUILD) {
    // 非构建环境下的初始化
    if(EDITOR && globalThis.isPreviewProcess) {
        // 编辑器预览模式：等待场景启动后初始化
        let callback
        callback = (scene:Scene) => {
            if( scene.name != "" ) {
                initApplication()
            } else {
                director.once(Director.EVENT_AFTER_SCENE_LAUNCH, callback)
            }
        }
        director.once(Director.EVENT_AFTER_SCENE_LAUNCH, callback)
    }else if(!EDITOR) {
        // 非编辑器环境：等待场景启动后初始化
        director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            initApplication()
        })
    } else {
        // 编辑器环境：直接初始化
        // console.log("重新初始化Application");
        // console.log(typeof(app) == "undefined");
        // console.log(typeof(app) == "undefined");
    }
} else {
    // 构建环境：用户手动初始化
    // initApplication()
}