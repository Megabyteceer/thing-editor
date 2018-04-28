
var backdrop = new Sprite(PIXI.Texture.WHITE);
backdrop.tint = 30;
backdrop.alpha = 0.9;
backdrop.x = W/2;
backdrop.y = H/2;
backdrop.width = W;
backdrop.height = H;
var currentlyShowedPreview;

export default class Overlay {

    showPreview(object) {
        this.hidePreview();
        game.stage.addChild(backdrop);
        currentlyShowedPreview = object;
        game.stage.addChild(currentlyShowedPreview);
    }

    hidePreview() {
        if(backdrop.parent) {
            game.stage.removeChild(backdrop);
        }
        if(currentlyShowedPreview) {
            game.stage.removeChild(currentlyShowedPreview); ////TODO: pool dispose. When poolling will be ready.
            currentlyShowedPreview = null;
        }
    }
}