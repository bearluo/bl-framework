import { _decorator, Component, EventTouch, Node, tween, Vec3 } from 'cc';
import { func } from '../common/FWFunction';
const { ccclass, property } = _decorator;

export interface IUIDialogHideData {
    bClickClose?:boolean;
    bRemove?:boolean;
}

@ccclass('FWUIDialog')
export class FWUIDialog extends Component {
    animation: FWUIDialogAnim;
    protected _showData:any;
    protected _hideData:IUIDialogHideData;


    protected __preload(): void {
        this.animation = this.node.getComponent(FWUIDialogAnim) ?? this.node.addComponent(FWUIDialogAnim)
    }

    protected start() {
    }

    update(deltaTime: number) {
        
    }

    get showData() {
        return this._showData;
    }

    /**
     * 显示
     */
    show(data?) {
        this._showData = data;
        app.manager.ui.dialog.addDialog(this);
    }

    /**
     * 隐藏
     */
    hide(data:IUIDialogHideData = {}) {
        this._hideData = data;
        app.manager.ui.dialog.removeDialog(this);
        let {bClickClose=false,bRemove=true} = data;
        this.playHideAnim(bRemove);
    }

    playShowAnim() {
        this.animation.playShowAnim(this.onShowAnimCallback.bind(this));
    }

    playHideAnim(bRemove=false) {
        this.animation.playHideAnim(this.onHideAnimCallback.bind(this,bRemove));
    }

    onClickClose(data:IUIDialogHideData = {}) {
        data.bClickClose = true;
        this.hide(data);
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
        app.manager.ui.dialog.removeDialog(this);
    }
}

const scaleShow = new Vec3(1,1,1);
const scaleHide = new Vec3(0,0,0);

export class FWUIDialogAnim extends Component {
    playShowAnim(callback) {
        this.node.scale = scaleHide;
        tween(this.node)
            .call(callback)
            .to(0.2, { scale: scaleShow })
            .start();
    }

    playHideAnim(callback) {
        this.node.scale = scaleShow;
        tween(this.node)
            .to(0.2, { scale: scaleHide })
            .call(callback)
            .start();
    }
}
