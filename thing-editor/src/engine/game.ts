/// #if EDITOR
import Editor from "thing-editor/src/editor/editor";
/// #if EDITOR


import type { Classes, KeyedMap, SelectableProperty } from "thing-editor/src/editor/env";
import { Container } from "pixi.js";
import Scene from "thing-editor/src/engine/components/scene.c";

import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import assert from "thing-editor/src/engine/debug/assert";
import defaultProjectDesc from "thing-editor/src/engine/utils/default-project-desc";
import Lib from "thing-editor/src/engine/lib";
import Settings from "thing-editor/src/engine/utils/settings";
import { Application, GC_MODES, MIPMAP_MODES, settings } from "pixi.js";

let app: Application;
let stage: Container;
let modals: Container[] = [];
let hidingModals: Container[] = [];
let currentHidingFaderInUpdate: Container | null;

let showStack: (Scene | string)[] = [];
let hideTheseModalsUnderFader: Container[];
let currentFader: Container | null;
let hidingFaders: Container[] = [];

class Game {

	_loadingErrorIsDisplayed = false;

	projectDesc!: ProjectDesc;
	all!: KeyedMap<Container>;

	classes!: Classes;
	pixiApp!: Application;
	stage!: Container;

	settings!: Settings;

	isCanvasMode = false; //TODO
	isVisible = true; //TODO

	_isWaitingToHideFader = false;

	onGameReload?: () => void;

	/// #if EDITOR
	editor!: Editor;
	__EDITOR_mode = false;

	__time = 0;
	get time() {
		return this.__time;
	}

	/*
	/// #endif
	time = 0;
	*/

	init(element: HTMLElement | null, gameId: string, _resourcesPath = '') {
		this.pixiApp = app = new Application();
		//@ts-ignore

		(element || document.body).appendChild(app.view);

		stage = new Container();
		stage.name = 'stage';
		this.stage = stage;

		this.settings = new Settings(gameId);

		app.stage.addChild(stage);
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

		settings.MIPMAP_TEXTURES = projectDescriptor.mipmap
			? MIPMAP_MODES.ON
			: MIPMAP_MODES.OFF;

		settings.GC_MODE = GC_MODES.MANUAL;

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

	faderShoot() {
		/// #if EDITOR
		assert(__isCurrentFaderUpdateInProgress, "game.faderShoot() called not by fader.", 10033);
		assert(!(currentFader as Container).__nodeExtendData.isFaderShootCalledForThisFader, "game.faderShoot() already called for this fader.", 10034);
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
			this.editor.refreshTreeViewAndPropertyEditor();
			/// #endif
		}
	}

	_onLoadingError(_url: string) {
		game._loadingErrorIsDisplayed = true;
		// TODO:
	}

	/// #if EDITOR
	__setCurrentContainerContent(_o: Container) {
		//TODO:
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

	_setCurrentSceneContent(scene: Scene) {
		//DODO: cleanup
		assert(!game.currentScene, "Attempt to set current scene content with previous scene exists.");
		scene = checkScene(scene);
		this._setCurrentScene(scene);
		scene.interactiveChildren = false;
		stage.addChildAt(scene, 0);
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			loadDynamicTextures();
		}
		game.currentScene.__nodeExtendData.childrenExpanded = true;
		this.editor.refreshTreeViewAndPropertyEditor();

		//TODO restore selection
		// this.ui.viewport.resetZoom(); TODO

		/// #endif
		scene._onShowCalled = false;
		return scene;
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

export { Game }

(Game.prototype.applyProjectDesc as SelectableProperty).___EDITOR_isHiddenForChooser = true;

function loadDynamicTextures() {
	//TODO:
}