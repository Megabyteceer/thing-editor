import Settings from './utils/settings.js';
import Lib from './lib.js';
import DisplayObject from './components/display-object.js';
import Container from './components/container.js';
import DSprite from './components/sprite.js';
import Scene from './components/scene.js';
import call from './utils/call.js';

window.Scene = Scene;
window.DSprite = DSprite;
window.Lib = Lib;

PIXI.settings.MIPMAP_TEXTURES = false;

var stage;
var app;

const FRAME_PERIOD = 1.0;
var frameCounterTime = 0;

var modals = [];
var hiddingModals = [];

var SHOOTTIME = false;
var currentFader;
var showStack = [];

class Game {
	
	constructor(gameId) {
		this.__EDITORmode = true;
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
		this.mouse = new PIXI.Point();
		this.call = call;
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

		app = new PIXI.Application(W, H, {backgroundColor: 0x1099bb});
		this.pixiApp = app;
		(element || document.body).appendChild(app.view);
		
		stage = new PIXI.Container();
		stage.name = 'stage';
		this.stage = stage;
		
		app.stage.addChild(stage);
		
		app.ticker.add(this.updateGlobal);
	}
	
	faderShoot() {
		assert(currentFader, "game.faderShoot() called without fader on screen");
		SHOOTTIME = true;
		
		while(modals.length > 0) {
			modals.pop().remove();
		}
		this.currentScene.onHide();
		
		if (!this.currentScene.isStatic && (showStack.indexOf(this.currentScene) < 0)) {
			this.currentScene.remove();
		} else {
			this.currentScene.detachFromParent();
		}
		this._setCurrentSceneContent(showStack.pop());
		this._processOnShow();
		
		//TODO: wait until scene's assetw will beloaded
		currentFader.gotoLabelRecursive('hide fader');
		
		SHOOTTIME = false;
	}
	
	_processOnShow() {
		this.currentScene.onShow();
	}
	
	
	_setCurrentSceneContent(scene) {
		assert(!this.currentScene || !this.currentScene.parent, "Previous scene was not removed before setting new one.");
		this.currentScene = scene;
		stage.addChildAt(scene, 0);
		/// #if EDITOR
		__getNodeExtendData(game.currentScene).toggled = true;
		editor.refreshTreeViewAndPropertyEditor();
		/// #endif
	}
	
	static get disableAllButtons() {
		return currentFader != null;
	}
	
	faderEnd() {
		assert(currentFader, "game.faderEnd() called without fader on screen");
		currentFader.remove();
		currentFader = null;
		/// #if EDITOR
		editor.refreshTreeViewAndPropertyEditor();
		/// #endif
	}
	
	showScene(scene, faderType) {
		if(typeof scene === 'string') {
			scene = Lib.loadScene(scene);
		}
/// #if EDITOR
		assert(scene instanceof Scene, 'Scene instance expected.');
/// #endif
		if(this.__EDITORmode) {
			if (this.currentScene) {
				stage.removeChild(this.currentScene);
			}
			this._setCurrentSceneContent(scene);
		} else {
			
			
			if (this.currentScene) {
				if (!this.currentScene.isNoStackable) {
					showStack.push(this.currentScene);
				}
				showStack.push(scene);
				this.closeCurrentScene(faderType);
			} else {
				this._setCurrentSceneContent(scene);
			}
			/// #if EDITOR
			editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
		
	}
	
	closeCurrentScene(faderType) {
		assert(showStack.length > 0, "can't close latest scene");
		
		if (SHOOTTIME) {
			this.faderShoot();
		} else {
			if (!faderType) {
				if(this.currentScene && this.currentScene.faderType) {
					faderType = this.currentScene.faderType;
				} else {
					faderType = 'fader/default';
				}
			}
			currentFader = Lib.loadPrefab(faderType);
			assert(currentFader, 'Wrong fader type for this scene');
			this.stage.addChild(currentFader);
		}
	}

    /// #if EDITOR
    __setCurrentContainerContent(object) {
	    if(modals.length > 0) {
			this.hideModal();
			this.showModal(object);
        } else {
            this.showScene(object);
        }
    }
    
    __cleanupBeforeToggleStop() {
	    while (game.modalsCount > 0) {
		    game.closeModal();
	    }
	    while (showStack.length > 0) {
		    var s = showStack.pop();
		    game.stage.addChild(s);
		    s.remove();
	    }
		if(currentFader) {
			this.faderEnd();
		}
    }
    
    __getScenesStack() {
		return showStack;
	}
    
    /// #endif

	showModal(displayObject) {
		
		if(typeof displayObject === "string"){
			displayObject = Lib.loadPrefab(displayObject);
		}
		
		assert(!(displayObject instanceof Scene), 'Scene cant be used as modal');
		modals.push(displayObject);
		this.stage.addChild(displayObject);
	}

	get modalsCount() {
	    return modals.length;
    }
	
	hideModal(displayObject, instantly) {
		if(typeof instantly === 'undefined') {
			instantly = displayObject === 'instantly';
			if(instantly) {
				displayObject = undefined;
			}
		}
		
		if(!displayObject) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.');
			var modalToHide = modals.pop();
		} else {
			var i = modals.indexOf(displayObject);
			assert(i >= 0, 'Attempt to hide modal object which is not in modal list.');
			modalToHide = modals[i];
			modals.splice(i, 1)
		}
		
		if(instantly || game.__EDITORmode) {
			modalToHide.remove();
		} else {
			hiddingModals.push(modalToHide);
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
	
	updateGlobal(dt) {
		if (this.currentScene) {
		
/// #if EDITOR
			if ((!this.__paused || this.__doOneStep) && !this.__EDITORmode) {
/// #endif
				frameCounterTime += dt;
				var limit = 4;
				frameCounterTime = Math.min(frameCounterTime, FRAME_PERIOD * 4);
				while (frameCounterTime > FRAME_PERIOD) {
					
					this.updateFrame();
					frameCounterTime -= FRAME_PERIOD;
/// #if EDITOR
					if (this.__doOneStep) {
						editor.refreshTreeViewAndPropertyEditor();
						this.__doOneStep = false;
						frameCounterTime = 0;
						break;
					}
				}
/// #endif
			}

			app.renderer.backgroundColor = this.currentScene.backgroundColor;
			
			this.currentScene.interactiveChildren = ((this.modalsCount === 0) && !currentFader);
			var i = this.modalsCount-1;
			var isCurrent = !currentFader;
			while (i >= 0) {
				modals[i].interactiveChildren = isCurrent;
				isCurrent = false;
				i--;
			}
		}
	}
	
	updateFrame() {
		updateRecursivelly(this.currentContainer);
		if(currentFader) {
			updateRecursivelly(currentFader);
		}
		var i = hiddingModals.length-1; //hide modals process
		while (i >= 0) {
			var m = hiddingModals[i];
			m.alpha -= 0.1;
			if(m.alpha <= 0.01) {
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
	for (var i = arrayLength - 1; i >= 0 && o.parent; i--) {
		updateRecursivelly(a[i]);
	}
}

const mouseHandlerGlobal = (ev) => {
	var p = Game.mouseEventToGlobalXY(ev);
	game.mouse.x = Math.round(p.x);
	game.mouse.y = Math.round(p.y);
	game.mouse.click = ev.buttons !== 0;
	game.mouse.buttons = ev.buttons;
	game.mouse.shiftKey = ev.shiftKey;
	game.mouse.altKey = ev.altKey;
	game.mouse.ctrlKey = ev.ctrlKey;
}

export default Game