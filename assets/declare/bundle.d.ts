declare module "cc" {
    export namespace AssetManager {
        export interface Bundle {
            /**卸载单包未使用资源 */
            releaseUnusedAssets();
        }
    }
}
