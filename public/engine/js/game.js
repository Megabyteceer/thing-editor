import Settings from './utils/settings.js';
import Lib from './lib.js';
import DisplayObject from './components/display-object.js';
import Container from './components/container.js';
import DSprite from './components/sprite.js';
import Scene from './components/scene.js';
import call from './utils/call.js';
import Preloader from "./utils/preloader.js";
import L from "./utils/l.js";

window.Scene = Scene;
window.DSprite = DSprite;
window.Lib = Lib;
window.L = L;

PIXI.settings.MIPMAP_TEXTURES = false;

let stage;
let app;
let assets;

const FRAME_PERIOD = 1.0;
let frameCounterTime = 0;

let modals = [];
let hiddingModals = [];

let SHOOTTIME = false;
let currentFader;
let showStack = [];
let scale = 1;

let domElement;

let _rendererWidth,
	_rendererHeight;

class Game {
	
	constructor(gameId) {
		this.settings = new Settings(gameId);
		this.updateGlobal = this.updateGlobal.bind(this);
		this.mouse = new PIXI.Point();
		this.call = call;
		window.addEventListener('mousemove', mouseHandlerGlobal);
		window.game = this;
		
		Object.defineProperties(this, {
			W: {
				enumerable: true,
				get: function() {
					return W;
				}
			},
			H: {
				enumerable: true,
				get: function() {
					return H;
				}
			},
			scale: {
				enumerable: true,
				get: function() {
					return scale;
				}
			},
			currentContainer: {
				enumerable: true,
				get: function() {
					if(modals.length > 0) {
						return modals[modals.length - 1]; //top modal is active
					}
					return this.currentScene; //current scene is active if no modals on screen
				}
			},
			modalsCount: {
				enumerable: true,
				get: function() {
					return modals.length;
				}
			}
			
		});
	}
	
	onResize() {
		
		let w = domElement.clientWidth;
		let h = domElement.clientHeight;
	
		let orientation;
		if((this.screenOrientation === 'auto') && this.enforcedOrientation) {
			orientation = this.enforcedOrientation;
		} else {
			orientation = this.screenOrientation;
		}
		
		if(orientation === 'auto') {
			orientation = (w < h) ? 'portrait' : 'landscape';
		}
		
		window.W = 1280;
		window.H = 720;

		switch(orientation) {
			case 'portrait':
				let t = W;
				W = H;
				H  = t;
				break;
			
			default: //landscape
				break;
		}
		
		let stageRotation = 0;
		let stageX = 0;
		
		let S = 1; //Math.min(w / W, h / H);
		
		w /= S;
		h /= S;
		
		let needResizeRenderer = _rendererWidth !== W || _rendererHeight !== H || scale !== S;
		
		scale = S;
		_rendererWidth = W;
		_rendererHeight = H;

		let prevIsPortrait = game.isPortrait;
		game.isPortrait = W < H;
		
		PIXI.settings.RESOLUTION = scale;
		PIXI.interaction.InteractionManager.resolution = scale;
		//in running mode
		if(this.pixiApp && needResizeRenderer) {
			
			let stage = game.stage;
			
			stage.rotation = stageRotation;
			stage.x = stageX;
			
			let renderer = game.pixiApp.renderer;
			renderer.resolution = scale;
			renderer.plugins.interaction.resolution = scale;
			if (renderer.rootRenderTarget) {
				renderer.rootRenderTarget.resolution = scale;
			}
			
			renderer.resize(_rendererWidth, _rendererHeight);
			
			if(prevIsPortrait !== game.isPortrait) {
				/// #if EDITOR
				if(this.__EDITORmode) {
					this.stage.forAllChildren(procesOrientationSwitch);
				}
				/// #endif
				
				this.forAllChildrenEwerywhereBack(procesOrientationSwitch);
			}

		}
	}
	
	init(element) {
		domElement = element || document.body;
		/// #if EDITOR
		this._initInner();
		return;
		/// #endif
		
		fetch("assets.json").then(function(response) {
			return response.json();
		}).then((data) => {
			assets = data;
			this.screenOrientation = assets.projectDesc.screenOrientation;
			this._initInner();
		});
	}
	
	_initInner() {
		
		this.onResize();

		app = new PIXI.Application(_rendererWidth, _rendererHeight, {backgroundColor: 0}); //antialias, forceFXAA
		this.pixiApp = app;
		domElement.appendChild(app.view);
		
		stage = new PIXI.Container();
		stage.name = 'stage';
		this.stage = stage;

		this.onResize();
		
		app.stage.addChild(stage);
		
		app.ticker.add(this.updateGlobal);

/// #if EDITOR
		return;

/// #else
		this._startGame();
		let resizeOutjump;
		window.addEventListener('resize', () => {
			if(resizeOutjump) {
				clearTimeout(resizeOutjump);
			}
			resizeOutjump = setTimeout(() => {
				resizeOutjump = false;
				this.onResize();
			}, 200);
			
		});
/// #endif
	}
	
	faderShoot() {
		assert(currentFader, "game.faderShoot() called without fader on screen");
		SHOOTTIME = true;
		
		while(modals.length > 0) {
			modals.pop().remove();
		}
		this.currentScene.onHide();
		
		if(!this.currentScene.isStatic && (showStack.indexOf(this.currentScene) < 0)) {
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
	
	get screenOrientation() { //'landscape' (default), 'portrait' 'auto'
		return this._screenOrientation;
	}
	
	set screenOrientation(v) {
		assert(!v || v === 'auto' || v === 'landscape' || v === 'portrait', 'Wrong value for game.screenOrientation. "auto", "landscape" or "portrait" expected');
		this._screenOrientation = v;
		this.onResize();
	}
	
	get enforcedOrientation() { //'landscape', 'portrait'
		return this._enforcedOrientation;
	}
	
	set enforcedOrientation(v) {
		assert(!v || v === 'landscape' || v === 'portrait', 'Wrong value for game.enforcedOrientation. "landscape" or "portrait" expected');
		this._enforcedOrientation = v;
		this.onResize();
	}
	
	_startGame() {
		///#if EDITOR
		throw('game._startGame is for internal usage only. Will be invoked automaticly in production build.');
		///#endif
		
		let preloader = new Preloader();
		
		Lib._setPrefabs(assets.prefabs);
		Lib._setScenes(assets.scenes);
		
		Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
		Lib.addTexture('WHITE', PIXI.Texture.WHITE);
		
		assets.images.some((tName) => {
			let fileName = 'img/' + tName;
			PIXI.loader.add(fileName);
		});
		PIXI.loader.load();
		preloader.start(() => {
			
			assets.images.some((tName) => {
				let fileName = 'img/' + tName;
				Lib.addTexture(tName, PIXI.utils.TextureCache[fileName]);
			});
			this.showScene('main');
		});
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
			if(this.currentScene) {
				stage.removeChild(this.currentScene);
			}
			this._setCurrentSceneContent(scene);
		} else {
			
			
			if(this.currentScene) {
				if(!this.currentScene.isNoStackable) {
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
		
		if(SHOOTTIME) {
			this.faderShoot();
		} else {
			if(!faderType) {
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
	
	__clearStage() {
		while(this.modalsCount > 0) {
			this.hideModal();
		}
		while(showStack.length > 0) {
			let s = showStack.pop();
			this.stage.addChild(s);
			s.remove();
		}
		if(currentFader) {
			this.faderEnd();
		}
		if(this.currentScene) {
			this.currentScene.remove();
			this.currentScene = null;
		}
	}
	
	_getScenesStack() {
		return showStack;
	}
	
	/// #endif
	
	showModal(displayObject) {
		
		if(typeof displayObject === "string") {
			displayObject = Lib.loadPrefab(displayObject);
		}
		
		assert(!(displayObject instanceof Scene), 'Scene cant be used as modal');
		modals.push(displayObject);
		this.stage.addChild(displayObject);
	}
	
	hideModal(displayObject, instantly) {
		if(typeof instantly === 'undefined') {
			instantly = displayObject === 'instantly';
			if(instantly) {
				displayObject = undefined;
			}
		}
		let modalToHide;
		if(!displayObject) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.');
			modalToHide = modals.pop();
		} else {
			let i = modals.indexOf(displayObject);
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
		let b = app.view.getBoundingClientRect();
		let n = ev.clientX - b.left;
		tmpPoint.x = n * (W / b.width);
		n = ev.clientY - b.top;
		tmpPoint.y = n * (H / b.height);
		return tmpPoint;
	}
	
	updateGlobal(dt) {
		if(this.currentScene) {

/// #if EDITOR
			editor.ui.viewport.checkIfNeedRecovery();
			editor.frameUpdateException = true;
			if((!this.__paused || this.__doOneStep) && !this.__EDITORmode) {
/// #endif
				frameCounterTime += dt;
				let limit = 4;
				frameCounterTime = Math.min(frameCounterTime, FRAME_PERIOD * 4);
				while(frameCounterTime > FRAME_PERIOD) {
					
					this.updateFrame();
					frameCounterTime -= FRAME_PERIOD;
/// #if EDITOR
					if(this.__doOneStep) {
						editor.refreshTreeViewAndPropertyEditor();
						this.__doOneStep = false;
						frameCounterTime = 0;
						break;
					}
				}
/// #endif
			}

/// #if EDITOR
			editor.frameUpdateException = false;
/// #endif
			app.renderer.backgroundColor = this.currentScene.backgroundColor;
			
			this.currentScene.interactiveChildren = ((this.modalsCount === 0) && !currentFader);
			let i = this.modalsCount - 1;
			let isCurrent = !currentFader;
			while(i >= 0) {
				modals[i].interactiveChildren = isCurrent;
				isCurrent = false;
				i--;
			}
		}
	}
	
	forAllChildrenEwerywhereBack(callback) {
		for(let s of game._getScenesStack()) {
			callback(s);
			if(!s.parent) {
				callback(s);
				s.forAllChildren(callback);
			}
		}
		
		const staticScenes = Lib._getStaticScenes();
		for(let n in staticScenes) {
			let s = staticScenes[n];
			if(!s.parent) {
				callback(s);
				s.forAllChildren(callback);
			}
		}
	}
	
	forAllChildrenEwerywhere(callback) {
		game.stage.forAllChildren(callback);
		this.forAllChildrenEwerywhereBack(callback);
	}
	
	updateFrame() {
		updateRecursivelly(this.currentContainer);
		if(currentFader) {
			updateRecursivelly(currentFader);
		}
		let i = hiddingModals.length - 1; //hide modals process
		while(i >= 0) {
			let m = hiddingModals[i];
			m.alpha -= 0.1;
			if(m.alpha <= 0.01) {
				m.remove();
				hiddingModals.splice(i, 1);
			}
			i--;
		}
	}
}

let tmpPoint = {};

function updateRecursivelly(o) {
	o.update();
	let a = o.children;
	let arrayLength = a.length;
	for(let i = arrayLength - 1; i >= 0 && o.parent; i--) {
		updateRecursivelly(a[i]);
	}
}

const procesOrientationSwitch = (o) => {
	if(o._onOrientationSwitch) {
		o._onOrientationSwitch();
	}
}

const mouseHandlerGlobal = (ev) => {
	let p = Game.mouseEventToGlobalXY(ev);
	game.mouse.x = Math.round(p.x);
	game.mouse.y = Math.round(p.y);
	game.mouse.click = ev.buttons !== 0;
	game.mouse.buttons = ev.buttons;
	game.mouse.shiftKey = ev.shiftKey;
	game.mouse.altKey = ev.altKey;
	game.mouse.ctrlKey = ev.ctrlKey;
}

export default Game