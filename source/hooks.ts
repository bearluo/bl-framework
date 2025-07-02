import { BuildHook } from "@cocos/creator-types/editor/packages/builder/@types/public";
var Fs = require("fs");
var Path = require("path");

var inject_script = `
(function () {
    if (typeof window.jsb === 'object') {
        var hotUpdateSearchPaths = localStorage.getItem('HotUpdateSearchPaths');
        if (hotUpdateSearchPaths) {
            var paths = JSON.parse(hotUpdateSearchPaths);
            jsb.fileUtils.setSearchPaths(paths);

            var fileList = [];
            var storagePath = paths[0] || '';
            var tempPath = storagePath + '_temp/';
            var baseOffset = tempPath.length;
            if (jsb.fileUtils.isDirectoryExist(tempPath) && !jsb.fileUtils.isFileExist(tempPath + 'project.manifest.temp')) {
                jsb.fileUtils.listFilesRecursively(tempPath, fileList);
                fileList.forEach(srcPath => {
                    var relativePath = srcPath.substr(baseOffset);
                    var dstPath = storagePath + relativePath;

                    if (srcPath[srcPath.length] == '/') {
                        jsb.fileUtils.createDirectory(dstPath)
                    }
                    else {
                        if (jsb.fileUtils.isFileExist(dstPath)) {
                            jsb.fileUtils.removeFile(dstPath)
                        }
                        jsb.fileUtils.renameFile(srcPath, dstPath);
                    }
                })
                jsb.fileUtils.removeDirectory(tempPath);
            }
        }
    }
})();
`;

const PACKAGE_NAME = 'hotUpdate';

export const throwError: BuildHook.throwError = true;

export const load: BuildHook.load = async function() {
    console.log(PACKAGE_NAME,load);
};

export const onBeforeBuild: BuildHook.onBeforeBuild = async function(options) {
    // Todo some thing
    console.log(PACKAGE_NAME,'onBeforeBuild');
};

export const onBeforeCompressSettings: BuildHook.onBeforeCompressSettings = async function(options, result) {
    // Todo some thing
    console.log(PACKAGE_NAME,'onBeforeCompressSettings');
};

export const onAfterCompressSettings: BuildHook.onAfterCompressSettings = async function(options, result) {
    // Todo some thing
    console.log(PACKAGE_NAME, 'onAfterCompressSettings');
};

export const onAfterBuild: BuildHook.onAfterBuild = async function(options, result) {
    console.log(PACKAGE_NAME, 'onAfterBuild');
    var url = Path.join(result.dest, 'data', 'main.js');
    if (!Fs.existsSync(url)) {
        url = Path.join(result.dest, 'assets', 'main.js');
    }
    let data = Fs.readFileSync(url, `utf8`);
    var newStr = inject_script + data;
    Fs.writeFileSync(url, newStr);
};

export const unload: BuildHook.unload = async function() {
    console.log(PACKAGE_NAME, 'unload');
};