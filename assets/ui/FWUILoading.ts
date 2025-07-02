import { _decorator, Component, EventTouch, Node, tween, UIOpacity, Vec3 } from 'cc';
import { func } from '../common/FWFunction';
const { ccclass, property } = _decorator;

export interface IUILoadingHideData {
    bRemove?:boolean;
}

export interface IProgressData {
    progress:number;
    finished:number;
    total:number;
}

@ccclass('FWUILoading')
export class FWUILoading extends Component {
    animation: FWUILoadingAnim;


    protected __preload(): void {
        this.animation = this.node.getComponent(FWUILoadingAnim) ?? this.node.addComponent(FWUILoadingAnim)
    }

    start() {
    }

    update(deltaTime: number) {
        
    }

    updateProgress(data:IProgressData) {
    }

    /**
     * 显示
     */
    show(data?) {
        app.manager.ui.loading.add(this);
        this.playShowAnim()
    }

    /**
     * 隐藏
     * @param data {@link IHideData}
     */
    hide(data:IUILoadingHideData = {}) {
        let {bRemove=true} = data;
        app.manager.ui.loading.remove(this);
        this.playHideAnim(bRemove);
    }

    playShowAnim() {
        this.animation.playShowAnim(this.onShowAnimCallback.bind(this));
    }

    playHideAnim(bRemove=false) {
        this.animation.playHideAnim(this.onHideAnimCallback.bind(this,bRemove));
    }

    protected onShowAnimCallback() {
        this._show();
    }

    protected onHideAnimCallback(bRemove=false) {
        if(bRemove) {
            this.node.destroy();
        } else {
            this._hide();
        }
    }

    _show() {
        this.node.active = true;
    }

    _hide() {
        this.node.active = false;
    }

    onDestroy() {
        app.manager.ui.loading.remove(this);
    }
}

export class FWUILoadingPoolNode extends FWUILoading {
    onHideAnimCallback(bRemove=false) {
        if(bRemove) {
            this.node.parent = null;
        } else {
            this.node.active = false;
        }
    }
}
// const scaleShow = new Vec3(1,1,1);
// const scaleHide = new Vec3(0,0,0);

export class FWUILoadingAnim extends Component {
    uiOpacity:UIOpacity;
    protected __preload(): void {
        this.uiOpacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity)
    }

    playShowAnim(callback) {
        this.uiOpacity.opacity = 0;
        tween(this.uiOpacity)
            .call(callback)
            .to(0.2, { opacity: 255 })
            .start();
    }

    playHideAnim(callback) {
        this.uiOpacity.opacity = 1;
        tween(this.uiOpacity)
            .to(0.2, { opacity: 0 })
            .call(callback)
            .start();
    }
}