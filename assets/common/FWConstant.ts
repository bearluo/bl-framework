import { Vec2, v2, Vec3, v3, Vec4, v4, color, Prefab, SpriteFrame, AudioClip } from 'cc';
import { IFWManagerBase } from '../declare/FWInterface';

const _v2 = v2()
const _v3 = v3()
const _v4 = v4()
/**
 * 常量
 */
export class constant {
    static get v2() {
        return _v2
    }
    static get v3() {
        return _v3
    }
    static get v4() {
        return _v4
    }

    static color = {
        mask : color(0, 0, 0, 180),
    }

    static default_loadPrefab:Prefab;
    static default_sprite_splash:SpriteFrame;
    static encrypt_key = "b9d27fa6b64db9390678aa4fe42bdf84";

    static DEBUG = {
        bDev : true,
    }
    
    static button_click_sfx_clip:AudioClip;
}

/**
 * 管理器
 */
export const managerObject:IFWManagerBase[] = []


export const data_key = {
    setting : "setting",
}