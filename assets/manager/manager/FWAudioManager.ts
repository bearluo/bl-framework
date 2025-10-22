import { _decorator, AudioClip, AudioSource, Component, director, log, Node, Pool } from 'cc';
import { FWBaseManager } from './base/FWBaseManager';
import { EDITOR } from 'cc/env';
const { ccclass, property } = _decorator;


/**
 * 音频管理器类
 * 负责管理游戏中的背景音乐和音效播放
 * 提供音频资源的加载、播放、停止等功能
 */
@ccclass('FWAudioManager')
export class FWAudioManager extends FWBaseManager {
    // 重写静态实例类型
    protected static _instance: FWAudioManager | null = null;
    
    /**
     * 获取音频管理器单例实例
     * @returns FWAudioManager 音频管理器实例
     */
    public static get instance(): FWAudioManager {
        if (!FWAudioManager._instance) {
            FWAudioManager._instance = new FWAudioManager();
        }
        return FWAudioManager._instance;
    }

    /** 背景音乐节点 */
    private _bgmNode: Node;
    /** 音效节点 */
    private _sfxNode: Node;
    /** 背景音乐音频源组件 */
    private _bgm: AudioSource;
    /** 音效音频源映射表，键为音频片段，值为音频源组件 */
    private _sfx: Map<AudioClip, AudioSource> = new Map();
    /** 音效音频源对象池，用于复用音频源组件 */
    private _sfxPool:Pool<AudioSource>

    /**
     * 预加载方法
     * 在编辑器预览模式或非编辑器环境下创建音频节点
     */
    __preload(): void {
        if(EDITOR && globalThis.isPreviewProcess) {
            this.createAudioNode();
        }else if(!EDITOR) {
            this.createAudioNode();
        }
    }

    /**
     * 启动方法
     * 监听背景音乐音量变化事件
     */
    start() {
        app.manager.event.on(app.manager.event.events.ON_BGM_VOLUME_CHANGED, this.onBgmVolumeChanged, this);
    }

    /**
     * 创建音频节点
     * 初始化背景音乐和音效的节点结构
     */
    createAudioNode() {
        // 创建背景音乐节点
        if(!this._bgmNode) {
            this._bgmNode = new Node("_bgmNode");
            // 为背景音乐节点添加音频源组件
            this._bgm = this._bgmNode.addComponent(AudioSource);
            this._bgm.loop = true; // 设置背景音乐循环播放
        }
        // 创建音效节点
        if(!this._sfxNode) {
            this._sfxNode = new Node("_sfxNode");
            // 创建音效音频源对象池，初始容量为10
            this._sfxPool = new Pool(()=>{
                return this._sfxNode.addComponent(AudioSource)
            }, 10, (obj: AudioSource)=>{
                obj.destroy(); // 对象销毁时的清理函数
            })
        }
        // 将背景音乐节点设置为常驻节点，避免场景切换时被销毁
        director.addPersistRootNode(this._bgmNode);
        // 将音效节点设置为常驻节点，避免场景切换时被销毁
        director.addPersistRootNode(this._sfxNode);
    }

    /**
     * 背景音乐音量变化回调
     * 当背景音乐音量设置改变时更新当前播放的音量
     */
    onBgmVolumeChanged() {
        if (this._bgm) {
            this._bgm.volume = app.manager.data.setting.bgmVolume;
        }
    }

    /**
     * 播放背景音乐
     * @param clip 要播放的音频片段
     */
    playBgm(clip: AudioClip) {
        this._bgm.clip = clip;
        this._bgm.play();
        this._bgm.volume = app.manager.data.setting.bgmVolume // 设置当前音量
    }

    /**
     * 停止背景音乐播放
     */
    stopBgm() {
        this._bgm.stop();
    }

    /**
     * 播放音效
     * @param clip 要播放的音效片段
     * @returns 如果音效未初始化则直接返回
     */
    playSfx(clip: AudioClip) {
        if (!this._sfx.has(clip)) {
            return; // 音效未初始化，无法播放
        }
        let as = this._sfx.get(clip);
        as.volume = app.manager.data.setting.sfxVolume; // 设置音效音量        
        as.play();
    }

    /**
     * 初始化音效
     * 为指定的音频片段创建音频源组件并缓存
     * @param clip 要初始化的音频片段
     * @returns 如果音效已初始化则直接返回
     */
    initSfx(clip: AudioClip) {
        if (this._sfx.has(clip)) {
            return; // 音效已初始化，避免重复创建
        }
        let as = this._sfxPool.alloc(); // 从对象池获取音频源组件
        as.clip = clip;
        this._sfx.set(clip,as); // 缓存音频源组件
    }

    /**
     * 释放音效资源
     * 将音频源组件归还到对象池并清理缓存
     * @param clip 要释放的音频片段
     * @returns 如果音效未初始化则直接返回
     */
    freeSfx(clip: AudioClip) {
        if (!this._sfx.has(clip)) {
            return; // 音效未初始化，无需释放
        }
        let as = this._sfx.get(clip);
        this._sfx.delete(clip); // 从缓存中移除
        this._sfxPool.free(as); // 归还到对象池
    }

    /**
     * 销毁方法
     * 清理所有音效资源并销毁对象池
     */
    onDestroy(): void {
        super.onDestroy();
        // 销毁所有音效音频源组件
        this._sfx.forEach(as=>{
            as.destroy();
        })
        // 销毁音效对象池
        this._sfxPool?.destroy();
    }
}

/**
 * 全局类型声明
 * 扩展全局管理器接口，添加音频管理器类型
 */
declare global {
    namespace globalThis {
        interface IFWManager {
            audio : FWAudioManager
        }
    }
}


