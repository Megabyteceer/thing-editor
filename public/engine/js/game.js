import Settings from './utils/settings.js';
import PixiObjectsProperties from './utils/pixi-objects-properties.js';
import Lib from './lib.js';
import DisplayObject from './components/display-object.js';
import Container from './components/container.js';
import Sprite from './components/sprite.js';
import Scene from './components/scene.js';

window.Scene = Scene;
window.Sprite = Sprite;
window.Lib = Lib;

var stage;
var app;

const FRAME_PERIOD = 1.0;
var frameCounterTime = 0;

var modals = [];
var hiddingModals = [];

class Game {
	
	constructor(gameId) {
		this.__EDITORmode = true;
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
		this.mouse = new PIXI.Point();
		window.addEventListener('mousemove', mouseHandlerGlobal);
		window.game = this;
	}
	
	get currentContainer () {
		if(modals.length >0) {
			return modals[modals.length - 1]; //top modal is active
		}
		return this.currentScene; //current scene is active if no modals on screen
	}
	
	init(element) {
		PixiObjectsProperties.init();
		// noinspection JSUnresolvedVariable
		app = new PIXI.Application(W, H, {backgroundColor: 0x1099bb});
		this.pixiApp = app;
		(element || document.body).appendChild(app.view);
		
		stage = new PIXI.Container();
		stage.name = 'stage';
		this.stage = stage;
		
		app.stage.addChild(stage);
		
		app.ticker.add(this.updateGlobal);
		
	}
	
	showScene(scene) {
		assert(scene instanceof Scene, 'Scene instance expected.');
		if (this.currentScene) {
			if (!this.__EDITORmode) {
				this.currentScene.onHideInner();
			}
			stage.removeChild(this.currentScene);
		}
		this.currentScene = scene;
		stage.addChild(scene);
		if (!this.__EDITORmode) {
			scene.onShowInner();
		}
		//EDITOR
		__getNodeExtendData(game.currentScene).toggled = true;
		//ENDEDITOR
	}

    //EDITOR
    __setCurrentContainerContent(object) {
	    if(modals.length > 0) {
			this.hideModal();
			this.makeItModal(object);
        } else {
            this.showScene(object);
        }
    }
    //ENDEDITOR

	makeItModal(displayObject) {
	    assert(!(displayObject instanceof Scene), 'Scene cant be used as modal');
		modals.push(displayObject);
		this.stage.addChild(displayObject);
	}

	get modalsCount() {
	    return modals.length;
    }
	
	hideModal(displayObject) {
		if(!displayObject) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.');
			hiddingModals.push(modals.pop());
		} else {
			var i = modals.indexOf(displayObject);
			assert(i >= 0, 'Attempt to hide modal object which is not in modal list.');
			hiddingModals.push(modals[i]);
			modals.splice(i, 1)
		}
	}
	
	updateGlobal(dt) {
		if (this.currentScene) {
			if (!this.paused && !this.__EDITORmode) {
				frameCounterTime += dt;
				var limit = 4;
				while (frameCounterTime > FRAME_PERIOD) {
					if (limit-- > 0) {
						this.updateFrame();
						frameCounterTime -= FRAME_PERIOD;
					} else {
						frameCounterTime = 0;
					}
				}
			} else {
				if(this.__EDITORmode) {
					while (hiddingModals.length > 0) {
						hiddingModals.pop().remove();
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
		updateRecursivelly(this.currentContainer);
		
		var i = hiddingModals.length-1; //hide modals process
		while (i >= 0) {
			var m = hiddingModals[i];
			m.alpha -= 0.01;
			if(m.alpha <= 0.0) {
				m.remove();
				hiddingModals.splice(i, 1);
			}
			i--;
		}
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