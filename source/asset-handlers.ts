import { AssetHandlers } from "@cocos/creator-types/editor/packages/builder/@types/public";
// 自定义压缩纹理
export const compressTextures: AssetHandlers.compressTextures = async (tasks) => {
    console.log('compressTextures');
};