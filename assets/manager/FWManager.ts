import { assert, instantiate, sys } from "cc";
import { managerRegister } from "./manager/base/FWBaseManager";
import { managerObject } from "../common/FWConstant";

export class FWManager extends EventTarget {

    constructor() {
        super();
        globalThis.manager = this as any;
    }

    initManager() {
        managerRegister.forEach((element,key) => {
            this[key] = element();
        });
    }
    
    __preload() {
        managerObject.forEach(element => {
            element.__preload();
        });
    }

    start() {
        managerObject.forEach(element => {
            element.start();
        });
    }

    update(deltaTime: number): void {
        managerObject.forEach(element => {
            element.update(deltaTime);
        });
    }

    dectroy() {
        let old = Array.from(managerObject);
        managerObject.length = 0;
        old.forEach(element => {
            element.dectroy();
        });
    }
}

