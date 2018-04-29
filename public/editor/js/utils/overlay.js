import Editor from "../editor.js";
import Pool from "/engine/js/utils/pool.js";

var backdrop = new Sprite(PIXI.Texture.WHITE);
backdrop.tint = 30;
backdrop.alpha = 0.9;
backdrop.x = W/2;
backdrop.y = H/2;
backdrop.width = W;
backdrop.height = H;
var currentlyShowedPreview;

var pivotImage = PIXI.Texture.fromImage('editor/img/overlay/pivot.png');
var rotatorImage = PIXI.Texture.fromImage('editor/img/overlay/rotator.png');

var draggers = [];
var draggersOwners = new WeakMap();

function createDragger(owner, img) {
    var ret = Pool.create(Sprite);
    ret.image = img;
    return ret;
}

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

const p = new PIXI.Point();

setInterval(function refreshSelection() {
    
    draggers.some((d) => {
        if(!__getNodeExtendData(draggersOwners.get(d)).selected) {
            d.parent.removeChild(d);
            Pool.dispose(d);
        }
    });
    
    EDITOR.selection.some((o) => {
        var info = __getNodeExtendData(o)
        if(!info.draggerPivot) {
            info.draggerPivot = createDragger(o, pivotImage);
            game.pixiApp.stage.addChild(info.draggerPivot);
        }
        var p = o.getGlobalPosition(p, true);
        info.draggerPivot.x = p.x;
        info.draggerPivot.y = p.y;
    });
}, 1000 / 60 / 5);