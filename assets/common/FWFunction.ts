import { _decorator, assert, Asset, AudioClip, AudioSource, Button, Component, Constructor, director, EventHandler, instantiate, log, Node, Pool, Prefab, RenderRoot2D, sys, UITransform, Widget } from 'cc';
import { Vec2, v2, Vec3, v3, Vec4, v4 } from 'cc';
import { constant } from './FWConstant';
import { FWUIDialog, FWUILoading } from '../ui';
import { Log } from './FWLog';
import { FWTimer } from './FWTimer';

/**
 * Promise扩展接口
 * @interface PromiseEx
 */
interface PromiseEx {
    /** 是否继续执行Promise，用于中断Promise的执行 */
    shouldContinue: boolean,
}

/**
 * 通用功能类
 * @class Functions
 */
export class Functions {
    /**
     * 创建一个Promise
     * @param executor Promise执行器
     * @returns Promise实例
     */
    static doPromise<T>(executor: (resolve: (value?: T ) => void, reject: (reason?: Error) => void) => void) {
        return <Promise<T>> new Promise<T>((resolveEx, rejectEx) => {
                executor(resolveEx, rejectEx);
            });
    }

    /**
     * 创建一个可中断的Promise
     * @param executor Promise执行器
     * @param data Promise扩展数据
     * @returns Promise实例
     */
    static doPromiseEx<T>(executor: (resolve: (value?: T ) => void, reject: (reason?: Error) => void) => void, data:PromiseEx) {
        return <Promise<T>> new Promise<T>((resolveEx, rejectEx) => {
                if(data.shouldContinue != false) {
                    executor(resolveEx, rejectEx);
                }
            });
    }

    /**
     * 在下一帧执行指定函数
     * @param func 要执行的函数
     */
    static doNextTick(func:(dt?:number)=>void) {
        FWTimer.scheduleOnce(func, app.instance, 0);
    }

    /**
     * 批量执行任务并跟踪进度
     * @param tasks 任务数组
     * @param onProgress 进度回调函数
     * @returns Promise.all的结果
     */
    static dosomething(tasks = [],onProgress?:(finished: number, failCount:number) => void) {
        let successCount = 0, failCount = 0;
        return Promise.all(
            tasks.map(func => {
                return func()
                  .then((res) => {
                      successCount++;
                      onProgress?.(successCount,failCount);
                      return Promise.resolve(res);
                  }).catch((err) => {
                      failCount++;
                      onProgress?.(successCount,failCount);
                      return Promise.reject(err);
                  })
            })
        );
    }

    /**
     * 将字符串首字母转为大写
     * @param str 输入字符串
     * @returns 首字母大写的字符串
     */
    static toUpperFirst(str:string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * 判断对象是否为函数
     * @param obj 要判断的对象
     * @returns 是否为函数
     */
    static isFunction(obj) {
        return typeof obj === 'function';
    }

    /**
     * 动态加载脚本
     * @param url 脚本URL
     * @param callback 加载完成回调
     */
    static loadScript(url: string, callback: () => void) {
        const script = document.createElement(`script`);
        script.src = url;
        script.async = true;
        script.defer = true;
        script.crossOrigin = `anonymous`;
        script.onload = callback;
        document.head.appendChild(script);
    }
    
    /**
     * 将字符串转换为颜色值
     * @param str 输入字符串
     * @returns 颜色值（十六进制）
     */
    static stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    /**
     * 获取当前操作系统
     * @returns {string} 返回当前操作系统标识
     */
    static getPlatform() {
        return sys.os;
    }

    /**
     * 获取当前运行平台
     * @returns {string} 返回当前运行平台标识
     */
    static getRunningPlatform() {
        return sys.platform;
    }

    /**
     * 检查是否运行在原生平台
     * @returns {boolean} 如果是原生平台返回 true，否则返回 false
     */
    static isNative() {
        return sys.isNative;
    }

    /**
     * 检查是否运行在浏览器平台
     * @returns {boolean} 如果是浏览器平台返回 true，否则返回 false
     */
    static isBrowser() {
        return sys.isBrowser;
    }

    /**
     * 检查是否运行在 iOS 系统
     * @returns {boolean} 如果是 iOS 系统返回 true，否则返回 false
     */
    static isIOS() {
        return this.getPlatform() === sys.OS.IOS;
    }

    /**
     * 检查是否运行在 Android 系统
     * @returns {boolean} 如果是 Android 系统返回 true，否则返回 false
     */
    static isAndroid() {
        return this.getPlatform() === sys.OS.ANDROID;
    }

    /**
     * 检查是否运行在 Windows 系统
     * @returns {boolean} 如果是 Windows 系统返回 true，否则返回 false
     */
    static isWin32() {
        return this.getPlatform() === sys.OS.WINDOWS;
    }
    
    static getErroMessage = function (e) {
        if (typeof e === "string") {
            return e;
        } else if (e instanceof Error) {
            return e.message;
        }
        return "unknow";
    }
}

export const func = Functions

/**
 * 资源快速加载类
 * @class quickAsset
 */
export class quickAsset {
    /**
     * 获取已加载的资源
     * @param bundleName 资源包名称
     * @param path 资源路径
     * @param type 资源类型
     * @returns 资源实例
     */
    static getAsset<T extends Asset>(bundleName:string,path:string,type?:Constructor<T>) {
        let bundle = app.manager.asset.getBundle(bundleName);
        assert(bundle!=null,`bundle ${bundleName} not exist`);
        return bundle.get(path,type);
    }

    /**
     * 加载资源
     * @param bundleName 资源包名称
     * @param path 资源路径
     * @param type 资源类型
     * @returns Promise<资源实例>
     */
    static loadAsset<T extends Asset>(bundleName:string,path:string,type?:Constructor<T>) {
        return func.doPromise<T>((resolve,reject)=>{
            app.manager.asset.loadBundle({
                name: bundleName,
                onComplete: (err,bundle) => {
                    if(err) {
                        reject(err)
                    } else {
                        bundle.load({
                            paths: path,
                            assetType: type,
                            onComplete: (err,res:T) => {
                                if(err) {
                                    reject(err)
                                } else {
                                    resolve(res)
                                }
                            }
                        })
                    }
                }
            })
        })
    }
}

export const qAsset = quickAsset

/**
 * UI相关功能类
 * @class UIFunctions
 */
export class UIFunctions {
    /**
     * 创建位置向量 (使用共享v3对象)
     * @param x X坐标或向量
     * @param y Y坐标
     * @param z Z坐标
     * @returns 位置向量
     */
    static pos(x: number | Vec2 | Vec3 = 0, y: number = 0, z: number = 0) {
        if (typeof (x)!= `number`) {
            x = <Vec3>(x);
            y = x.y ?? 0;
            z = x.z ?? 0;
            x = x.x ?? 0;
        }
        constant.v3.set(x, y, z);
        return constant.v3;
    }

    /**
     * 创建缩放向量 (使用共享v3对象)
     * @param x X缩放或向量
     * @param y Y缩放
     * @param z Z缩放
     * @returns 缩放向量
     */
    static scale(x: number | Vec2 | Vec3 = 1, y: number = 1, z: number = 1) {
        if (typeof (x)!= `number`) {
            x = <Vec3>(x);
            y = x.y ?? 1;
            z = x.z ?? 1;
            x = x.x ?? 1;
        } else if(arguments.length == 1) {
            y = x;
            z = x;
            x = x;
        }
        constant.v3.set(x, y, z);
        return constant.v3;
    }

    /**
     * 创建带Widget组件的新节点
     * @param name 节点名称
     * @returns 新节点
     */
    static newNodeWidget(name?:string) {
        let node = new Node(name);
        let uiTran = node.addComponent(UITransform);
        let widget = node.addComponent(Widget);
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        widget.top = 0;
        widget.left = 0;
        widget.right = 0;
        widget.bottom = 0;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        return node;
    }

    /**
     * 显示对话框
     * @param config 对话框配置
     * @param data 对话框数据
     * @returns 对话框实例
     */
    static showDialog(config: {
        path: string
        bundleName: string
    },data?:any) {
        return app.manager.ui.showDialog(config,data);
    }

    /**
     * 显示加载界面
     * @param loading 加载界面实例
     */
    static showLoading(loading:FWUILoading) {
        app.manager.ui.showLoading(loading);
    }

    /**
     * 添加点击事件监听
     * @param target 目标节点或按钮
     * @param callback 回调函数
     */
    static onClick(target:Node|Button,callback:Function) {
        let node:Node;
        if(target instanceof Node) {
            node = target;
            target = target.getComponent(Button) ?? target.addComponent(Button);;
        } else {
            node = target.node;
        }
        node.off(Button.EventType.CLICK)
        node.on(Button.EventType.CLICK, callback);
    }

    /**
     * 添加带音效的点击事件监听
     * @param target 目标节点或按钮
     * @param callback 回调函数
     * @param clip 音效剪辑
     */
    static onClickSfx(target:Node|Button,callback:Function,clip: AudioClip = constant.button_click_sfx_clip) {
        let node:Node;
        if(target instanceof Node) {
            node = target;
            target = target.getComponent(Button) ?? target.addComponent(Button);
        } else {
            node = target.node;
        }
        node.off(Button.EventType.CLICK)
        node.on(Button.EventType.CLICK, callback);
        node.on(Button.EventType.CLICK, ()=>{
            if(clip) {
                app.manager.audio.playSfx(clip);
            }
        });
    }

    /**
     * 断言检查对象是否有效
     * @param obj 要检查的对象
     */
    static assertObj(obj:Node|Component) {
        if(!obj.isValid) {
            throw new Error("obj had been destroy");
        }
    }
}

export const uiFunc = UIFunctions

/**
 * 扩展JSON对象，添加安全解析方法
 */
JSON.safeParse = function (text: string, reviver?: (this: any, key: string, value: any) => any) {
    try {
        return JSON.parse(text,reviver);
    } catch (error) {
        Log.error(error);
    }
    return null;
}

declare global {
    namespace globalThis {
        interface JSON {
            safeParse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
        }
    }
}