import { FWBaseManager } from "../../manager/base/FWBaseManager";

export interface IFWNative {
    // 定义原生接口方法
    initialize(): void;
    // 其他原生接口方法...
}

export class FWNativeBase extends FWBaseManager implements IFWNative {
    initialize(): void {
        // 基础实现
    }
} 