
var backdrop = new Sprite(PIXI.Texture.WHITE);
backdrop.tint = 30;
backdrop.alpha = 0.5;
var currentlyShowedPreview;

export default class Overlay {

    showPreview(object) {
        this.hidePreview();
        EDITOR.overlay.addChild(backdrop);
        currentlyShowedPreview = object;
        EDITOR.overlay.removeChild(currentlyShowedPreview);
    }

    hidePreview() {
        if(backdrop.parent) {
            EDITOR.overlay.removeChild(backdrop);
        }
        if(currentlyShowedPreview) {
            EDITOR.overlay.removeChild(currentlyShowedPreview); ////TODO: pool dispose. When poolling will be ready.
            currentlyShowedPreview = null;
        }
    }
}