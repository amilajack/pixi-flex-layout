import { DisplayObject } from "pixi.js";
import { YogaLayout } from "./YogaLayout";

declare module "pixi.js" {

    import { YogaLayout } from "./YogaLayout";

    export interface DisplayObject {
        yoga: YogaLayout;

        updateYogaLayout(): void;

        checkIfBoundingBoxChanged(): void;
    }

}

export function applyDisplayObjectPolyfill() {

    Object.defineProperty(DisplayObject.prototype, "yoga", {
        get(): boolean {
            if (!this.__yoga) {
                this.__yoga = new YogaLayout(this);
            }
            return this.__yoga;
        },
        set(v: any): void {
            this.__yoga = v;
        }
    });
    const destroy = DisplayObject.prototype.destroy;
    DisplayObject.prototype.destroy = function () {
        if (this.yoga) {
            this.yoga.node.free();
        }
        this.yoga.parent = undefined;
        delete this.yoga;
        destroy();
    }

    DisplayObject.prototype.checkIfBoundingBoxChanged = function (this: DisplayObject) {
        if (this instanceof PIXI.Text) {
            (this as any).updateText(true);
        }

        this.yoga.children.forEach(child => {
            child.target.checkIfBoundingBoxChanged();
        })
        const texture: PIXI.Texture = (this as any)._texture;
        const bounds = (this as any)._boundsRect;

        if (texture) {
            const tw = Math.abs(this.yoga.rescaleToYoga ? 1 : this.scale.x) * texture.orig.width;
            const th = Math.abs(this.yoga.rescaleToYoga ? 1 : this.scale.y) * texture.orig.height;
            if (this.yoga.rescaleToYoga && (this instanceof PIXI.Text || this instanceof PIXI.Sprite)) {
                this.yoga.aspectRatio = (texture.orig.width / texture.orig.height)
            }
            (this as any).__layoutHash = tw * 0.12498 + th * 121;
            if ((this as any).__layoutHash !== (this as any).__oldHash) {
                this.emit(YogaLayout.NEED_LAYOUT_UPDATE);
            }
            (this as any).__oldHash = (this as any).__layoutHash;

            this.yoga.isWidthCalculatedFromPixi && this.yoga.node.setWidth(tw);
            this.yoga.isHeightCalculatedFromPixi && this.yoga.node.setHeight(th);

        } else if (bounds) {
            this.yoga.isWidthCalculatedFromPixi && this.yoga.node.setWidth(bounds.width)
            this.yoga.isHeightCalculatedFromPixi && this.yoga.node.setHeight(bounds.height)
        }
    }

    DisplayObject.prototype.updateYogaLayout = function (this: DisplayObject) {
        this.yoga.update();
        const layout = this.yoga.computedLayout;

        (<any>this.transform).position.x = layout.left;
        (<any>this.transform).position.y = layout.top;

        const texture: PIXI.Texture = (this as any)._texture;
        if (this.yoga.rescaleToYoga) {
            (<any>this).width !== undefined && ((<any>this).width = layout.width);
            (<any>this).height !== undefined && ((<any>this).height = layout.height);
        }

        this.yoga.children.forEach(child => {
            child.target.updateYogaLayout();
        })
    }
}
