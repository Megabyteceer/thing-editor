import type { IApplicationOptions } from 'pixi.js';
import { Application, BaseTexture, Container, GC_MODES, MIPMAP_MODES, Point, Texture, TextureGCSystem, utils } from 'pixi.js';
import type { __EditorType } from 'thing-editor/src/editor/editor';
import Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

import assert from 'thing-editor/src/engine/debug/assert';
import Lib from 'thing-editor/src/engine/lib';

import { ButtonOnlyPropertyDesc } from 'thing-editor/src/editor/utils/button-only-selectable-property';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import SceneLinkedPromise from 'thing-editor/src/engine/lib/assets/___system/scene-linked-promise.c';
import type ScrollLayer from 'thing-editor/src/engine/lib/assets/src/extended/scroll-layer.c';
import FullScreen from 'thing-editor/src/engine/utils/full-screen';
import initGameInteraction, { addOnClickOnce } from 'thing-editor/src/engine/utils/game-interaction';
import { setValueByPath } from 'thing-editor/src/engine/utils/get-value-by-path';
import Keys from 'thing-editor/src/engine/utils/keys';
import type L from 'thing-editor/src/engine/utils/l';
import loadDynamicTextures from 'thing-editor/src/engine/utils/load-dynamic-textures';
import Settings from 'thing-editor/src/engine/utils/settings';
import Sound from 'thing-editor/src/engine/utils/sound';
import sureQuestionInit from 'thing-editor/src/engine/utils/sure-question';

import fs from 'thing-editor/src/editor/fs';
import ERROR_HTML from './utils/html-error.html?raw';

/// #if EDITOR
/*
/// #endif
	import preloaderAssets from 'game-root/.tmp/assets-preloader' assert { type: 'json' };
//*/

let app: Application;
let stage: Container;
let modals: Container[] = [];
let hidingModals: Container[] = [];
let currentHidingFaderInUpdate: Container | null;

let scenesStack: (Scene | string)[] = [];
let hideTheseModalsUnderFader: Container[];
let currentFader: Container | undefined;
let hidingFaders: Container[] = [];

let _rendererWidth = 0;
let _rendererHeight = 0;
let scale = 1;

/// #if DEBUG
let lastFPSTime = 0;
type FixedViewportSize = { w: number; h: number } | boolean;

const loadingsInProgressOwners: Set<any> = new Set();
/// #endif

let contextLoseTime = 0;

const DEFAULT_FADER_NAME = 'fader/default';
const PRELOADER_SCENE_NAME = 'preloader';
const FRAME_PERIOD_LIMIT = 4.0;
const FRAME_PERIOD = 1.0;
let frameCounterTime = 0;

let resizeOutJump = 0;
let fireNextOnResizeImmediately = false;

interface Mouse {
	click: boolean;
	x: number;
	y: number;
}

const processOnResize = (o: Container) => {
	if (o._onRenderResize) {
		o._onRenderResize();
	}
};

class Game {

	W = 0;
	H = 0;

	/** use in your game as storage for any variables accessible in data-path selectors */
	data: GameData = {} as any;

	Sound = Sound;

	_loadingErrorIsDisplayed = false;

	projectDesc!: ProjectDesc;
	all!: ThingSceneAllMap;

	classes!: GameClasses;
	pixiApp!: Application;
	stage!: Container;

	settings!: Settings;

	fullscreen = FullScreen;

	isCanvasMode = false;
	/** browser tab visibility */
	isVisible = true;
	isFocused = false;

	isMobile = utils.isMobile;
	isPortrait = false;
	isLandscapeMobile = false;
	_isCanvasRotated = false;

	_isWaitingToHideFader = false;

	mouse: Mouse = new Point() as any as Mouse;

	/// #if EDITOR
	__mouse_EDITOR: Mouse = new Point() as any as Mouse;
	__mouse_uncropped: Mouse = new Point() as any as Mouse;
	/// #endif

	/** true if after current 'update' will be 'render'. */
	isUpdateBeforeRender = false;

	onGameReload?: () => void;

	private loadingsInProgress = 0;
	private loadingsFinished = 0;
	loadingProgress = 0;

	/// #if EDITOR
	editor!: __EditorType;
	__EDITOR_mode = false;
	/// #endif

	keys = Keys;

	L!: typeof L;


	/** cordova build only */
	exitApp: (() => void) | undefined;

	/// #if EDITOR
	__time = 0;
	get time() {
		return this.__time;
	}
	/*
	/// #endif
	time = 0;
	//*/

	setValueByPath = setValueByPath;

	init(element?: HTMLElement, gameId?: string, pixiOptions?: Partial<IApplicationOptions>) {
		/// #if EDITOR
		/*
		/// #endif
		game.addAssets(preloaderAssets);
		//*/


		window.dispatchEvent(new CustomEvent('game-will-init'));

		Lib.addTexture('EMPTY', Texture.EMPTY);
		Lib.addTexture('WHITE', Texture.WHITE);

		this.pixiApp = app = new Application(pixiOptions);

		(element || document.body).appendChild(app.view as HTMLCanvasElement);

		this.onResize = this.onResize.bind(this);
		/// #if EDITOR
		(this.onResize as SelectableProperty).___EDITOR_isHiddenForChooser = true;
		/// #endif

		stage = new Container();
		stage.name = 'stage';
		this.stage = stage;
		stage.__nodeExtendData = {};

		this.settings = new Settings(gameId || this.projectDesc.id);

		/// #if EDITOR
		this.___enforcedOrientation = game.editor.settingsLocal.getItem('__EDITOR_is-portrait-orientation') ? 'portrait' : undefined;
		/// #endif

		initGameInteraction();

		/// #if EDITOR
		if (!this.editor.buildProjectAndExit) {
			/// #endif
			loadFonts();
			/// #if EDITOR
		}
		/// #endif

		app.stage.addChild(stage);

		/// #if EDITOR
		/*
		/// #endif
		import('game-root/.tmp/classes').then(() => {
			game._startGame();
		});
		//*/
	}

	_setClasses(_classes: GameClasses) {
		if (!this.classes) {
			this._updateGlobal = this._updateGlobal.bind(this);
			app.ticker.add(this._updateGlobal);
			Sound.init();
		}
		this.classes = _classes;
	}

	_startGame() {
		/// #if EDITOR
		assert(false, '_startGame should not be called in editor.');
		/// #endif

		assert(this.classes, 'game.classes is not initialized. Has Vite duped index.js?');

		// workaround for issue: https://jira.bgaming.com/browse/BGG-6807, see for more details: https://github.com/pixijs/pixijs/issues/8315
		(Texture.WHITE.baseTexture.resource.source as any).getContext('2d').fillRect(0, 0, 1, 1);

		this.pixiApp.view.addEventListener!('wheel', (ev) => ev.preventDefault());
		window.addEventListener('resize', this._onContainerResize.bind(this));
		this.onResize();
		this.showScene(PRELOADER_SCENE_NAME);
	}

	_onContainerResize() {
		if (resizeOutJump) {
			clearTimeout(resizeOutJump);
		}
		if (fireNextOnResizeImmediately) {
			fireNextOnResizeImmediately = false;
			this.onResize();
		} else {
			resizeOutJump = window.setTimeout(() => {
				resizeOutJump = 0;
				if (game.isMobile.any // eslint-disable-line no-constant-condition
					/// #if EDITOR
					&& false
					/// #endif
				) {
					for (let i of [20, 40, 80, 200, 500, 1000, 1500, 2000, 3000]) {
						window.setTimeout(this.onResize, i);
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

	get disableAllButtons() {
		return !!currentFader;
	}

	/// #if EDITOR
	get __enforcedOrientation() {
		return this.___enforcedOrientation;
	}

	set __enforcedOrientation(v) {

		assert(!v || v === 'landscape' || v === 'portrait', 'Wrong value for game.__enforcedOrientation. "landscape" or "portrait" expected');
		this.___enforcedOrientation = v;
		game.editor.settingsLocal.setItem('__EDITOR_is-portrait-orientation', v === 'portrait');

		if (v === 'portrait') {
			if (!game.isMobile.any) {
				game.isMobile.any = true;
				game.editor._processIsMobileHandlers();
			}
		} else {
			const isMobileRestore = game.editor.settings.getItem('isMobile.any', game.isMobile.any);
			if (game.isMobile.any != isMobileRestore) {
				game.isMobile.any = isMobileRestore;
				game.editor._processIsMobileHandlers();
			}
		}

		this.onResize();
	}
	/// #endif

	addAssets(data: AssetsDescriptor) {
		/// #if EDITOR
		assert(false, 'game.addAssets method for runtime only, but called in editor.');
		/// #endif
		if (data.projectDesc) {
			game.applyProjectDesc(data.projectDesc);
		}
		Lib.addAssets(data);
	}

	applyProjectDesc(projectDescriptor: ProjectDesc) {

		assert(!this.projectDesc, 'game.projectDesc already defined');

		/// #if DEBUG
		let so = projectDescriptor.screenOrientation;
		assert(so === 'auto' || so === 'landscape' || so === 'portrait', 'Wrong value for "screenOrientation". "auto", "landscape" or "portrait" expected', 30010);
		/// #endif

		BaseTexture.defaultOptions.mipmap = projectDescriptor.mipmap
			? MIPMAP_MODES.ON
			: MIPMAP_MODES.OFF;

		TextureGCSystem.defaultMode = GC_MODES.MANUAL;

		this.projectDesc = projectDescriptor;
		/// #if EDITOR
		/*
		/// #endif
		if(game.projectDesc.defaultFont) {
			document.body.style.fontFamily = game.projectDesc.defaultFont;
		}
		//*/
	}

	onResize() {
		if (!this.pixiApp) {
			return;
		}
		let w, h;
		if (this.pixiApp.view.parentNode === document.body) {
			w = window.innerWidth;
			h = window.innerHeight;
		} else {
			w = (this.pixiApp.view.parentNode as HTMLDivElement).clientWidth;
			h = (this.pixiApp.view.parentNode as HTMLDivElement).clientHeight;
		}

		//let debugInfo = 'w: ' + w + '; h: ' + h;

		let dynamicStageSize = game.projectDesc.dynamicStageSize;

		let orientation;
		/// #if EDITOR

		if (this.__fixedViewport) {
			if (this.__fixedViewport === true) {
				let size = this.editor._getProjectViewportSize(false);
				w = size.w;
				h = size.h;
			} else {
				w = this.__fixedViewport.w;
				h = this.__fixedViewport.h;

			}
		}

		if (this.__enforcedW) {
			w = this.__enforcedW;
		}
		if (this.__enforcedH) {
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
			if (orientation === 'portrait') {
				if (w > h * 0.9) {
					w = Math.round(h * 0.9);
				}
			} else {
				if (h > w * 0.9) {
					h = Math.round(w * 0.9);
				}
			}
		}
		/// #endif

		if (orientation === 'auto') {
			orientation = (w < h) ? 'portrait' : 'landscape';
		}

		let rotateCanvas = false;

		switch (orientation) {
		case 'portrait':
			rotateCanvas = w > h;
			game.isPortrait = true;
			break;
		case 'auto':
			game.isPortrait = (w < h) && game.isMobile.any;
			break;
		default: //landscape
			rotateCanvas = h > w;
			game.isPortrait = false;
			break;
		}

		this.isLandscapeMobile = !this.isPortrait && this.isMobile.any;

		if (!this.isMobile.any // eslint-disable-line no-constant-condition
			/// #if EDITOR
			|| true
			/// #endif
		) { //rotate canvas for fixed orientation projects on mobile only
			rotateCanvas = false;
		}

		if (game.isPortrait) {
			/** game screen current width */
			this.W = this.projectDesc.portraitWidth || 408;
			/** game screen current height */
			this.H = this.projectDesc.portraitHeight || 720;
		} else {
			this.W = this.projectDesc.width || 1280;
			this.H = this.projectDesc.height || 720;
		}


		if (!dynamicStageSize) {
			if (game.projectDesc.preventUpscale // eslint-disable-line no-constant-condition
				/// #if EDITOR
				|| true
				/// #endif
			) {
				if (rotateCanvas) {
					w = Math.min(this.H, w);
					h = Math.min(this.W, h);
				} else {
					w = Math.min(this.W, w);
					h = Math.min(this.H, h);
				}
			}
		}

		let S;
		if (rotateCanvas) {
			S = Math.min(h / this.W, w / this.H);
		} else {
			S = Math.min(w / this.W, h / this.H);
		}

		if (dynamicStageSize) {
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
		if (this.isMobile.any // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false
			/// #endif
		) {
			if (game.projectDesc.renderResolutionMobile) {
				s = game.projectDesc.renderResolutionMobile;
			}
		} else {
			if (game.projectDesc.renderResolution) {
				s = game.projectDesc.renderResolution;
			}
		}
		s = Math.max(window.devicePixelRatio || 1, s);
		S *= s;
		S = Math.min(3, S);
		/// #if EDITOR
		if (!document.fullscreenElement) {
			S = 1;
		}
		if (this.editor.buildProjectAndExit) {
			S = 1 / 16;
		}
		/// #endif

		if (this.pixiApp && this.pixiApp.renderer) {
			game.isCanvasMode = !(this.pixiApp.renderer as any).gl;
			if (!game.isCanvasMode) {
				let gl = (this.pixiApp.renderer as any).gl as WebGL2RenderingContext;
				let maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
				if (maxTextureSize < 3000) {
					S = Math.min(1, S);
				}

				if (w * S > maxTextureSize) {
					S = maxTextureSize / w;
				}
				if (h * S > maxTextureSize) {
					S = maxTextureSize / h;
				}
			}
		}

		if (dynamicStageSize) {
			if (rotateCanvas) {
				this.H = w;
				this.W = h;
			} else {
				this.W = w;
				this.H = h;
			}
		}

		let rendererWidth, rendererHeight;
		if (rotateCanvas) {
			rendererWidth = this.H;
			rendererHeight = this.W;
		} else {
			rendererWidth = this.W;
			rendererHeight = this.H;
		}

		this.W = Math.round(this.W);
		this.H = Math.round(this.H);

		if (this.W & 1) { //make even game logical size only. Keep canvas fit to client
			this.W++;
		}
		if (this.H & 1) {
			this.H++;
		}

		let needResizeRenderer = (_rendererWidth !== rendererWidth) || (_rendererHeight !== rendererHeight) || (scale !== S);

		//PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

		_rendererWidth = rendererWidth;
		_rendererHeight = rendererHeight;
		scale = S;


		let stage = game.stage;

		game._isCanvasRotated = rotateCanvas;

		if (rotateCanvas) {
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
			if (!this.__enforcedW) {
				/// #endif
				let renderer = game.pixiApp.renderer;

				renderer.resolution = scale;

				/*PIXI.InteractionManager.resolution = scale;
				renderer.plugins.interaction.resolution = scale;

				if(renderer.rootRenderTarget) {
					renderer.rootRenderTarget.resolution = scale;
				}*/

				renderer.resize(_rendererWidth + 0.0001, _rendererHeight + 0.0001); //prevent canvas size decreasing by pixel because of Math.ceil
				/// #if EDITOR
			}
			/// #endif

			this.forAllChildrenEverywhere(processOnResize);
			/// #if EDITOR
			if (!this.__enforcedW) {
				this.editor.onEditorRenderResize();
			}
			/// #endif
		}

		assert(_rendererWidth, 'Render\'s size was not calculated correctly.');
		assert(_rendererHeight, 'Render\'s size was not calculated correctly.');

		/// #if EDITOR
		game.editor.ui.viewport.viewportScale = game.pixiApp.view.width / (game.pixiApp.view as HTMLCanvasElement).clientWidth;
		/// #endif
	}

	/// #if EDITOR
	___enforcedOrientation: ProjectOrientation | undefined;

	__enforcedW: number | undefined;
	__enforcedH: number | undefined;

	__fixedViewport?: FixedViewportSize;
	__setFixedViewport(fixedViewport: FixedViewportSize) {
		this.__fixedViewport = fixedViewport;
		this.onResize();
	}
	/// #endif

	forAllChildrenEverywhere(callback: (o: Container) => void) {
		if (game.stage && game.stage.forAllChildren) {
			game.stage.forAllChildren(callback);
		}
		game.forAllChildrenEverywhereBack(callback);
	}

	forAllChildrenEverywhereBack(callback: (o: Container) => void) {
		for (let s of scenesStack) {
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

	get currentContainer(): Container {
		if (modals.length > 0) {
			return modals[modals.length - 1]; //top modal is active
		}
		return this.currentScene; //current scene is active if no modals on screen
	}

	/// #if EDITOR
	get currentScene(): CurrentSceneType {
		return __currentSceneValue;
	}
	/*
	/// #endif
	currentScene!:Scene;
	//*/

	_updateGlobal(dt: number) {
		/// #if DEBUG
		this._FPS++;
		let now = Date.now();
		if ((now - lastFPSTime) >= 1000) {
			this.FPS = this._FPS;
			this._FPS = 0;
			lastFPSTime = now;
		}
		/// #endif

		/// #if EDITOR
		EDITOR_FLAGS.updateInProgress = true;

		if ((!this.__paused || this.__doOneStep) && !this.__EDITOR_mode) {
			/// #endif

			if (game.classes.ScrollLayer) {
				(game.classes.ScrollLayer as unknown as ScrollLayer).updateGlobal();
			}

			dt = Math.min(dt, FRAME_PERIOD_LIMIT);
			/// #if EDITOR
			dt = Math.min(dt, 1);
			/// #endif

			frameCounterTime += dt;
			frameCounterTime = Math.min(frameCounterTime, FRAME_PERIOD * game.projectDesc.framesSkipLimit);
			while (frameCounterTime > FRAME_PERIOD) {

				/// #if DEBUG
				frameCounterTime -= FRAME_PERIOD / game.pixiApp.ticker.speed;
				/*
				/// #endif
				frameCounterTime -= FRAME_PERIOD;
				//*/

				game.isUpdateBeforeRender = !(frameCounterTime > FRAME_PERIOD);
				this._updateFrame();

				/// #if EDITOR
				if (this.__doOneStep) {
					this.editor.refreshTreeViewAndPropertyEditor();
					this.__doOneStep = false;
					frameCounterTime = 0;
					break;
				}
			}
			/// #endif
		}

		if (this.currentScene) {
			app.renderer.background.backgroundColor.setValue(this.currentScene.backgroundColor);

			this.currentScene.interactiveChildren = ((modals.length === 0) && !currentFader);
			let i = modals.length - 1;
			let isCurrent = !currentFader;
			while (i >= 0) {
				modals[i].interactiveChildren = isCurrent;
				isCurrent = false;
				i--;
			}
		}

		/// #if EDITOR
		EDITOR_FLAGS.updateInProgress = false;
		/// #endif

	}

	_updateFrame() {
		if (game._loadingErrorIsDisplayed) {
			return;
		}

		/// #if EDITOR
		this.__time++;

		if (!game.__EDITOR_mode && this.currentScene && this.currentScene.name === 'preloader') {
			this.loadingProgress = Math.round(Math.min(100, game.time / 3));
		}

		/*
		/// #endif
		this.time++;
		//*/

		if (!game.isCanvasMode) {
			if ((this.pixiApp.renderer as any).gl.isContextLost()) {
				if (game.isVisible) {
					contextLoseTime++;
					if (contextLoseTime === 60) {
						game._reloadGame();
					}
				}
				return;
			}
			contextLoseTime = 0;
		}

		if (game._isWaitingToHideFader) {
			if (game.loadingsFinished === game.loadingsInProgress) {
				game._processScenesStack();
				if (!game.currentScene._onShowCalled) {
					game.currentScene._onShowCalled = true;
					game.currentScene.onShow();
					loadDynamicTextures();
					if (game.currentScene.name === PRELOADER_SCENE_NAME) {
						game._hideCurrentFaderAndStartScene();
						/// #if EDITOR
						/*
						/// #endif
						this.loadingAdd('assets-main load');
						import('game-root/.tmp/assets-main', {assert: { type: 'json' }}).then((mainAssets: AssetsDescriptor) => {
							this.loadingRemove('assets-main load');
							game.addAssets(mainAssets.default);
						});
						//*/
					}
				} else {
					game._hideCurrentFaderAndStartScene();
				}
			}
		} else if (this.currentContainer) {
			if (!currentFader || (this.currentContainer !== this.currentScene) || (hidingModals.length < 1)) {
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
		if (!currentFader) {
			let i = hidingModals.length - 1; //hide modals process
			while (i >= 0) {
				let m = hidingModals[i];
				m.alpha -= 0.1;
				if (m.alpha <= 0.01) {
					Lib.destroyObjectAndChildren(m);
					hidingModals.splice(i, 1);
					/// #if EDITOR
					game.editor.refreshTreeViewAndPropertyEditor();
					/// #endif
				}
				i--;
			}
		}
		this.keys.update();
		Lib._cleanupRemoveHolders();
	}

	get currentFader() {
		return currentFader;
	}

	_hideCurrentFaderAndStartScene() {
		(currentFader as Container).gotoLabelRecursive('hide fader');
		hidingFaders.unshift(currentFader as Container);
		/// #if EDITOR
		this.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		currentFader = undefined;
		if (game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
		game._isWaitingToHideFader = false;
	}

	_processScenesStack() {
		assert(game.loadingsFinished === game.loadingsInProgress, 'Attempt to change stack during loading');
		while (true) { // eslint-disable-line no-constant-condition
			let topStackElement = scenesStack[scenesStack.length - 1] as Scene;
			if (topStackElement === game.currentScene) {
				break;
			}
			if (game.currentScene) {
				if (game.currentScene._onShowCalled) {
					game.currentScene.onHide();
				}
				tryToRemoveCurrentScene();
			}
			topStackElement = scenesStack[scenesStack.length - 1] as Scene;
			scenesStack[scenesStack.length - 1] = game._setCurrentSceneContent(topStackElement);
		}
	}

	_reloadGame() {
		if (game.onGameReload) {
			game.onGameReload();
		}
		if (Lib.hasPrefab('final-fader')) {
			game.showModal('final-fader');
		}
		window.location.reload();
	}

	showScene(scene: Scene | string, faderType?: string) {
		/// #if EDITOR
		checkSceneName(scene);
		/// #endif
		scenesStack.push(scene);
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			scenesStack = [scene];
		}
		/// #endif
		game._startFaderIfNeed(faderType);
	}

	loadingAdd(owner: any) {
		/// #if DEBUG
		assert(owner, 'game.loadingAdd: wrong loading owner.');
		loadingsInProgressOwners.add(owner);
		/// #endif

		if (this.loadingsFinished === this.loadingsInProgress) {
			this.loadingsInProgress = 0;
			this.loadingsFinished = 0;
		}
		this.loadingsInProgress++;

		this._refreshLoadingProgress();
	}

	private _refreshLoadingProgress() {
		this.loadingProgress = this.loadingsInProgress ? Math.floor(this.loadingsFinished / this.loadingsInProgress * 100) : 0;
		assert(this.loadingProgress >= 0 && this.loadingProgress <= 100, 'game.loadingProgress out of range 0-100.');
	}

	loadingRemove(owner: any) {

		/// #if DEBUG
		assert(loadingsInProgressOwners.has(owner), 'game.loadingRemove: wrong loading owner.');
		loadingsInProgressOwners.delete(owner);
		/// #endif

		this.loadingsFinished++;
		this._refreshLoadingProgress();
	}

	replaceScene(scene: Scene | string, faderType?: string) {

		if (!scene) {
			scene = game.projectDesc.mainScene;
		}

		/// #if EDITOR
		checkSceneName(scene);
		/// #endif


		assert(scenesStack.length > 0, 'Can not replace scene. No scene to replace is present.');

		tryToRemoveScene(scenesStack.pop() as Scene);
		scenesStack.push(scene);
		game._startFaderIfNeed(faderType);
	}

	_startFaderIfNeed(faderType?: string) {
		if (scenesStack[scenesStack.length - 1] !== game.currentScene) {
			/// #if EDITOR
			if (game.__EDITOR_mode) {
				let i = scenesStack.length - 1;
				this.__destroyCurrentScene();
				let s = this._setCurrentSceneContent(scenesStack[i] as Scene);
				scenesStack[i] = s;
				return;
			}
			/// #endif
			hideTheseModalsUnderFader = modals.slice();
			if (!currentFader) {
				assert(!game._isWaitingToHideFader, '_isWaitingToHideFader is true when no currentFader exists.');
				if (!faderType) {
					if (this.currentScene && this.currentScene.faderType) {
						faderType = this.currentScene.faderType;
					} else {
						faderType = DEFAULT_FADER_NAME;
					}
				}
				currentFader = Lib.loadPrefab(faderType!);
				this.stage.addChild(currentFader);
				if (game.classes.BgMusic) {
					(game.classes.BgMusic as any)._recalculateMusic();
				}
			}
			/// #if EDITOR
			this.editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	closeCurrentScene(faderType?: string) {
		/// #if EDITOR
		if (scenesStack.length <= 1) {
			this.editor.ui.modal.notify('It is no other scene in stack to close current scene.');
			return;
		}
		/// #endif
		assert(scenesStack.length > 1, 'Can\'t close latest scene', 10035);
		tryToRemoveScene(scenesStack.pop() as Scene);
		game._startFaderIfNeed(faderType);
	}

	closeAllScenes(faderType?: string) {
		while (scenesStack.length > 1) {
			game.closeCurrentScene(faderType);
		}
	}

	showQuestion(title: string, message: string, yesLabel?: string, onYes?: () => void, noLabel?: string, onNo?: () => void, easyClose = true, prefab = 'ui/sure-question') {
		let o = Lib.loadPrefab(prefab);
		sureQuestionInit(o, title, message, yesLabel, onYes, noLabel, onNo, easyClose);
		return game.showModal(o);
	}

	showModal(container: Container | string, callback?: () => void
		/// #if EDITOR
		, __noAssertEditorMode = false
		/// #endif
	) {
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			assert(__noAssertEditorMode, 'Attempt to show modal in editor mode: ' + ((container as any).name || container), 10047);
		}
		/// #endif
		if (typeof container === 'string') {
			container = Lib.loadPrefab(container);
		}
		assert(container instanceof Container, 'Attempt to show not DisplayObject as modal');
		assert(!(container instanceof Scene), 'Scene can not be used as modal', 10037);
		modals.push(container);

		if (callback) {
			const promise = SceneLinkedPromise.promise(() => { /*empty*/ }, container);
			promise.name = 'modal-promise-awaiter';
			promise.then(callback);
		}

		container.interactiveChildren = false;
		game.stage.addChild(container);
		if (game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
		/// #if EDITOR
		game.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		return container;
	}

	hideModal(container?: Container, instantly = false) {
		let modalToHide: Container;
		if (!container) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.', 10038);
			modalToHide = modals.pop()!;
		} else {
			let i = modals.indexOf(container);
			assert(i >= 0, 'Attempt to hide modal object which is not in modal list.', 10039);
			modalToHide = container;
			modals.splice(i, 1);
		}

		const promise = modalToHide.getChildByName('modal-promise-awaiter') as SceneLinkedPromise;
		if (promise
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			promise.resolve(modalToHide);
			promise.update();
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
		if (game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}

		/// #if EDITOR
		game.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
	}

	/** call when fader covered the stage */
	faderShoot() {
		/// #if EDITOR
		assert(__isCurrentFaderUpdateInProgress, 'faderShoot() called not by fader.', 10033);
		assert(!(currentFader as Container).__nodeExtendData.isFaderShootCalledForThisFader, 'faderShoot() already called for this fader.', 10034);
		(currentFader as Container).__nodeExtendData.isFaderShootCalledForThisFader = true;
		/// #endif
		while (hideTheseModalsUnderFader.length > 0) {
			let m = hideTheseModalsUnderFader.pop() as Container;
			let i = modals.indexOf(m);
			if (i >= 0) {
				modals.splice(i, 1);
				Lib.destroyObjectAndChildren(m);
			}
		}
		while (hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m as Container);
		}
		game._isWaitingToHideFader = true;
	}

	faderEnd() {
		if (currentHidingFaderInUpdate) {
			let i = hidingFaders.indexOf(currentHidingFaderInUpdate);
			assert(i >= 0, 'hidingFaders list is corrupted');
			hidingFaders.splice(i, 1);
			Lib.destroyObjectAndChildren(currentHidingFaderInUpdate);
			currentHidingFaderInUpdate = null;
			/// #if EDITOR
			game.editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	openUrl(url: string, target = '_blank') {
		addOnClickOnce(() => {
			window.open(url, target);
		});
	}

	showLoadingError(url: string) {
		/// #if EDITOR
		if (this.editor.buildProjectAndExit) {
			fs.exitWithResult(undefined, 'loading error: ' + url);
		}
		/// #endif

		if (game._loadingErrorIsDisplayed) {
			return;
		}
		game._loadingErrorIsDisplayed = true;
		if (game.classes && game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
		/// #if EDITOR
		this.editor.ui.modal.showError('Could not load file: ' + url);
		return;
		/// #endif

		let e = document.createElement('div');// eslint-disable-line no-unreachable

		e.innerHTML = ERROR_HTML.replace('$TITLE$', game.projectDesc.title);
		document.body.appendChild(e);
		document.addEventListener('click', () => {
			game._reloadGame();
		});
	}

	_setCurrentScene(scene: Scene | null) {
		//DODO: cleanup
		if (scene) {
			game.all = scene.all;
		} else {
			game.all = null as any;
		}
		/// #if EDITOR
		__currentSceneValue = scene as Scene;
		return;
		/*
		/// #endif
		game.currentScene = scene;
		//*/
	}

	_fireNextOnResizeImmediately() {
		fireNextOnResizeImmediately = true;
	}

	_setCurrentSceneContent(scene: Scene) {
		//DODO: cleanup
		assert(!game.currentScene, 'Attempt to set current scene content with previous scene exists.');

		/// #if EDITOR
		const isFirstSceneShow = !__currentSceneValue;
		/// #endif

		scene = checkScene(scene);

		this._setCurrentScene(scene);
		scene.interactiveChildren = false;
		stage.addChildAt(scene, 0);
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			loadDynamicTextures();
		} else {
			if (isFirstSceneShow) {
				this.editor.selection.loadCurrentSelection();
			}
		}
		game.currentScene.__nodeExtendData.childrenExpanded = true;
		this.editor.refreshTreeViewAndPropertyEditor();

		this.editor.ui.viewport.resetZoom();

		/// #endif
		scene._onShowCalled = false;
		return scene;
	}

	/// #if DEBUG
	__doOneStep = false;
	__paused = false;
	protected _FPS = 0;
	FPS = 0;
	/// #endif

	_getScenesStack() {
		return scenesStack;
	}

	applyCSS(css: string) {
		let head = document.head || document.getElementsByTagName('head')[0];
		let style = document.createElement('style');
		style.appendChild(document.createTextNode(css));
		head.appendChild(style);
	}

	/// #if EDITOR
	__setCurrentContainerContent(o: Container) {
		assert(game.__EDITOR_mode, 'attempt to replace current container content in running mode');
		if (modals.length > 0) {
			this.hideModal();
			this.showModal(o, undefined, true);
		} else {
			if (!o.name) {
				(o as Scene).name = game.currentScene.name;
			}
			this.showScene(o as Scene);
		}
	}

	__destroyCurrentScene() {
		//DODO: cleanup
		if (this.currentScene) {
			Lib.destroyObjectAndChildren(this.currentScene);
			this._setCurrentScene(null);
		}
	}

	get __modalsCount() {
		return modals.length;
	}

	__clearStage() {
		while (this.__modalsCount > 0) {
			this.hideModal(undefined, true);
		}
		while (hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m as Container);
		}

		while (scenesStack.length > 0) {
			tryToRemoveScene(scenesStack.pop() as Scene);
		}

		tryToRemoveCurrentScene();

		if (currentFader) {
			Lib.destroyObjectAndChildren(currentFader);
			currentFader = undefined;
		}
		game._isWaitingToHideFader = false;
		while (hidingFaders.length > 0) {
			Lib.destroyObjectAndChildren(hidingFaders.pop() as Container);
		}
		Lib.__clearStaticScenes();
		if (game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
	}

	/// #endif

	/// #if DEBUG
	_reanimateTicker() {
		requestAnimationFrame((game.pixiApp.ticker as any)._tick);
	}

	__showDebugError(txt: string, errorCode = 90000) {
		/// #if EDITOR
		this.editor.ui.modal.showError(txt, errorCode);
		return;
		/// #endif
		alert(txt); // eslint-disable-line no-unreachable
	}
	/// #endif
}

const loadedFonts = new Set() as Set<string>;
let fontHolder: HTMLSpanElement;
function loadFonts() {
	if (game.projectDesc.webfontloader?.custom?.families?.length || game.projectDesc.webfontloader?.google?.families?.length) {
		game.loadingAdd('FontsLoading');
		if (game.projectDesc.fontHolderText) {
			if (!fontHolder) {
				fontHolder = document.createElement('span');
				fontHolder.style.opacity = '0';
				fontHolder.style.color = 'rgba(0,0,0,0.01)';
				fontHolder.style.position = 'absolute';
				fontHolder.style.zIndex = '-1';
			}

			for (let fontsProviderName in game.projectDesc.webfontloader) {
				let families = (game.projectDesc.webfontloader as KeyedObject)[fontsProviderName].families;
				if (families) {
					for (let family of families) {
						if (!loadedFonts.has(family)) {
							loadedFonts.add(family);
							if (fontsProviderName === 'custom') {

								family = family.replace(/ /g, '');
								let fontPath = family + '.woff';

								/// #if EDITOR
								fontPath = game.editor.currentProjectAssetsDirRooted + 'fonts/' + family.replace(/ /g, '') + '.woff';
								/// #endif

								let fontPath2 = fontPath + '2';

								/// #if EDITOR
								/*
								/// #endif
								fontPath = Lib.fonts['fonts/' + family + '.woff'];
								fontPath2 = Lib.fonts['fonts/' + family + '.woff2'];
								//*/
								game.applyCSS(`
@font-face {
	font-family: '` + family + `';
	src: url('` + fontPath2 + `') format('woff2'),
	url('` + fontPath + `') format('woff');
}
									`);
							} else if (fontsProviderName === 'google') {
								const link = document.createElement('link');
								link.rel = 'stylesheet';
								link.type = 'text/css';
								link.href = 'https://fonts.googleapis.com/css?family=' + family;
								document.head.appendChild(link);
							}

							let a = family.split(':');
							let fontName = a[0];
							let weights = a[1] ? a[1].split(',') : ['normal'];

							for (let w of weights) {
								let span = document.createElement('span');
								span.style.fontFamily = `"${fontName}"`;
								span.style.fontWeight = w;
								span.innerHTML = game.projectDesc.fontHolderText;
								fontHolder.appendChild(span);
							}
						}
					}
				}
			}
			document.body.appendChild(fontHolder);
		}

		document.fonts.ready.then(() => {
			game.loadingRemove('FontsLoading');
		});
	}
}

function tryToRemoveCurrentScene() {
	let s = game.currentScene;
	game._setCurrentScene(null);
	tryToRemoveScene(s);
}

function tryToRemoveScene(s: Scene) {


	if ((s instanceof Scene) && (s !== game.currentScene)) {
		/// #if EDITOR
		if (s.__nodeExtendData.isSelected) {
			game.editor.selection.remove(s);
			game.editor.refreshTreeViewAndPropertyEditor();
		}
		/// #endif

		if (!s.isStatic && (scenesStack.indexOf(s) < 0)) {
			Lib.destroyObjectAndChildren(s);
		} else {
			s.detachFromParent();
		}
	}
}

function checkScene(scene: Scene | string) {
	if (typeof scene === 'string') {
		scene = Lib.loadScene(scene);
	}
	assert(scene instanceof Scene, 'Scene instance expected.');
	assert(scene.name, 'Scene name is empty.');
	return scene;
}

/// #if EDITOR
function checkSceneName(sceneName: string | Scene) {
	if (typeof sceneName === 'string') {
		assert(Lib.hasScene(sceneName), 'No scene with name \'' + sceneName + '\'', 10046);
	} else {
		assert(sceneName instanceof Scene, 'Scene expected.');
	}
}
let __isCurrentFaderUpdateInProgress = false;
let __currentSceneValue: Scene;

/// #endif

const game = new Game();
export default game;
export { DEFAULT_FADER_NAME, PRELOADER_SCENE_NAME };
export type { FixedViewportSize };

/// #if EDITOR

(window as any).game = game;

(Game.prototype.forAllChildrenEverywhereBack as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Game.prototype.forAllChildrenEverywhere as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Game.prototype.init as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Game.prototype.applyProjectDesc as SelectableProperty).___EDITOR_isHiddenForChooser = true;

(Game.prototype.closeAllScenes as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.closeCurrentScene as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.faderEnd as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.faderShoot as SelectableProperty).___EDITOR_isGoodForChooser = true;
(FullScreen as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.hideModal as SelectableProperty).___EDITOR_isGoodForChooser = true;
(game.isMobile as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Keys as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.openUrl as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.replaceScene as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.showModal as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.showQuestion as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Game.prototype.showScene as SelectableProperty).___EDITOR_isGoodForChooser = true;
Object.defineProperty(game.openUrl, '___EDITOR_isHiddenForChooser', ButtonOnlyPropertyDesc);

(Game.prototype.showModal as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.choosePrefab('Choose prefab to show as modal:');
};
(Game.prototype.showScene as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.chooseScene('Choose scene to open:');
};
(Game.prototype.replaceScene as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.chooseScene('Choose scene which will replace current scene:');
};

(Game.prototype.showQuestion as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return new Promise((resolve) => {
		game.editor.ui.modal.showPrompt('Enter title to show', 'Question Title', undefined, game.editor.validateCallbackParameter).then((enteredTitle) => {
			if (enteredTitle) {
				game.editor.ui.modal.showPrompt('Enter message to show', 'Question text', undefined, game.editor.validateCallbackParameter, undefined, true).then((enteredText) => {
					if (enteredText) {
						resolve([enteredTitle, enteredText]);
					}
				});
			}
		});
	});
};


/// #endif

document.addEventListener('visibilitychange', () => visibilityChangeHandler());
window.addEventListener('focus', () => focusChangeHandler(true));
window.addEventListener('blur', () => focusChangeHandler(false));

const focusChangeHandler = (focused: boolean) => {
	if (game.isFocused !== focused) {
		game.isFocused = focused;

		if (game.pixiApp) {
			window.setTimeout(() => {
				game.keys.resetAll();
			}, 10);
		}
	}
};

const visibilityChangeHandler = () => {
	const isVisible = document.visibilityState === 'visible';

	if (game.isVisible !== isVisible) {
		game.isVisible = isVisible;

		if (game.pixiApp) {
			window.setTimeout(() => {
				if (game.classes.BgMusic) {
					/// #if EDITOR
					/*
					/// #endif
					(game.classes.BgMusic as any)._clearCustomFades(0.2);
					(game.classes.BgMusic as any)._recalculateMusic();
					//*/
				}
			}, 10);
		}
		focusChangeHandler(isVisible);
	}
};
focusChangeHandler(true);
visibilityChangeHandler();
