import { assert, BlockInputEvents, Color, color, Component, Sprite, SpriteFrame } from "cc";
import { constant } from "../common/FWConstant";
/**
 * 遮罩
 */
export class FWUIMask extends Component {
    protected start(): void {
        //添加触摸吞噬
        this.node.addComponent(BlockInputEvents);
        //添加Sprite
        let sprite = this.node.addComponent(Sprite);
        //调整颜色
        sprite.color = constant.color.mask;
        //调整尺寸模式
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        //设置SpriteFrame
        // sprite.spriteFrame = constant.default_sprite_splash;
    }
}