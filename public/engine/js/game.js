import Settings from './utils/settings.js';
import PixiObjectsProperties from './utils/pixi-objects-properties.js';
import Lib from './lib.js';
import Scene from './scene.js';
import Sprite from './sprite.js';

window.Scene = Scene;
window.Sprite = Sprite;

var stage;
var app;

const FRAME_PERIOD = 1.0;
var frameCounterTime = 0;
class Game {

	constructor (gameId) {
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
		window.game = this;
	}

	init(element) {
		PixiObjectsProperties.init();
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
			this.currentScene.onHideInner();
			stage.removeChild(this.currentScene);
		}
		this.currentScene = scene;
		stage.addChild(scene);
		scene.onShowInner();
	}

	updateGlobal(dt) {
		if(this.currentScene) {
			if(!this.paused) {
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

	updateFrame() {
		updateRecursivelly(this.currentScene);
	}
}

function updateRecursivelly(o) {

	o.update();
	
	var a = o.children;
	var arrayLength = a.length;
	for (var i = 0; i < arrayLength && o.parent; i++) {
		updateRecursivelly(a[i]);
	}
}

export default Game