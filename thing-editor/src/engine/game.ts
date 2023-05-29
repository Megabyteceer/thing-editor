/// #if EDITOR
import type { __EditorType } from "thing-editor/src/editor/editor";
/// #if EDITOR


import { BaseTexture, Container, Point, TextureGCSystem, utils } from "pixi.js";
import type { Classes, KeyedMap, KeyedObject, SelectableProperty } from "thing-editor/src/editor/env";
import Scene from "thing-editor/src/engine/components/scene.c";

import { Application, GC_MODES, MIPMAP_MODES } from "pixi.js";
import { ProjectDesc, ProjectOrientation } from "thing-editor/src/editor/ProjectDesc";
import assert from "thing-editor/src/engine/debug/assert";
import Lib from "thing-editor/src/engine/lib";
import defaultProjectDesc from "thing-editor/src/engine/utils/default-project-desc";
import FullScreen from "thing-editor/src/engine/utils/full-screen";
import initGameInteraction from "thing-editor/src/engine/utils/game-interaction";
import Keys from "thing-editor/src/engine/utils/keys";
import loadDynamicTextures from "thing-editor/src/engine/utils/load-dynamic-textures";
import Settings from "thing-editor/src/engine/utils/settings";

let app: Application;
let stage: Container;
let modals: Container[] = [];
let hidingModals: Container[] = [];
let currentHidingFaderInUpdate: Container | null;

let showStack: (Scene | string)[] = [];
let hideTheseModalsUnderFader: Container[];
let currentFader: Container | null;
let hidingFaders: Container[] = [];

/// #if DEBUG
let lastFPSTime = 0;
let __speedMultiplier = 1;
/// #endif

const FRAME_PERIOD_LIMIT = 4.0;
const FRAME_PERIOD = 1.0;
let frameCounterTime = 0;


interface Mouse {
	click: boolean;
	x: number,
	y: number,
}

//@ts-ignore
let fireNextOnResizeImmediately = false; //TODO

class Game {

	W = 800;
	H = 600;

	/** use in your game as storage for any variables accessible in data-path selectors */
	data: KeyedObject = {};

	___enforcedOrientation: ProjectOrientation | null = null; //TODO
	__enforcedW: number | undefined;
	__enforcedH: number | undefined;

	_loadingErrorIsDisplayed = false;

	projectDesc!: ProjectDesc;
	all!: KeyedMap<Container>;

	classes!: Classes;
	pixiApp!: Application;
	stage!: Container;

	settings!: Settings;

	fullscreen = FullScreen;

	isCanvasMode = false; //TODO
	isVisible = true; //TODO

	isMobile = utils.isMobile;

	_isWaitingToHideFader = false;

	mouse: Mouse = new Point() as any as Mouse;

	/// #if EDITOR
	__mouse_EDITOR: Mouse = new Point() as any as Mouse;
	__mouse_uncropped: Mouse = new Point() as any as Mouse;
	/// #endif

	/** true if after current 'update' will be 'render'. */
	isUpdateBeforeRender = false;

	onGameReload?: () => void;

	/// #if EDITOR
	editor!: __EditorType;
	__EDITOR_mode = false;

	isFocused: boolean = false;

	keys = Keys;

	__time = 0;
	get time() {
		return this.__time;
	}

	/** cordova build only */
	exitApp: (() => void) | undefined

	/*
	/// #endif
	time = 0;
	*/

	init(element: HTMLElement | null, gameId: string, _resourcesPath = '') {
		this.pixiApp = app = new Application();

		//@ts-ignore
		(element || document.body).appendChild(app.view);

		this._updateGlobal = this._updateGlobal.bind(this);

		stage = new Container();
		stage.name = 'stage';
		this.stage = stage;
		stage.__nodeExtendData = {};

		this.settings = new Settings(gameId);

		initGameInteraction();

		app.stage.addChild(stage);
		app.ticker.add(this._updateGlobal);
	}

	_onContainerResize() {
		//TODO:
	}

	get disableAllButtons() {
		return !!currentFader;
	}

	applyProjectDesc(projectDescriptor: ProjectDesc) {

		let isModified = false;
		for(let name in defaultProjectDesc) {
			if(!projectDescriptor.hasOwnProperty(name)) {
				projectDescriptor[name] = defaultProjectDesc[name];
				isModified = true;
			}
		}

		/// #if DEBUG
		let so = projectDescriptor.screenOrientation;
		assert(so === 'auto' || so === 'landscape' || so === 'portrait', 'Wrong value for "screenOrientation". "auto", "landscape" or "portrait" expected', 30010);
		/// #endif

		BaseTexture.defaultOptions.mipmap = projectDescriptor.mipmap
			? MIPMAP_MODES.ON
			: MIPMAP_MODES.OFF;

		TextureGCSystem.defaultMode = GC_MODES.MANUAL;

		this.projectDesc = projectDescriptor;
		this.onResize();
		return isModified;
	}

	onResize() {
		//TODO:
	}

	forAllChildrenEverywhere(callback: (o: Container) => void) {
		game.stage.forAllChildren(callback);
		game.forAllChildrenEverywhereBack(callback);
	}

	forAllChildrenEverywhereBack(callback: (o: Container) => void) {
		for(let s of showStack) {
			if(typeof s !== 'string') {
				callback(s);
				if(!s.parent) {
					callback(s);
					s.forAllChildren(callback);
				}
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

	get currentContainer(): Container {
		if(modals.length > 0) {
			return modals[modals.length - 1]; //top modal is active
		}
		return this.currentScene; //current scene is active if no modals on screen
	}

	get currentScene() {
		return __currentSceneValue;
	}

	_updateGlobal(dt: number) {
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

		if((!this.__paused || this.__doOneStep) && !this.__EDITOR_mode) {
			/// #endif


			//TODO ScrollLayer.updateGlobal();

			dt = Math.min(dt, FRAME_PERIOD_LIMIT);
			/// #if EDITOR
			dt = Math.min(dt, 1);
			/// #endif

			frameCounterTime += dt;
			frameCounterTime = Math.min(frameCounterTime, FRAME_PERIOD * game.projectDesc.framesSkipLimit);
			while(frameCounterTime > FRAME_PERIOD) {

				/// #if DEBUG
				frameCounterTime -= FRAME_PERIOD / game.__speedMultiplier;
				/*
				/// #endif
				frameCounterTime -= FRAME_PERIOD;
				//*/

				game.isUpdateBeforeRender = !(frameCounterTime > FRAME_PERIOD);
				this._updateFrame();

				/// #if EDITOR
				if(this.__doOneStep) {
					this.editor.refreshTreeViewAndPropertyEditor();
					this.__doOneStep = false;
					frameCounterTime = 0;
					break;
				}
			}
			/// #endif
		}

		if(this.currentScene) {
			app.renderer.background.backgroundColor.setValue(this.currentScene.backgroundColor);

			this.currentScene.interactiveChildren = ((modals.length === 0) && !currentFader);
			let i = modals.length - 1;
			let isCurrent = !currentFader;
			while(i >= 0) {
				modals[i].interactiveChildren = isCurrent;
				isCurrent = false;
				i--;
			}
		}

	}

	_updateFrame() {
		if(game._loadingErrorIsDisplayed) {
			return;
		}

		if(!game.isCanvasMode) {
			//TODO context losing handling
			/*if(game.pixiApp.renderer.gl.isContextLost()) {
				if(game.isVisible) {
					contextLoseTime++;
					if(contextLoseTime === 60) {
						game._reloadGame();
					}
				}
				return;
			}
			contextLoseTime = 0;*/
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

		if(currentFader) {
			/// #if EDITOR
			__isCurrentFaderUpdateInProgress = true;
			/// #endif
			currentFader.update();
			/// #if EDITOR
			__isCurrentFaderUpdateInProgress = false;
			/// #endif
		}
		let fi = hidingFaders.length - 1;
		while(fi >= 0) {
			let fader = hidingFaders[fi];
			currentHidingFaderInUpdate = fader;
			fader.update();
			fi--;
		}
		if(!currentFader) {
			let i = hidingModals.length - 1; //hide modals process
			while(i >= 0) {
				let m = hidingModals[i];
				m.alpha -= 0.1;
				if(m.alpha <= 0.01) {
					Lib.destroyObjectAndChildren(m);
					hidingModals.splice(i, 1);
					/// #if EDITOR
					game.editor.refreshTreeViewAndPropertyEditor();
					/// #endif
				}
				i--;
			}
		}
		// TODO this.keys.update();
		Lib._cleanupRemoveHolders();
		/// #if EDITOR
		this.__time++;
		/*
		/// #endif
		this.time++;
		//*/
	}

	_hideCurrentFaderAndStartScene() {
		//TODO cleanup
		(currentFader as Container).gotoLabelRecursive('hide fader');
		hidingFaders.unshift(currentFader as Container);
		/// #if EDITOR
		this.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		currentFader = null;
		//TODO BgMusic._recalculateMusic();
	}

	_processScenesStack() {
		assert(game.getLoadingCount() === 0, "Attempt to change stack during loading");
		while(true) { // eslint-disable-line no-constant-condition
			let topStackElement = showStack[showStack.length - 1] as Scene;
			if(topStackElement === game.currentScene) {
				break;
			}
			if(game.currentScene) {
				if(game.currentScene._onShowCalled) {
					game.currentScene.onHide();
				}
				tryRemoveCurrentScene(); //TODO cleanup
			}
			topStackElement = showStack[showStack.length - 1] as Scene;
			showStack[showStack.length - 1] = game._setCurrentSceneContent(topStackElement);
		}
	}

	getLoadingCount(
		/// #if EDITOR
		_ignoreInGamePromises = false
		/// #endif
	) {
		//TODO:
		return 0;
	}

	_reloadGame() {
		if(game.onGameReload) {
			game.onGameReload();
		}
		window.location.reload();
	}

	showScene(scene: Scene | string, faderType?: string) {
		/// #if EDITOR
		checkSceneName(scene);
		/// #endif
		showStack.push(scene);
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			showStack = [scene];
		}
		/// #endif
		game._startFaderIfNeed(faderType);
	}

	_startFaderIfNeed(faderType?: string) {
		if(showStack[showStack.length - 1] !== game.currentScene) {
			/// #if EDITOR
			if(game.__EDITOR_mode) {
				let i = showStack.length - 1;
				this.__destroyCurrentScene();
				let s = this._setCurrentSceneContent(showStack[i] as Scene);
				showStack[i] = s;
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
				//TODO BgMusic._recalculateMusic();
			}
			/// #if EDITOR
			this.editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	showModal(container: Container, callback?: () => void
		/// #if EDITOR
		, __noAssertEditorMode = false
		/// #endif
	) {
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			assert(__noAssertEditorMode, 'Attempt to show modal in editor mode: ' + (container.name || container), 10047);
		}
		/// #endif
		if(typeof container === "string") {
			container = Lib.loadPrefab(container);
		}
		assert(container instanceof Container, "Attempt to show not DisplayObject as modal");
		assert(!(container instanceof Scene), 'Scene can not be used as modal', 10037);
		modals.push(container);

		if(callback) {
			// SceneLinkedPromise with specialname. later find it and resolve
		}

		container.interactiveChildren = false;
		game.stage.addChild(container);
		//TODO BgMusic._recalculateMusic();
		/// #if EDITOR
		this.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
		return container;
	}

	hideModal(container?: Container, instantly = false) {
		let modalToHide: Container;
		if(!container) {
			assert(modals.length > 0, 'Attempt to hide modal when modal list is empty.', 10038);
			modalToHide = modals.pop()!;
		} else {
			let i = modals.indexOf(container);
			assert(i >= 0, 'Attempt to hide modal object which is not in modal list.', 10039);
			modalToHide = container;
			modals.splice(i, 1);
		}

		// TODO search SceneLinkedPromise with callback

		if(instantly
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
		//TODO BgMusic._recalculateMusic();

		/// #if EDITOR
		game.editor.refreshTreeViewAndPropertyEditor();
		/// #endif
	}

	faderShoot() {
		/// #if EDITOR
		assert(__isCurrentFaderUpdateInProgress, "faderShoot() called not by fader.", 10033);
		assert(!(currentFader as Container).__nodeExtendData.isFaderShootCalledForThisFader, "faderShoot() already called for this fader.", 10034);
		(currentFader as Container).__nodeExtendData.isFaderShootCalledForThisFader = true;
		/// #endif
		while(hideTheseModalsUnderFader.length > 0) {
			let m = hideTheseModalsUnderFader.pop() as Container;
			let i = modals.indexOf(m);
			if(i >= 0) {
				modals.splice(i, 1);
				Lib.destroyObjectAndChildren(m);
			}
		}
		while(hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m as Container);
		}
		game._isWaitingToHideFader = true;
	}

	faderEnd() {
		if(currentHidingFaderInUpdate) {
			let i = hidingFaders.indexOf(currentHidingFaderInUpdate);
			assert(i >= 0, "hidingFaders list is corrupted");
			hidingFaders.splice(i, 1);
			Lib.destroyObjectAndChildren(currentHidingFaderInUpdate);
			currentHidingFaderInUpdate = null;
			/// #if EDITOR
			game.editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	_onLoadingError(_url: string) {
		game._loadingErrorIsDisplayed = true;
		// TODO:
	}

	/// #if DEBUG
	__doOneStep = false;
	__paused = false;
	protected _FPS = 0;
	FPS = 0;

	get __speedMultiplier() {
		return __speedMultiplier;
	}
	set __speedMultiplier(v) {
		if(v !== __speedMultiplier) {
			__speedMultiplier = v;
			//TODO MusicFragment.__applyGameSpeed(v);
		}
	}
	/// #endif

	/// #if EDITOR
	__setCurrentContainerContent(o: Container) {
		assert(game.__EDITOR_mode, 'attempt to replace current container content in running mode');
		if(modals.length > 0) {
			this.hideModal();
			this.showModal(o, undefined, true);
		} else {
			if(!o.name) {
				(o as Scene).name = game.currentScene.name;
			}
			this.showScene(o as Scene);
		}
	}

	__destroyCurrentScene() {
		//DODO: cleanup
		if(this.currentScene) {
			Lib.destroyObjectAndChildren(this.currentScene);
			this._setCurrentScene(null);
		}
	}

	_setCurrentScene(scene: Scene | null) {
		//DODO: cleanup
		if(scene) {
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
		assert(!game.currentScene, "Attempt to set current scene content with previous scene exists.");
		scene = checkScene(scene);

		/// #if EDITOR
		const isFirstSceneShow = !__currentSceneValue;
		/// #endif

		this._setCurrentScene(scene);
		scene.interactiveChildren = false;
		stage.addChildAt(scene, 0);
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			loadDynamicTextures();
		} else {
			if(isFirstSceneShow) {
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

	__getScenesStack() {
		return showStack;
	}

	get __modalsCount() {
		return modals.length;
	}

	__clearStage() {
		while(this.__modalsCount > 0) {
			this.hideModal(undefined, true);
		}
		while(hidingModals.length > 0) {
			let m = hidingModals.pop();
			Lib.destroyObjectAndChildren(m as Container);
		}

		while(showStack.length > 0) {
			tryRemoveScene(showStack.pop() as Scene);
		}

		tryRemoveCurrentScene();

		if(currentFader) {
			Lib.destroyObjectAndChildren(currentFader);
			currentFader = null;
		}
		game._isWaitingToHideFader = false;
		while(hidingFaders.length > 0) {
			Lib.destroyObjectAndChildren(hidingFaders.pop() as Container);
		}
		Lib.__clearStaticScenes();
		//TODO BgMusic._recalculateMusic();
	}

	/// #endif

	/// #if DEBUG
	__showDebugError(txt: string, errorCode = 90000) {
		/// #if EDITOR
		this.editor.ui.modal.showError(txt, errorCode);
		return;
		/// #endif
		alert(txt); // eslint-disable-line no-unreachable
	}
	/// #endif
}

function tryRemoveCurrentScene() {
	let s = game.currentScene;
	game._setCurrentScene(null);
	tryRemoveScene(s);
}

function tryRemoveScene(s: Scene) {
	if((s instanceof Scene) && (s !== game.currentScene)) {
		if(!s.isStatic && (showStack.indexOf(s) < 0)) {
			Lib.destroyObjectAndChildren(s);
		} else {
			s.detachFromParent();
		}
	}
}

function checkScene(scene: Scene | string) {
	if(typeof scene === 'string') {
		scene = Lib.loadScene(scene);
	}
	assert(scene instanceof Scene, 'Scene instance expected.');
	assert(scene.name, 'Scene name is empty.');
	return scene;
}

/// #if EDITOR
function checkSceneName(sceneName: string | Scene) {
	if(typeof sceneName === 'string') {
		assert(Lib.hasScene(sceneName), "No scene with name '" + sceneName + "'", 10046);
	} else {
		assert(sceneName instanceof Scene, "Scene expected.");
	}
}
let __isCurrentFaderUpdateInProgress = false;
let __currentSceneValue: Scene;

/// #endif

const game = new Game();
export default game;

(Game.prototype.applyProjectDesc as SelectableProperty).___EDITOR_isHiddenForChooser = true;

