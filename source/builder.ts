import { BuildPlugin, IBuildTaskOption } from "@cocos/creator-types/editor/packages/builder/@types/public";

/**
 * 自定义构建脚本结构
 */

export const load: BuildPlugin.load = function() {
    console.log('bl-framework builder load');
};

export const unload: BuildPlugin.load = function() {
    console.log('bl-framework builder unload');
};

// 自定义纹理压缩处理
export const assetHandlers: string = './asset-handlers';

/**
 * 自定义构建配置
 * [x: string]: IBuildPluginConfig Cocos Creator 支持的平台名，与点击 构建 按钮后生成的文件夹一致。 如果平台标记为 *，则里面的配置对所有构建平台生效。
 *  配置项
 *  IBuildPluginConfig
 *      doc?: string; // 文档地址
 *      hooks?: string; // 自定义构建钩子
 *      panel?: string; // 自定义面板
 *      options?: IDisplayOptions; // 配置选项
 *      verifyRuleMap?: IVerificationRuleMap; // 验证规则
 */
export const configs:BuildPlugin.Configs = {
    'android':{
        options: {
            testInput: {
                label: 'testVar',
                description: 'this is a test input.',
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: 'Enter numbers',
                    },
                },
                verifyRules: ['required','ruleTest']
            },
            testCheckbox: {
                label: 'testCheckbox',
                description: 'this is a test checkbox.',
                default: false,
                render: {
                    ui: 'ui-checkbox',
                },
            },
        },
        verifyRuleMap: {
            ruleTest: {
                message: 'length of content should be less than 6.',
                func(val: any, option: IBuildTaskOption) {
                    if (val.length < 6) {
                        return true;
                    }
                    return false;
                }
            }
        },
        // 自定义打包钩子
        hooks:'./hooks',
    }
};