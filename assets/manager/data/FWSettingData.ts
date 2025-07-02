import { math } from "cc";
import { FWDataBase, registerData } from "./FWDataBase";
import { data_key } from "../../common/FWConstant";

export class SettingKey {
    static readonly BGM_VOLUME = "BGM_VOLUME";
    static readonly SFX_VOLUME = "SFX_VOLUME";
}

registerData("setting", () => FWSettingData.instance);
export class FWSettingData extends FWDataBase {
    // 重写静态实例类型
    protected static _instance: FWSettingData | null = null;
    
    // 重写静态访问器返回类型
    public static get instance(): FWSettingData {
        if (!FWSettingData._instance) {
            FWSettingData._instance = new FWSettingData();
        }
        return FWSettingData._instance;
    }

    constructor() {
        super(data_key.setting);
    }

    /**
     * 背景音量
     */
    private _bgmVolume: number = 1.0;

    set bgmVolume(value: number) {
        this._bgmVolume = math.clamp01(value);
        this.setFloat(SettingKey.BGM_VOLUME, value);
        app.manager.event.emit(app.manager.event.events.onBgmVolumeChanged, this._bgmVolume);
    }

    get bgmVolume(): number {
        return this._bgmVolume;
    }

    /**
     * 音效音量
     */
    private _sfxVolume: number = 1.0;

    set sfxVolume(value: number) {
        this._sfxVolume = math.clamp01(value);
        this.setFloat(SettingKey.SFX_VOLUME, value);
    }

    get sfxVolume(): number {
        return this._sfxVolume;
    }
}

declare global {
    namespace globalThis {
        interface IFWData {
            setting : FWSettingData
        }
    }
}