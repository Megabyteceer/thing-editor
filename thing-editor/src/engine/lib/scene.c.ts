import { Container } from "pixi.js";
import ClassesLoader from "thing-editor/src/editor/classes-loader";
import type { KeyedMap, SelectableProperty, SourceMappedConstructor } from "thing-editor/src/editor/env";
import editable from "thing-editor/src/editor/props-editor/editable";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import makePrefabSelector from "thing-editor/src/editor/utils/prefab-selector";
import { ACCES__ALL_ASSERTING_PROXY, addAllRefsValidator } from "thing-editor/src/editor/utils/scene-all-validator";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

export default class Scene extends Container {

	@editable({ type: 'color' })
	backgroundColor = 0;

	@editable()
	isStatic = false;

	@editable({ type: 'string', select: makePrefabSelector('fader/', true) }) //TODO: prefab options startsWith, canBeEmpty = true, filter = null
	faderType: string | null = null

	all!: KeyedMap<Container>;

	_onShowCalled: boolean = false;

	onShow() {

	}

	onMouseDown(_mouse: typeof game.mouse, _ev: PointerEvent) {

	}

	onMouseUp(_mouse: typeof game.mouse, _ev: PointerEvent) {

	}

	onMouseMove(_mouse: typeof game.mouse, _ev: PointerEvent) {

	}

	onHide() {

	}

	init() {
		this._refreshAllObjectRefs();
		super.init();
	}

	_refreshAllObjectRefs() { //shortcut to access to scene's children by name without iterate through hierarchy

		/** @type {ThingSceneAllMap} */
		this.all = {};

		/// #if EDITOR
		addAllRefsValidator(this);
		/// #endif

		allObjectToRefresh = this.all;

		this.forAllChildren(_refreshChildRef);
		if(game.currentScene === this) {
			game.all = this.all;
		}
	}
	/// #if EDITOR

	__afterDeserialization() {
		if(!game.__EDITOR_mode) {
			this.all = ACCES__ALL_ASSERTING_PROXY;
		} else {
			//@ts-ignore
			this.all = undefined;
		}
		if(game.currentScene === this) {
			game.all = this.all;
		}
	}

	remove() { //allows editor to hide scene`s remove method and do not hide DisplayObject's remove method
		assert(false, "Scenes remove() method should not be called. Use game.closeCurrentScene() method instead.", 10074);
	}

	/// #endif
}

let allObjectToRefresh: KeyedMap<Container>;
const _refreshChildRef = (o: Container) => {
	if(o.name) {
		/// #if EDITOR
		/*if(game.__EDITOR_mode && (o.parent instanceof PrefabReference) && (o.parent.__previewNode === o)) { //TODO prefabReference??
			return;
		}*/
		/// #endif
		allObjectToRefresh[o.name] = o;
	}
};

/// #if EDITOR
(Scene as any as SourceMappedConstructor).__EDITOR_icon = 'tree/scene';
(Scene.prototype.remove as SelectableProperty).___EDITOR_isHiddenForChooser = true;

assert(!EDITOR_FLAGS.__sceneClassRef || EDITOR_FLAGS.__sceneClassRef === Scene, "Vite.js has duplicated embed classes.");
EDITOR_FLAGS.__sceneClassRef = Scene;

/// #endif
