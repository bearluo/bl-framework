import { _decorator, sys } from 'cc'
import { FWNativeAndroid, FWNativeBase, FWNativeBrowser, FWNativeIOS, FWNativeWindows } from '../native';

const { ccclass, property } = _decorator;

let FWNativeClass: typeof FWNativeBase;
if (sys.isBrowser) FWNativeClass = FWNativeBrowser;
if (sys.isNative) {
    if (sys.os == "Android") FWNativeClass = FWNativeAndroid;
    if (sys.os == "iOS") FWNativeClass = FWNativeIOS;
    if (sys.os == "Windows") FWNativeClass = FWNativeWindows;
}

@ccclass('FWNativeManager')
export class FWNativeManager extends FWNativeClass {
    protected static _instance: FWNativeBase | null = null;

    public static get instance(): FWNativeBase {
        if (!FWNativeManager._instance) {
            FWNativeManager._instance = new FWNativeManager();
        }
        return FWNativeManager._instance;
    }
}

declare global {
    namespace globalThis {
        interface IFWManager {
            native: FWNativeBase
        }
    }
}