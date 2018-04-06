import Settings from '/js/engine/utils/settings.js';

import Scene from './scene.js';
import Sprite from './sprite.js';

window.Scene = Scene;
window.Sprite = Sprite;

var stage;
var app;
var currentScene;

const FRAME_ERIOD = 60 / 1000;

class Game {

	constructor (gameId) {
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
	}

	init(element) {
		app = new PIXI.Application(W, H, {backgroundColor : 0x1099bb});
		this.pixiApp = app;
		(element || document.body).appendChild(app.view);

		stage = new PIXI.Container();
		stage.name = 'stage'
		this.stage = stage;

		app.stage.addChild(stage);

		app.ticker.add(this.updateGlobal);

	}

	showScene(scene) {
		if(currentScene) {
			currentScene.onHideInner();
			stage.removeChild(currentScene);
		}
		currentScene = scene;
		stage.addChild(scene);
		scene.onShowInner();
	}

	updateGlobal(dt) {
		if(!this.paused && currentScene) {
			while(dt > FRAME_ERIOD) {
				this.updateFrame();
				dt -= FRAME_ERIOD;
			}
		}
	}

	updateFrame() {
		updateRecursivelly(currentScene);
	}
}

function updateRecursivelly(o){
	o.update();
	
	var a = o.children;
	var arrayLength = a.length;
	for (var i = 0; i < arrayLength; i++) {
		updateRecursivelly(a[i]);
	}
}

export default Game