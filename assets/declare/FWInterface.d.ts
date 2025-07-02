export interface IFWManagerBase {
    update(deltaTime: number): void;
    __preload():void;
    start(): void;
    dectroy(): void;
}

export interface IAssetConfig {
    path: string
    bundleName: string
}

declare global {
    interface IFWApp {
        manager :IFWManager
    }
    interface IFWManager {
    }
    
    interface IFWData {
    }

    namespace globalThis {
        var app:IFWApp;
        var manager:IFWManager;
    }
}