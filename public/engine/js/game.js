import Settings from './utils/settings.js';
import PixiObjectsProperties from './utils/pixi-objects-properties.js';
import Lib from './lib.js';
import Scene from './components/scene.js';
import Sprite from './components/sprite.js';

window.Scene = Scene;
window.Sprite = Sprite;
window.Lib = Lib;

var stage;
var app;

const FRAME_PERIOD = 1.0;
var frameCounterTime = 0;
class Game {

	constructor (gameId) {
        this.__EDITORmode = true;
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
		this.mouse = {x:0, y:0};
        window.addEventListener('mousemove', mouseHandlerGlobal);
		window.game = this;
	}

	init(element) {
		PixiObjectsProperties.init();
		// noinspection JSUnresolvedVariable
        app = new PIXI.Application(W, H, {backgroundColor : 0x1099bb});
		this.pixiApp = app;
		(element || document.body).appendChild(app.view);

		stage = new PIXI.Container();
		stage.name = 'stage';
		this.stage = stage;

		app.stage.addChild(stage);

		app.ticker.add(this.updateGlobal);

	}

	showScene(scene) {
		if(this.currentScene) {
			if(!this.__EDITORmode) {
				this.currentScene.onHideInner();
			}
			stage.removeChild(this.currentScene);
		}
		this.currentScene = scene;
		stage.addChild(scene);
		if(!this.__EDITORmode) {
			scene.onShowInner();
		}
	}

	updateGlobal(dt) {
		if(this.currentScene) {
			if(!this.paused && !this.__EDITORmode) {
				frameCounterTime += dt;
				var limit = 4;
				while(frameCounterTime > FRAME_PERIOD) {
					if(limit-- > 0) {
						this.updateFrame();
						frameCounterTime -= FRAME_PERIOD;
					} else {
						frameCounterTime = 0;
					}

				}

			}
			app.renderer.backgroundColor = this.currentScene.backgroundColor;
		}
	}
    
    static mouseEventToGlobalXY(ev) {
        var b = app.view.getBoundingClientRect();
        var n = ev.clientX - b.left;
        tmpPoint.x = n * (W / b.width);
        n = ev.clientY - b.top;
        tmpPoint.y = n * (H / b.height);
        return tmpPoint;
    }
    
	updateFrame() {
		updateRecursivelly(this.currentScene);
	}
}

var tmpPoint = {};

function updateRecursivelly(o) {
	o.update();
	var a = o.children;
	var arrayLength = a.length;
	for (var i = 0; i < arrayLength && o.parent; i++) {
		updateRecursivelly(a[i]);
	}
}

const mouseHandlerGlobal = (ev) => {
    var p = Game.mouseEventToGlobalXY(ev);
    game.mouse.x = Math.round(p.x);
    game.mouse.y = Math.round(p.y);
    game.mouse.click = ev.buttons !== 0;
    game.mouse.shiftKey = ev.shiftKey;
}

export default Game