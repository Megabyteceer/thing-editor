/// <reference path="../../index.d.ts" />

import './utils/utils.js';
import Settings from './utils/settings.js';
import Lib from './lib.js';
import DisplayObject from './components/display-object.js';
import Container from './components/container.js';
/// #if EDITOR
import PrefabsList from 'thing-editor/js/editor/ui/prefabs-list.js';
import ScenesList from 'thing-editor/js/editor/ui/scenes-list.js';
/// #endif
/// #if DEBUG
import MusicFragment from './utils/music-fragment.js';
/// #endif

import './components/d-sprite.js';
import Scene from './components/scene.js';
import Preloader from "./utils/preloader.js";
import L from "./utils/l.js";
import Sound from "./utils/sound.js";
import Keys from './utils/keys.js';
import SureQuestion from './utils/sure-question.js';
import FullScreen from './utils/full-screen.js';
import ScrollLayer from './components/scroll-layer.js';
import BgMusic from './components/bg-music.js';
import Button from './components/button.js';
import Sprite from './components/sprite.js';
import Tilemap from './components/tilemap.js';
import getValueByPath, {setValueByPath} from './utils/get-value-by-path.js';
import SceneLinkedPromise from './components/scene-linked-promise.js';
import ResourceLoader from './utils/resource-loader.js';

let stage;
let app;
let assets;

let contextLoseTime = 0;

const FRAME_PERIOD_LIMIT = 4.0;
const FRAME_PERIOD = 1.0;
let frameCounterTime = 0;

let hideTheseModalsUnderFader;
/** @type PIXI.Container[] */
let modals = [];
/** @type PIXI.Container[] */
let hidingModals = [];

let currentFader;
let hidingFaders = [];
let currentHidingFaderInUpdate;
let showStack = [];
let scale = 1;

let domElement;
let initialized;

let onClickOnceCallbacks = [];

let _rendererWidth,
	_rendererHeight;

let resizeOutJump;
let fireNextOnResizeImmediately;

class Game {

	constructor() {
		/** @type { GameDataModel } */
		this.data = {};
		
		this.isMobile = PIXI.utils.isMobile;
		/** @type { ThingSceneAllMap } */
		this.all = null;

		/// #if EDITOR
		this.isPortrait = false;
		this.isFocused = false;
		this.isCanvasMode = false;
		this._isCanvasRotated = false;
		this.isUpdateBeforeRender = false;
		this.__EDITOR_mode = true;
		/// #endif
	}

	get modalsCount() {
		return modals.length;
	}
	/** Scene or top modal object (if present) currently shown on stage. 
	 * @type {PIXI.Container} 
	 * @see https://github.com/Megabyteceer/thing-editor/wiki/Game#currentcontainer--displayobject
	*/
	get currentContainer() {
		if (modals.length > 0) {
			return modals[modals.length - 1]; //top modal is active
		}
		return this.currentScene; //current scene is active if no modals on screen
	}
	/** current fader (if present). 
	 * @type {PIXI.Container | null} 
	*/
	get currentFader() {
		return currentFader;
	}

	/**
	* @protected
	 */

	onResize() {
		let w, h;
		if(!domElement) return;
		if (domElement === document.body) {
			w = window.innerWidth;
			h = window.innerHeight;
		} else {
			w = domElement.clientWidth;
			h = domElement.clientHeight;
		}

		//let debugInfo = 'w: ' + w + '; h: ' + h;

		let dynamicStageSize = game.projectDesc.dynamicStageSize;

		let orientation;
		/// #if EDITOR

		if(this.__fixedViewport) {
			if(this.__fixedViewport === true) {
				let size = editor._getProjectViewportSize(true);
				w = size.w;
				h = size.h;
			} else {
				w = this.__fixedViewport.w;
				h = this.__fixedViewport.h;
				
			}if(this.__enforcedOrientation === 'portrait') {
				let tmp = w;
				w = h;
				h = tmp;
			}
		}

		if(this.__enforcedW) {
			w = this.__enforcedW;
		}
		if(this.__enforcedH) {
			h = this.__enforcedH;
		}



		if ((this.projectDesc.screenOrientation === 'auto')) {
			orientation = this.__enforcedOrientation;
		} else {
		/// #endif
			orientation = this.projectDesc.screenOrientation;
		/// #if EDITOR
		}
		
		if (dynamicStageSize) {
			if(orientation === 'portrait') {
				if(w > h*0.8) {
					w = Math.round(h*0.8);
				}
			} else {
				if(h > w*0.8) {
					h = Math.round(w*0.8);
				}
			}
		}
		/// #endif

		if (orientation === 'auto') {
			orientation = (w < h) ? 'portrait' : 'landscape';
		}

		let rotateCanvas;

		switch (orientation) {
		case 'portrait':
			rotateCanvas = w > h;
			game.isPortrait = true;
			break;
		case 'auto':
			game.isPortrait = w < h;
			break;
		default: //landscape
			rotateCanvas = h > w;
			game.isPortrait = false;
			break;
		}
	
		if(!PIXI.utils.isMobile.any // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false	
			/// #endif
		) { //rotate canvas for fixed orientation projects on mobile only
			rotateCanvas = false;
		}

		if(game.isPortrait) {
			/** game screen current width */
			this.W = this.projectDesc.portraitWidth || 408;
			/** game screen current height */
			this.H = this.projectDesc.portraitHeight || 720;
		} else {
			this.W = this.projectDesc.width || 1280;
			this.H = this.projectDesc.height || 720;
		}

		
		if(!dynamicStageSize) {
			if(game.projectDesc.preventUpscale // eslint-disable-line no-constant-condition
			/// #if EDITOR
			|| true
			/// #endif
			) {
				if(rotateCanvas) {
					w = Math.min(this.H, w);
					h = Math.min(this.W, h);
				} else {
					w = Math.min(this.W, w);
					h = Math.min(this.H, h);
				}
			}
		}

		let S;
		if(rotateCanvas) {
			S = Math.min(h / this.W, w / this.H);
		} else {
			S = Math.min(w / this.W, h / this.H);
		}

		if(dynamicStageSize) {
			if (game.projectDesc.preventUpscale) {
				if (S < 1) {
					w = w / S;
					h = h / S;
				}
				S = 1;
			} else {
				w = w / S;
				h = h / S;
			}
		}

		let s = 1;
		if(this.isMobile.any // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false	
			/// #endif
		) {
			if(game.projectDesc.renderResolutionMobile) {
				s = game.projectDesc.renderResolutionMobile;
			}
		} else {
			if(game.projectDesc.renderResolution) {
				s = game.projectDesc.renderResolution;
			}
		}
		s = Math.max(window.devicePixelRatio || 1, s);
		S *= s;
		S = Math.min(3, S);
		/// #if EDITOR
		if(!document.fullscreenElement) {
			S = 1;
		}
		/// #endif

		if(this.pixiApp && this.pixiApp.renderer) {
			game.isCanvasMode = !this.pixiApp.renderer.gl;
			if(!game.isCanvasMode) {
				let gl = this.pixiApp.renderer.gl;
				let maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
				if(maxTextureSize < 3000) {
					S = Math.min(1, S);
				}

				if(w * S > maxTextureSize) {
					S = maxTextureSize / w;
				}
				if(h * S > maxTextureSize) {
					S = maxTextureSize / h;
				}
			}
		}
	
		if(dynamicStageSize) {
			if(rotateCanvas) {
				this.H = w;
				this.W = h;
			} else {
				this.W = w;
				this.H = h;
			}
		}

		let rendererWidth, rendererHeight;
		if(rotateCanvas) {
			rendererWidth = this.H;
			rendererHeight = this.W;
		} else {
			rendererWidth = this.W;
			rendererHeight = this.H;
		}

		this.W = Math.round(this.W);
		this.H = Math.round(this.H);

		if(this.W & 1) { //make even game logical size only. Keep canvas fit to client
			this.W++;
		}
		if(this.H & 1) {
			this.H++;
		}

		let needResizeRenderer = (_rendererWidth !== rendererWidth) || (_rendererHeight !== rendererHeight) || (scale !== S);

		//PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

		if (game.pixiApp) {


			_rendererWidth = rendererWidth;
			_rendererHeight = rendererHeight;
			scale = S;


			let stage = game.stage;

			game._isCanvasRotated = rotateCanvas;

			if(rotateCanvas) {
				stage.rotation = Math.PI / 2.0;
				stage.x = this.H;
			} else {
				stage.rotation = 0;
				/// #if EDITOR
				/*
				/// #endif
				stage.x = 0;
				//*/
			}
			
			if (needResizeRenderer) {
				/*
				if(!game.__EDITOR_mode && Lib.hasPrefab('ui/sure-question')) {
					game.showQuestion('', 'W: ' + _rendererWidth +
						';   H: ' + _rendererHeight +
						';\nS: ' + S +
						'\n\nw: ' + domElement.clientWidth +
						';   h: ' + domElement.clientHeight +
						';\nration: ' + window.devicePixelRatio
					);
				}//*/

				/// #if EDITOR
				if(!this.__enforcedW) {
					/// #endif
					let renderer = game.pixiApp.renderer;

					renderer.resolution = scale;

					PIXI.InteractionManager.resolution = scale;
					renderer.plugins.interaction.resolution = scale;

					if (renderer.rootRenderTarget) {
						renderer.rootRenderTarget.resolution = scale;
					}

					renderer.resize(_rendererWidth + 0.0001, _rendererHeight + 0.0001); //prevent canvas size decreasing by pixel because of Math.ceil
					/// #if EDITOR
				}
				/// #endif

				this.forAllChildrenEverywhere(processOnResize);

				/// #if EDITOR
				if(!this.__enforcedW) {
					editor.onEditorRenderResize();
				}
				/// #endif
			}

			assert(_rendererWidth, "Render's size was not calculated correctly.");
			assert(_rendererHeight, "Render's size was not calculated correctly.");
	
		}
	}

	/// #if EDITOR
	__setFixedViewport(fixedViewport) {
		this.__fixedViewport = fixedViewport;
		this.onResize();
	}
	/// #endif

	openUrl(url, target = '_blank') {
		game.addOnClickOnce(() => {
			window.open(url, target);
		});
	}

	init(element, gameId, resourcesPath = '') {
		game.additionalLoadingsInProgress = 0;
		//make objects visible by text path fo getValueByPath methods]
		this.getValueByPath = getValueByPath;
		game.Lib = Lib;
		this.game = game;
		this.Sound = Sound;
		this.L = L;
		this.setValueByPath = setValueByPath;
		this.classes = Lib.classes;

		this.onResize = this.onResize.bind(this);
		/// #if EDITOR
		this.onResize.___EDITOR_isHiddenForChooser = true;

		this.__time = 0;
		/*
		/// #endif
		this.time = 0;
		//*/

		/** @type ThingProjectSettings */
		this.projectDesc = this.projectDesc || {};


		/// #if DEBUG
		this._FPS = 0;
		this.FPS = 0;

		if (false) { /*eslint-disable-line no-constant-condition */
			/// #endif
			assert(editor, '"assert" invoking was not removed from release build. Check if "assert-strip-loader.js" is not removed from webpack config.');
			/// #if DEBUG
		}
		/// #endif
		this.fullscreen = FullScreen;

		assert(!initialized, "game already initialized.");
		initialized = true;
		this.keys = Keys;
		if (!gameId) {
			gameId = window._thingEngineAssets.projectDesc.id;
		}
		this.settings = new Settings(gameId);
		this.gameId = gameId;
		this._updateGlobal = this._updateGlobal.bind(this);

		/// #if EDITOR
		if (!editor) {
			throw "#if EDITOR was not cut-of by assert-strip-loader";
		}
		this.__mouse_EDITOR = {x: 0, y: 0};
		/// #endif

		/**
		 * @typedef {Object} Mouse
		 * @property {boolean} click
		 */
		/** @type {Mouse & PIXI.Point}*/
		this.mouse = new PIXI.Point();
		/// #if EDITOR
		this.mouse.___EDITOR_isGoodForChooser = true;
		this.mouse.___EDITOR_isHiddenForCallbackChooser = true;
		/// #endif

		this.resourcesPath = resourcesPath;

		let ret = new Promise((resolve) => {
			this._gameInitializedResolve = resolve;
		});

		domElement = element || document.body;
		/// #if EDITOR
		this._initInner();
		return ret;
		/// #endif

		assets = window._thingEngineAssets; /*eslint-disable-line no-unreachable */
		this.applyProjectDesc(assets.projectDesc);
		this._initInner();
		return ret;
	}

	/* texture settings bits
	1 - load on demand
	2 - load on demand with early precache
	4 - generate mip-maps
	8 - wrap mode repeat
	16 - wrap mode repeat mirror
	*/
	_getTextureSettingsBits(name, mask) {
		let s = game.projectDesc.loadOnDemandTextures;
		return s.hasOwnProperty(name) ? (s[name] & mask) : 0;
	}
	/// #if EDITOR
	__setTextureSettingsBits(name, bits, mask = 0xffffffff ) {
		let current = game._getTextureSettingsBits(name, 0xffffffff);
		let n = (current & (mask ^ 0xffffffff)) | bits;
		if(n !== current) {
			if(n === 0) {
				delete game.projectDesc.loadOnDemandTextures[name];
			} else {
				game.projectDesc.loadOnDemandTextures[name] = n;
			}
			editor.saveProjectDesc();

			const TEXTURE_BITS = 4 | 8 | 16;
			if(Lib.hasTexture(name) && ((current & TEXTURE_BITS) !== (n & TEXTURE_BITS))) {
				let baseTexture = Lib.getTexture(name).baseTexture;
				baseTexture.mipmap = (n & 4) ? PIXI.MIPMAP_MODES.ON : PIXI.MIPMAP_MODES.OFF;
				const w = PIXI.WRAP_MODES;
				if(n & 16) {
					baseTexture.wrapMode = w.MIRRORED_REPEAT;
				} else if (n & 8) {
					baseTexture.wrapMode = w.REPEAT;
				} else {
					baseTexture.wrapMode = w.CLAMP;
				}
				baseTexture.update();
				editor.TexturesView.refresh();
			}
		}
	}
	/// #endif

	addOnClickOnce(callback) {
		onClickOnceCallbacks.push(callback);
	}
	/**
	* @protected
	 */

	applyProjectDesc(projectDescriptor) {
		let def = {
			defaultFont: 'Arial',
			screenOrientation: "landscape",
			width: 1280,
			height: 720,
			portraitWidth: 408,
			portraitHeight: 720,
			renderResolution: 1,
			renderResolutionMobile: 1,
			framesSkipLimit: 4,
			dynamicStageSize: false,
			preventUpscale: false,
			webfontloader: null,
			fontHolderText: 'ЯSфz',
			muteOnFocusLost: true,
			mipmap: false,
			version:"0.0.1",
			soundFormats: [
				"ogg",
				"aac"
			],
			soundDefaultBitrate: 96,
			soundBitrates: {
			},
			loadOnDemandSounds: {
			},
			loadOnDemandTextures: {
			},
			__loadOnDemandTexturesFolders:{
				
			},
			defaultMusVol: 1,
			defaultSoundsVol: 1,
			keepSoundWhilePageUpdate: false,
			embedLocales: true,
			__localesNewKeysPrefix: '',
			__externalTranslations: [],
			autoFullscreenDesktop: false,
			autoFullscreenMobile: false,
			__proxyFetchesViaNodeServer: false,
			__group: '',
			__webpack: {
				debug: 'config/webpack.debug.js',
				production: 'config/webpack.prod.js'
			},
			jpgQuality: 95,
			pngQuality: [0.95, 1]
		};
		let isModified = false;
		for(let name in def) {
			if(!projectDescriptor.hasOwnProperty(name)) {
				projectDescriptor[name] = def[name];
				isModified = true;
			}
		}

		let so = projectDescriptor.screenOrientation;
		assert(so === 'auto' || so === 'landscape' || so === 'portrait', 'Wrong value for "screenOrientation". "auto", "landscape" or "portrait" expected', 30010);
		
		PIXI.settings.MIPMAP_TEXTURES = projectDescriptor.mipmap
			? PIXI.MIPMAP_MODES.ON
			: PIXI.MIPMAP_MODES.OFF;

		PIXI.settings.GC_MODE = PIXI.GC_MODES.MANUAL;
		
		this.projectDesc = projectDescriptor;
		this.onResize();
		return isModified;
	}
	
	/// #if EDITOR
	/**
	* @protected
	 */

	async _initInner() {
		/*
	/// #endif
	_initInner() {
		if(assets.sounds && Object.keys(assets.sounds).length) {
			Sound.checkSoundLockByBrowser();
		}
		//*/
		game.additionalLoadingsInProgress++;

		/// #if EDITOR
		await
		/// #endif
		Promise.all([
			loadFonts(),
			loadLocalizations()
		]).then(() => {
			game.additionalLoadingsInProgress--;
		});

		this.onResize();

		let isFlickeringDevice = maliDetect();

		app = new PIXI.Application({
			width: _rendererWidth,
			height: _rendererHeight,
			backgroundColor: 0,
			preserveDrawingBuffer: isFlickeringDevice
		}); //antialias, forceFXAA
		this.pixiApp = app;
		/// #if EDITOR
		this.pixiApp.___EDITOR_isHiddenForChooser = true;
		/// #endif
		domElement.appendChild(app.view);

		const clickHandler = (ev) => { // calls browsers functions which require to be fired in user context event
			while (onClickOnceCallbacks.length > 0) {
				let f = onClickOnceCallbacks.shift();
				f(ev);
			}
			/// #if EDITOR
			return; 
			/// #endif

			if(game.isMobile.any ? game.projectDesc.autoFullscreenMobile : game.projectDesc.autoFullscreenDesktop) {	// eslint-disable-line no-unreachable
				if(game.fullscreen.isAvailable && !game.fullscreen.isFullscreen) {
					game.fullscreen._openInner();
				}
			}
		};
		app.view.addEventListener('click', clickHandler);
		app.view.addEventListener('touchend', clickHandler);

		let interaction = game.pixiApp.renderer.plugins.interaction;
		interaction.on('pointerdown', mouseHandlerGlobalDown);
		interaction.on('pointermove', mouseHandlerGlobalMove);
		interaction.on('pointerup', mouseHandlerGlobalUp);
		this._mouseHandlerGlobal = mouseHandlerGlobal;

		stage = new Container();

		stage.name = 'stage';
		this.stage = stage;

		this.onResize();

		app.stage.addChild(stage);
		
		app.ticker.add(this._updateGlobal);

		Sound.init();

		this._gameInitializedResolve();
		delete this._gameInitializedResolve;

		/// #if EDITOR
		return;
		/// #endif

		this._startGame(); /*eslint-disable-line no-unreachable */
		
		window.addEventListener('resize', this._onContainerResize.bind(this));
	}
	/**
	* @protected
	 */

	_fireNextOnResizeImmediately() {
		fireNextOnResizeImmediately = true;
	}
	/**
	* @protected
	 */

	_onContainerResize() {
		if (resizeOutJump) {
			clearTimeout(resizeOutJump);
		}
		if(fireNextOnResizeImmediately) {
			fireNextOnResizeImmediately = false;
			this.onResize();
		} else {
			resizeOutJump = setTimeout(() => {
				resizeOutJump = false;
				if(game.isMobile.any // eslint-disable-line no-constant-condition
					/// #if EDITOR
					&& false	
					/// #endif
				) {
					for(let i of [20,40,80,200,500,1000,1500,2000,3000]) {
						setTimeout(this.onResize, i);
					}
				}
				this.onResize();
			}, game.isMobile.any // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false	
			/// #endif
				? 1 : 200);
		}
	}
	/**
	* @protected
	 */

	_startGame() {
		let preloader = new Preloader();
		Lib._setPrefabs(assets.prefabs);
		Lib._setScenes(assets.scenes);
		Lib._setSounds(assets.sounds);
		if(assets.resources) {
			for(let r of assets.resources) {
				if (assets.resourcesMetadata && assets.resourcesMetadata[r]) {
					Lib.addResource(r, {metadata: assets.resourcesMetadata[r]});
				} else {
					Lib.addResource(r);
				}
			}
		}
		Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
		Lib.addTexture('WHITE', PIXI.Texture.WHITE);

		let loader = new ResourceLoader();
		
		assets.images.some((tName) => {
			if(!game._getTextureSettingsBits(tName, 3)) {
				loader.add(textureNameToPath(tName));
			}
		});
		loader.load();
		preloader.start(() => {
			assets.images.some((tName) => {
				let texture = PIXI.utils.TextureCache[textureNameToPath(tName)];
				if(texture) {
					Lib.addTexture(tName, texture);
				}
			});
			Object.values(assets.prefabs).forEach(Lib._filterStaticTriggersRecursive);
			Object.values(assets.scenes).forEach(Lib._filterStaticTriggersRecursive);
			this.showScene(assets.projectDesc.mainScene || 'main');
			Lib._preCacheSoundsAndTextures();
		});
	}
	/**
	* @protected
	 */
	_setCurrentScene(scene) {
		if(scene) {
			game.all = scene.all;
		} else {
			game.all = null;
		}
		/// #if EDITOR
		__currentSceneValue = scene;
		return;
		/*
		/// #endif
		game.currentScene = scene;
		//*/
	}

	/**
	* @protected
	 */
	_setCurrentSceneContent(scene) {
		assert(!game.currentScene, "Attempt to set current scene content with previous scene exists.");
		scene = checkScene(scene);
		this._setCurrentScene(scene);
		scene.interactiveChildren = false;
		stage.addChildAt(scene, 0);
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			loadDynamicTextures();
		}
		__getNodeExtendData(game.currentScene).toggled = true;
		editor.refreshTreeViewAndPropertyEditor();

		if(game.__EDITOR_selectionDataWaitingToSelect) {
			editor.selection.loadSelection(game.__EDITOR_selectionDataWaitingToSelect);
			editor.ui.viewport.resetZoom();
			delete game.__EDITOR_selectionDataWaitingToSelect;
		}

		/// #endif
		scene._onShowCalled = false;
		return scene;
	}

	get disableAllButtons() {
		return !!currentFader;
	}

	faderShoot() {
		/// #if EDITOR
		assert(__isCurrentFaderUpdateInProgress, "game.faderShoot() called not by fader.", 10033);
		assert(!__getNodeExtendData(currentFader).isFaderShootCalledForThisFader, "game.faderShoot() already called for this fader.", 10034);
		__getNodeExtendData(currentFader).isFaderShootCalledForThisFader = true;
		/// #endif
		while (hideTheseModalsUnderFader.length > 0) {
			let m = hideTheseModalsUnderFader.pop();
			let i = modals.indexOf(m);
			if(i >= 0) {
				modals.splice(i, 1);
				Lib.destroyObjectAndChildren(m);
			}
		}
		while (hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m);
		}
		game._isWaitingToHideFader = true;
	}

	/**
	* @protected
	 */
	_processScenesStack() {
		assert(game.getLoadingCount() === 0, "Attempt to change stack during loading");
		while(true) { // eslint-disable-line no-constant-condition
			let topStackElement = showStack[showStack.length -1];
			if(topStackElement === game.currentScene) {
				break;
			}
			if(game.currentScene) {
				if(game.currentScene._onShowCalled) {
					game.currentScene.onHide();
				}
				tryRemoveCurrentScene();
			}
			topStackElement = showStack[showStack.length -1];
			showStack[showStack.length -1] = game._setCurrentSceneContent(topStackElement);
		}
	}

	faderEnd() {
		if(currentHidingFaderInUpdate) {
			let i = hidingFaders.indexOf(currentHidingFaderInUpdate);
			assert(i >= 0, "hidingFaders list is corrupted");
			hidingFaders.splice(i, 1);
			Lib.destroyObjectAndChildren(currentHidingFaderInUpdate);
			currentHidingFaderInUpdate = null;
			/// #if EDITOR
			editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	/**
	 * @param {Scene | string} scene - scene name or scene instance
	 * @param {string} faderType - name of fader prefab
	 */
	replaceScene(scene, faderType) {
		/// #if EDITOR
		assert(checkSceneName(scene));
		/// #endif
		assert(showStack.length > 0, "Can not replace scene. No scene to replace is present.");
		tryRemoveScene(showStack.pop());
		showStack.push(scene);
		game._startFaderIfNeed(faderType);
	}

	/**
	 * @param {Scene | string} scene - scene name or scene instance
	 * @param {string} faderType - name of fader prefab
	 */
	showScene(scene, faderType) {
		/// #if EDITOR
		assert(checkSceneName(scene));
		/// #endif
		showStack.push(scene);
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			showStack = [scene];
		}
		/// #endif
		game._startFaderIfNeed(faderType);
	}

	/**
	 * @param {string} faderType - name of fader prefab
	 */
	closeAllScenes(faderType) {
		while (showStack.length > 1) {
			game.closeCurrentScene(faderType);
		}
	}

	/**
	 * @param {string} faderType - name of fader prefab
	 */
	closeCurrentScene(faderType) {
		/// #if EDITOR
		if(showStack.length <= 1) {
			editor.ui.modal.notify("It is no other scene in stack to close current scene.");
			return;
		}
		/// #endif
		assert(showStack.length > 1, "Can't close latest scene", 10035);
		tryRemoveScene(showStack.pop());
		game._startFaderIfNeed(faderType);
	}

	/**
	* @protected
	 */
	_startFaderIfNeed(faderType) {
		if(showStack[showStack.length - 1] !== game.currentScene) {
			/// #if EDITOR
			if(game.__EDITOR_mode) {
				let i = showStack.length - 1;
				this.__destroyCurrentScene();
				let s = this._setCurrentSceneContent(showStack[i]);
				showStack[i] = s;
				BgMusic._recalculateMusic();
				return;
			}
			/// #endif
			hideTheseModalsUnderFader = modals.slice();
			if(!currentFader) {
				assert(!game._isWaitingToHideFader, "_isWaitingToHideFader is true when no currentFader exists.");
				if(!faderType) {
					if(this.currentScene && this.currentScene.faderType) {
						faderType = this.currentScene.faderType;
					} else {
						faderType = 'fader/default';
					}
				}
				currentFader = Lib.loadPrefab(faderType);
				this.stage.addChild(currentFader);
				BgMusic._recalculateMusic();
			}
			/// #if EDITOR
			editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	/// #if DEBUG
	__showDebugError(txt, errorCode = 90000) {
		/// #if EDITOR
		editor.ui.modal.showError(txt, errorCode);
		return;
		/// #endif
		alert(txt); // eslint-disable-line no-unreachable
	}
	/// #endif

	/// #if EDITOR

	/** Time in frames since game start */
	get time() {
		return this.__time;
	}

	/** Scene currently shown on stage. 
	 * @type {CurrentSceneType}
	 * @see https://github.com/Megabyteceer/thing-editor/wiki/Game#currentscene--scene
	*/
	get currentScene() {
		return __currentSceneValue;
	}
	
	/**
	* @protected
	 */
	__destroyCurrentScene() {
		if (this.currentScene) {
			Lib.destroyObjectAndChildren(this.currentScene);
			this._setCurrentScene(null);
		}
	}
	
	/**
	* @protected
	 */
	get __enforcedOrientation() {
		return this.___enforcedOrientation;
	}

	set __enforcedOrientation(v) {
		assert(!v || v === 'landscape' || v === 'portrait', 'Wrong value for game.__enforcedOrientation. "landscape" or "portrait" expected');
		this.___enforcedOrientation = v;
		if (initialized) {
			this.onResize();
		}
	}
	
	/**
	* @protected
	 */
	__loadImagesIfUnloaded(names) {
		names = names.filter(n => !Lib.hasTexture(n));
		if(names.length) {
			editor.ui.modal.showSpinner();
			let sprites = [];
			while(names.length) {
				let s = Lib._loadClassInstanceById('Sprite');
				s.image = names.pop();
				stage.addChildAt(s, 0);
				sprites.push(s);
			}
			loadDynamicTextures();

			editor.waitForCondition(() => {
				return game.getLoadingCount() === 0;
			}).then(() => {
				editor.ui.modal.hideSpinner();
				while(sprites.length) {
					Lib.destroyObjectAndChildren(sprites.pop());
				}
			});
		}
	}
	
	/**
	* @protected
	 */
	__setCurrentContainerContent(object) {
		assert(game.__EDITOR_mode, 'attempt to replace current container content in running mode');
		if (modals.length > 0) {
			this.hideModal();
			__getNodeExtendData(object).isPreviewObject = true;
			this.showModal(object);
		} else {
			if (!object.name) {
				object.__libSceneName = game.currentScene.name;
			}
			this.showScene(object);
		}
	}
	
	/**
	* @protected
	 */
	__clearStage() {
		while (this.modalsCount > 0) {
			this.hideModal(undefined, true);
		}
		while (hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m);
		}

		while (showStack.length > 0) {
			tryRemoveScene(showStack.pop());
		}

		tryRemoveCurrentScene();

		if (currentFader) {
			Lib.destroyObjectAndChildren(currentFader);
			currentFader = null;
		}
		game._isWaitingToHideFader = false;
		while (hidingFaders.length > 0) {
			Lib.destroyObjectAndChildren(hidingFaders.pop());
		}
		Lib.__clearStaticScenes();
		BgMusic._recalculateMusic();
	}
	/// #endif
	/**
	 * @return {Array<Scene|string>}
	 * returned array can contain scenes or scenes names. Names will be instanced in to scenes just before showing on screen
	 */
	_getScenesStack() {
		return showStack;
	}
	/**
	 * @param {string} title
	 * @param {string} message
	 * @param {string} yesLabel
	 * @param {Function} onYes
	 * @param {Function} noLabel
	 * @param {Function} onNo
	 * @param {boolean} easyClose
	 * @param {string} prefab
	 * 
	 * @return {DisplayObject}
	 */
	showQuestion(title, message, yesLabel=null, onYes = null, noLabel = null, onNo = null, easyClose = true, prefab = 'ui/sure-question') {
		let o = Lib.loadPrefab(prefab);
		SureQuestion.init(o, title, message, yesLabel, onYes, noLabel, onNo, easyClose);
		return game.showModal(o);
	}

	/**
	 * @param {DisplayObject|string} displayObject - display object or prefab's name
	 * @param {Function} [callback]
	 * 
	 * @return {DisplayObject}
	 */
	showModal(displayObject, callback) {
		/// #if EDITOR
		if (game.__EDITOR_mode && !__getNodeExtendData(displayObject).isPreviewObject) {
			assert(false, 'Attempt to show modal in editor mode: ' + (displayObject.name || displayObject), 10047);
			return;
		}
		/// #endif
		if (typeof displayObject === "string") {
			displayObject = Lib.loadPrefab(displayObject);
		}
		assert(displayObject instanceof DisplayObject, "Attempt to show not DisplayObject as modal");
		assert(!(displayObject instanceof Scene), 'Scene can not be used as modal', 10037);
		modals.push(displayObject);
		displayObject._onModalHide = callback;
		displayObject.interactiveChildren = false;
		game.stage.addChild(displayObject);
		BgMusic._recalculateMusic();
		/// #if EDITOR
		editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		return displayObject;
	}
	/**
	 * @param {DisplayObject|null} displayObject - display object to hide or null to hide top level modal
	 * @param {boolean} instantly
	 */
	hideModal(displayObject = null, instantly = false) {
		let modalToHide;
		if (!displayObject) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.', 10038);
			modalToHide = modals.pop();
		} else {
			let i = modals.indexOf(displayObject);
			assert(i >= 0, 'Attempt to hide modal object which is not in modal list.', 10039);
			if (i < 0) {
				return;
			}
			modalToHide = modals[i];
			modals.splice(i, 1);
		}
		
		if(modalToHide._onModalHide 
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			modalToHide._onModalHide();
			delete modalToHide._onModalHide;
		}

		if (instantly
			/// #if EDITOR
			||
			game.__EDITOR_mode
			/// #endif
		) {
			Lib.destroyObjectAndChildren(modalToHide);
		} else {
			modalToHide.interactiveChildren = false;
			hidingModals.push(modalToHide);
		}
		BgMusic._recalculateMusic();
		/// #if EDITOR
		editor.refreshTreeViewAndPropertyEditor();
		/// #endif
	}
	/**
	* @protected
	 */
	mouseEventToGlobalXY(ev) {
		let b = app.view.getBoundingClientRect();
		let n = ev.clientX - b.left;
		tmpPoint.x = n * (game.W / b.width);
		n = ev.clientY - b.top;
		tmpPoint.y = n * (game.H / b.height);
		return tmpPoint;
	}
	/**
	* @protected
	 */
	_updateGlobal(dt) {

		if(!game.isFocused && game.projectDesc.keepSoundWhilePageUpdate) {
			focusChangeHandler(true);
		}

		/// #if DEBUG
		this._FPS++;
		let now = Date.now();
		if((now - lastFPSTime) >= 1000) {
			this.FPS = this._FPS;
			this._FPS = 0;
			lastFPSTime = now;
		}
		/// #endif

		/// #if EDITOR
		editor.ui.viewport.checkIfNeedRecovery();
		editor.frameUpdateException = true;
		if ((!this.__paused || this.__doOneStep) && !this.__EDITOR_mode) {
			/// #endif


			ScrollLayer.updateGlobal();
		
			dt = Math.min(dt, FRAME_PERIOD_LIMIT);
			/// #if EDITOR
			dt = 1;
			/// #endif

			frameCounterTime += dt;
			frameCounterTime = Math.min(frameCounterTime, FRAME_PERIOD * game.projectDesc.framesSkipLimit);
			while (frameCounterTime > FRAME_PERIOD) {

				/// #if DEBUG
				frameCounterTime -= FRAME_PERIOD / game.__speedMultiplier;
				/*
				/// #endif
				frameCounterTime -= FRAME_PERIOD;
				//*/

				game.isUpdateBeforeRender = !(frameCounterTime > FRAME_PERIOD);
				this._updateFrame();

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
		/// #if EDITOR
		editor.frameUpdateException = false;
		/// #endif
		if (this.currentScene) {
			app.renderer.backgroundColor = this.currentScene.backgroundColor;

			this.currentScene.interactiveChildren = ((this.modalsCount === 0) && !currentFader);
			let i = this.modalsCount - 1;
			let isCurrent = !currentFader;
			while (i >= 0) {
				modals[i].interactiveChildren = isCurrent;
				isCurrent = false;
				i--;
			}
		}
	
	}

	forAllChildrenEverywhereBack(callback) {
		for (let s of showStack) {
			if (typeof s !== 'string') {
				callback(s);
				if (!s.parent) {
					callback(s);
					s.forAllChildren(callback);
				}
			}
		}

		const staticScenes = Lib._getStaticScenes();
		for (let n in staticScenes) {
			let s = staticScenes[n];
			if (!s.parent) {
				callback(s);
				s.forAllChildren(callback);
			}
		}
	}

	getLoadingCount(
	/// #if EDITOR
		ignoreInGamePromises = false
	/// #endif
	) {
		let count = Lib.getSoundsLoadingCount();

		count += ResourceLoader.getLoadingCount();
		if(game.additionalLoadingsInProgress) {
			count += game.additionalLoadingsInProgress;
		}
		/// #if EDITOR
		if(!ignoreInGamePromises) {
		/// #endif
			if(currentFader) {
				count += currentFader.findChildrenByType(SceneLinkedPromise).length;
			}
		/// #if EDITOR
		}
		/// #endif
		
		return count;
	}

	forAllChildrenEverywhere(callback) {
		game.stage.forAllChildren(callback);
		game.forAllChildrenEverywhereBack(callback);
	}
	/**
	* @protected
	 */
	_hideCurrentFaderAndStartScene() {
		currentFader.gotoLabelRecursive('hide fader');
		hidingFaders.unshift(currentFader);
		/// #if EDITOR
		editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		currentFader = null;
		BgMusic._recalculateMusic();
	}
	/**
	* @protected
	 */
	_updateFrame() {
		if(game._loadingErrorIsDisplayed) {
			return;
		}

		if(!game.isCanvasMode) {
			if(game.pixiApp.renderer.gl.isContextLost()) {
				if(game.isFocused) {
					contextLoseTime++;
					if(contextLoseTime === 60) {
						window.location.reload();
					}
				}
				return;
			}
			contextLoseTime = 0;
		}

		if(game._isWaitingToHideFader) {
			if(game.getLoadingCount() === 0) {
				game._processScenesStack();
				if(!game.currentScene._onShowCalled) {
					game.currentScene._onShowCalled = true;
					game.currentScene.onShow();
					loadDynamicTextures();
				} else {
					game._hideCurrentFaderAndStartScene();
					game._isWaitingToHideFader = false;
				}
			}
		} else if(this.currentContainer) {
			if(!currentFader || (this.currentContainer !== this.currentScene) || (hidingModals.length < 1)) {
				this.currentContainer.update();
			}
		}
		
		if (currentFader) {
			/// #if EDITOR
			__isCurrentFaderUpdateInProgress = true;
			/// #endif
			currentFader.update();
			/// #if EDITOR
			__isCurrentFaderUpdateInProgress = false;
			/// #endif
		}
		let fi = hidingFaders.length - 1;
		while (fi >= 0) {
			let fader = hidingFaders[fi];
			currentHidingFaderInUpdate = fader;
			fader.update();
			fi--;
		}
		if(!currentFader) {
			let i = hidingModals.length - 1; //hide modals process
			while (i >= 0) {
				let m = hidingModals[i];
				m.alpha -= 0.1;
				if (m.alpha <= 0.01) {
					Lib.destroyObjectAndChildren(m);
					hidingModals.splice(i, 1);
					/// #if EDITOR
					editor.refreshTreeViewAndPropertyEditor();
					/// #endif
				}
				i--;
			}
		}
		this.keys.update();
		Lib._cleanupRemoveHolders();
		/// #if EDITOR
		this.__time++;
		/*
		/// #endif
		this.time++;
		//*/
	}
	/**
	 * @protected
	 */
	fetchResource(url) { /// #
		return new Promise((resolve) => {
			let loader = new ResourceLoader();
			loader.add(url, url);
			loader.load((loader, resources) => {
				resolve(resources[url].data);
			});
		});
	}
	/**
	* @protected
	 */
	_onLoadingError(url) {
		if(game._loadingErrorIsDisplayed) {
			return;
		}
		ResourceLoader.destroyAllLoaders();
		game._loadingErrorIsDisplayed = true;
		BgMusic._recalculateMusic();
		/// #if EDITOR
		editor.ui.modal.showError('Could not load file: ' + url);
		return;
		/// #endif

		let e = document.createElement('div');// eslint-disable-line no-unreachable
		e.innerHTML = `

<div class="loading-error-wrapper" style="
			position:absolute;
			z-index: 2;
			width:100%;
			height:100%;
			left:0;
			top:0;
			background:rgba(0,0,0,0.7)">
	<div class="loading-error-body" style="
			padding: 5vh;
			margin: 20vh 0;
			width: 100%;
			background: #000000;
			text-align: center;
			color: #ffffff;
			font-family: ` + game.projectDesc.defaultFont + `;">
		<div class="loading-error-game-title">` + game.projectDesc.title + `</div>
		<div class="loading-error-title" style="
			margin: 2vh;
			font-size:200%;">
			LOADING ERROR</div>
		<div class="loading-error-message">(click to reload)</div>
	</div>
</div>`;
		document.body.appendChild(e);
		document.addEventListener('click', () => {
			document.location.reload();
		});
	}

	applyCSS(css) {
		let head = document.head || document.getElementsByTagName('head')[0];
		let style = document.createElement('style');

		style.type = 'text/css';
		if (style.styleSheet){
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}
		head.appendChild(style);
	}

	/// #if DEBUG
	/**
	 * @protected
	 */
	get __speedMultiplier() {
		return __speedMultiplier;
	}
	/**
	 * @protected
	 */
	set __speedMultiplier(v) {
		if(v !== __speedMultiplier) {
			__speedMultiplier = v;
			MusicFragment.__applyGameSpeed(v);
		}
	}

	_reanimateTicker() {
		requestAnimationFrame(game.pixiApp.ticker._tick);
	}
	/// #endif
}

let tmpPoint = new PIXI.Point();

const processOnResize = (o) => {
	if (o._onRenderResize) {
		o._onRenderResize();
	}
};

const mouseHandlerGlobalDown = (ev) => {
	if(!latestXY.hasOwnProperty(ev.data.pointerId)) {
		let o = {x:ev.data.global.x, y:ev.data.global.y};
		latestXY[ev.data.pointerId] = o;
		latestXYPriority.unshift(o);
	}
	if(!game.isFocused) {
		focusChangeHandler(true);
	}
	game.mouse.click = true;
	mouseHandlerGlobal(ev);
	if(
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif
		
		game.currentContainer && game.currentContainer.onMouseDown && game.currentContainer.interactiveChildren) {
		Sound._unlockSound();
		game.currentContainer.onMouseDown(game.mouse, ev);
	}
};

const mouseHandlerGlobalUp = (ev) => {
	let tmpX = ev.data.global.x;
	let tmpY = ev.data.global.y;
	if(latestXY.hasOwnProperty(ev.data.pointerId)) {
		latestXYPriority.splice(latestXYPriority.indexOf(latestXY[ev.data.pointerId]), 1);
		delete latestXY[ev.data.pointerId];
	}
	if(latestXYPriority.length > 0) {
		ev.data.global.x = latestXYPriority[0].x;
		ev.data.global.y = latestXYPriority[0].y;
	} else {
		game.mouse.click = false;
	}
	
	mouseHandlerGlobal(ev);
	ev.data.global.x = tmpX;
	ev.data.global.y = tmpY;
	if(
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif
		game.currentContainer && game.currentContainer.onMouseUp && game.currentContainer.interactiveChildren) {
		game.currentContainer.onMouseUp(game.mouse, ev);
	}
};

const mouseHandlerGlobalMove = (ev) => {
	let tmpX = ev.data.global.x;
	let tmpY = ev.data.global.y;
	let o = latestXY[ev.data.pointerId];
	if(o) {
		o.x = ev.data.global.x;
		o.y = ev.data.global.y;
	}
	o = latestXYPriority[0];
	if(o) {
		ev.data.global.x = o.x;
		ev.data.global.y = o.y;
	}

	if(ev.data.buttons === 0) {
		game.mouse.click = false;
	}
	mouseHandlerGlobal(ev);
	ev.data.global.x = tmpX;
	ev.data.global.y = tmpY;
	if(
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif
		game.currentContainer && game.currentContainer.onMouseMove && game.currentContainer.interactiveChildren) {
		game.currentContainer.onMouseMove(game.mouse, ev);
	}
};

const latestXYPriority = [];
const latestXY = {};

const mouseHandlerGlobal = (ev) => {

	if(!isFinite(ev.data.global.x)) {
		return;
	}
	let mouse = game.mouse;
	let p = game.stage.toLocal(ev.data.global, game.pixiApp.stage);

	let x = Math.round(p.x);
	let y = Math.round(p.y);

	/// #if EDITOR
	game.__mouse_EDITOR = ev.data.global;
	mouse.__EDITOR_scene_x = x;
	mouse.__EDITOR_scene_y = y;
	mouse.__EDITOR_x = Math.round(ev.data.global.x);
	mouse.__EDITOR_y = Math.round(ev.data.global.y);
	/// #endif

	if (x > game.W) {
		x = game.W;
	} else if (x < 0) {
		x = 0;
	}

	if (y > game.H) {
		y = game.H;
	} else if (y < 0) {
		y = 0;
	}
	mouse.x = x;
	mouse.y = y;
};

const game = new Game();
export default game;

if(window.cordova) {
	document.addEventListener('backbutton', function () {
		Button._tryToClickByKeycode(27);
	}, false);
	game.exitApp = (enforced = false) => {
		if(enforced) {
			navigator.app.exitApp();
		} else {
			game.showQuestion(L('SUREEXIT_TITLE'), L('SUREEXIT_TEXT') , undefined, () => {
				game.exitApp(true);
			});
		}
	};
}
/// #if DEBUG
if (PIXI.utils.isMobile.any) {
	window.addEventListener('error', function (msg, url, line, col, error) {
		let txt = JSON.stringify({msg, url, line, col, error});
		game.__showDebugError(txt);
	});
}
/// #endif

function checkScene(scene) {
	if (typeof scene === 'string') {
		scene = Lib.loadScene(scene);
	}
	assert(scene instanceof Scene, 'Scene instance expected.');
	assert(scene.name, 'Scene name is empty.');
	return scene;
}

function tryRemoveCurrentScene() {
	let s = game.currentScene;
	game._setCurrentScene(null);
	tryRemoveScene(s);
}

function tryRemoveScene(s) {
	if((s instanceof Scene) && (s !== game.currentScene)) {
		if (!s.isStatic && (showStack.indexOf(s) < 0)) {
			Lib.destroyObjectAndChildren(s);
		} else {
			s.detachFromParent();
		}
	}
}


window.addEventListener('focus', () => {focusChangeHandler(true);});
window.addEventListener('blur',  () => {focusChangeHandler(false);});
document.addEventListener('visibilitychange', () => {
	focusChangeHandler(document.visibilityState === 'visible');
});


const focusChangeHandler = (activated) => {
	if(game.isFocused !== activated) {
		game.isFocused = activated;
		if(game.pixiApp) {
			setTimeout(() => {
				if(game.projectDesc.muteOnFocusLost // eslint-disable-line no-constant-condition
					/// #if EDITOR
					&& false
					/// #endif
				) {
					BgMusic._clearCustomFades(0.2);
				}
				BgMusic._recalculateMusic();
				game.keys.resetAll();
			}, 10);
		}
	}
};
focusChangeHandler(true);

function maliDetect() {
	try {
		var canvas = document.createElement('canvas');
		canvas.setAttribute("width", "1");
		canvas.setAttribute("height", "1");
		document.body.appendChild(canvas);
		var gl = canvas.getContext('webgl', { stencil: true });
		canvas.parentNode.removeChild(canvas);
		if (!gl) {
			return false;
		}
		var dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
		var renderer;
		if (dbgRenderInfo != null) {
			renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
		} else {
			return false;
		}

		var n = renderer.search("Mali-400");
		if (n != -1) {
			return true;
		} else {
			return false;
		}
	} catch (er) {} //eslint-disable-line no-empty
}


function loadFonts() {
	if(!game.projectDesc.webfontloader) {
		return Promise.resolve();
	} else {
		return new Promise((resolve) => {
			setTimeout(() => {
				if(game.projectDesc.fontHolderText) {
					let fontHolder = document.createElement('span');
					fontHolder.style.opacity = 0;
					fontHolder.style.color = 'rgba(0,0,0,0.01)';
					fontHolder.style.position = 'absolute';
					fontHolder.style.zIndex = -1;

					for(let fontsProviderName in game.projectDesc.webfontloader) {
						let families = game.projectDesc.webfontloader[fontsProviderName].families;
						if(families) {
							for(let family of families) {
								if(fontsProviderName === 'custom') {
									let fontPath = game.resourcesPath + `fonts/` + family.replace(/ /g, '');
									game.applyCSS(`
										@font-face {
											font-family: '` + family + `';
											src: url('` + fontPath + `.woff2') format('woff2'),
											url('` + fontPath + `.woff') format('woff');
										}
									`);
								}

								let a = family.split(':');
								let fontName = a[0];
								let weights = a[1] ? a[1].split(',') : ['normal'];

								for(let w of weights) {
									let span = document.createElement('span');
									span.style.fontFamily = `"${fontName}"`;
									span.style.fontWeight = w;
									span.innerHTML = game.projectDesc.fontHolderText;
									fontHolder.appendChild(span);
								}
								
							}
						}
					}
					document.body.appendChild(fontHolder);
				}
				setTimeout(() => {
					if(!window.WebFont) {
						//webpack loading old modules hack
						try {window.WebFont = require('webfontloader');} catch (er) {}//eslint-disable-line no-undef,no-empty
					}
					assert(window.WebFont, "WebFont was not imported correctly.");
					let webFontOptions = game.projectDesc.webfontloader;
					webFontOptions.timeout = webFontOptions.timeout || 6000;
					let resolved = false;
					webFontOptions.inactive = webFontOptions.active = () => {
						if(resolved) {
							return;
						}
						resolved = true;
						resolve();
					};
					window.WebFont.load(webFontOptions);
				}, 1);
			}, 1);
		});
	}
}

function loadLocalizations() {
	/// #if EDITOR
	return Promise.resolve();
	/// #endif
	if(game.projectDesc.embedLocales) { //eslint-disable-line no-unreachable
		L.setLanguagesAssets(assets.text);
		return Promise.resolve(assets.text);
	} else {
		const localesPath = game.projectDesc.localeResourcesPath || (game.resourcesPath + 'i18n');
		return L.loadLanguages(undefined, localesPath);
	}
}

const textureNameToPath = (tName) => {
	return game.resourcesPath + 'img/' + tName;
};
game._textureNameToPath = textureNameToPath;

const pathToTextureName = (path) => {
	return path.replace(game.resourcesPath + 'img/', '');
};


function loadDynamicTextures(
	/// #if EDITOR
	onlyThisFiles
	/// #endif
) {

	assert(ResourceLoader.getLoadingCount() === 0, "Textures loading already in progress.");
	let loader;
	let texturesInProgress;
	let spritesWaitingOfTextures;
	/// #if EDITOR
	let spinnerShowed;

	let currentContainerSymbol = {};
	let currentContainer = game.currentContainer;
	if(currentContainer) {
		__getNodeExtendData(game.currentContainer)._currentContainerSymbol = currentContainerSymbol;
	}
	/// #endif
	let texturesLocked = {};

	game.stage.forAllChildren((o) => {
		if(o instanceof Sprite || o instanceof PIXI.Mesh || o instanceof Tilemap) {
			let image = o.image;
			if( image && (!Lib.hasTexture(image) && game._getTextureSettingsBits(image, 3))
				/// #if EDITOR
				&& (!onlyThisFiles || onlyThisFiles.has(image))
				/// #endif
			) {
				o.texture = 
				/// #if EDITOR
				editor.__unloadedTexture ||
				/// #endif
				Lib.getTexture('EMPTY');

				if(!loader) {
					texturesInProgress = {};
					spritesWaitingOfTextures = [];
					loader = new ResourceLoader();

					/// #if EDITOR
					if(game.__EDITOR_mode) {
						spinnerShowed = true;
						editor.ui.modal.showSpinner();
					}
					/// #endif
				}
				if(!texturesInProgress.hasOwnProperty(image)) {
					texturesInProgress[image] = true;
					let fullPath = textureNameToPath(image);
					loader.add(fullPath);
				}
				spritesWaitingOfTextures.push(o);
			} else if(game._getTextureSettingsBits(image, 3)) {
				if(!o.texture.baseTexture) { //static scene appeared with ref to destroyed texture
					o.texture = Lib.getTexture(image);
				}
				texturesLocked[image] = true;
			}
		}
	});
	/// #if EDITOR
	let unloaded = false;
	/// #endif

	for(let image in game.projectDesc.loadOnDemandTextures) {
		let textureLoadingMode = game._getTextureSettingsBits(image, 3);
		
		if(textureLoadingMode) {
			if(!texturesLocked.hasOwnProperty(image) && Lib.hasTexture(image)) {
				Lib._unloadTexture(image);
				/// #if EDITOR
				unloaded = true;
				/// #endif
			}
		}
	}
	/// #if EDITOR
	if(unloaded) {
		editor.refreshTexturesViewer();
	}
	/// #endif

	if(loader) {
		loader.load((loader, resources) => {
			/// #if EDITOR
			if(spinnerShowed) {
				editor.ui.modal.hideSpinner();
			}
			assert((currentContainer === game.currentContainer) && (!currentContainer || (__getNodeExtendData(game.currentContainer)._currentContainerSymbol === currentContainerSymbol)), "current container has changed during additional textures loading.");
			/// #endif
			for(let path in resources) {
				let imageId = pathToTextureName(path);
				Lib.addTexture(imageId, resources[path].texture);
			}
			for(let o of spritesWaitingOfTextures) {
				let t = o.image;
				o.image = "EMPTY";
				o.image = t;
				assert(o.texture, 'texture ' + t + ' was not loaded correctly');
			}
			/// #if EDITOR
			editor.refreshTexturesViewer();
			/// #endif
		});
	} else {
		/// #if EDITOR
		if(spinnerShowed) {
			editor.ui.modal.hideSpinner();
		}
		/// #endif
	}
}

/// #if DEBUG
let lastFPSTime = 0;

let __speedMultiplier;

game.__speedMultiplier = 1;
/// #endif

/// #if EDITOR
let __currentSceneValue;

function checkSceneName(scene) {
	if(typeof scene === 'string') {
		assert(Lib.hasScene(scene), "No scene with name '" + scene + "'", 10046);
	} else {
		assert(scene instanceof Scene, );
	}
	return true;
}

let __isCurrentFaderUpdateInProgress;

Game.prototype.__loadDynamicTextures = loadDynamicTextures;
Game.prototype.forAllChildrenEverywhereBack.___EDITOR_isHiddenForChooser = true;
Game.prototype.forAllChildrenEverywhere.___EDITOR_isHiddenForChooser = true;
Game.prototype.init.___EDITOR_isHiddenForChooser = true;
Game.prototype.addOnClickOnce.___EDITOR_isHiddenForChooser = true;
Game.prototype.applyProjectDesc.___EDITOR_isHiddenForChooser = true;
Game.prototype.mouseEventToGlobalXY.___EDITOR_isHiddenForChooser = true;

game.data.___EDITOR_isGoodForChooser = true;
game.data.___EDITOR_isHiddenForCallbackChooser = true;

Game.prototype.closeAllScenes.___EDITOR_isGoodForChooser = true;
Game.prototype.closeCurrentScene.___EDITOR_isGoodForChooser = true;
Game.prototype.faderEnd.___EDITOR_isGoodForChooser = true;
Game.prototype.faderShoot.___EDITOR_isGoodForChooser = true;
FullScreen.___EDITOR_isGoodForChooser = true;
Game.prototype.getLoadingCount.___EDITOR_isGoodForChooser = true;
Game.prototype.hideModal.___EDITOR_isGoodForChooser = true;
game.isMobile.___EDITOR_isGoodForChooser = true;
Keys.___EDITOR_isGoodForChooser = true;
Game.prototype.openUrl.___EDITOR_isGoodForChooser = true;
Game.prototype.replaceScene.___EDITOR_isGoodForChooser = true;
Game.prototype.showModal.___EDITOR_isGoodForChooser = true;
Game.prototype.showQuestion.___EDITOR_isGoodForChooser = true;
Game.prototype.showScene.___EDITOR_isGoodForChooser = true;

Game.prototype.showModal.___EDITOR_callbackParameterChooserFunction = () => {
	return PrefabsList.choosePrefab("Choose prefab to show as modal:");
};
Game.prototype.showScene.___EDITOR_callbackParameterChooserFunction = () => {
	return ScenesList.chooseScene("Choose scene to open:");
};
Game.prototype.replaceScene.___EDITOR_callbackParameterChooserFunction = () => {
	return ScenesList.chooseScene("Choose scene which will replace current scene:");
};

Game.prototype.showQuestion.___EDITOR_callbackParameterChooserFunction = () => {
	return new Promise((resolve) => {
		editor.ui.modal.showPrompt('Enter title to show', 'Question Title', undefined, editor.validateCallbackParameter).then((enteredTitle) => {
			if(enteredTitle) {
				editor.ui.modal.showPrompt('Enter message to show', 'Question text', undefined, editor.validateCallbackParameter, undefined, true).then((enteredText) => {
					if(enteredText) {
						resolve([enteredTitle, enteredText]);
					}
				});
			}
		});
	});
};

/// #endif
