import { Container } from 'pixi.js';
import type { FileDesc } from 'thing-editor/src/editor/fs';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { ACCESS__ALL_ASSERTING_PROXY, addAllRefsValidator } from 'thing-editor/src/editor/utils/scene-all-validator';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

export default class Scene extends Container {

	declare name: string;

	@editable({ type: 'color' })
	backgroundColor = 0;

	@editable()
	isStatic = false;

	@editable({ type: 'prefab', filterAssets: (f: FileDesc) => f.assetName.startsWith('fader/') })
	faderType: string | null = null;

	all!: ThingSceneAllMap;

	_onShowCalled = false;

	onShow() {
		/* virtual */
	}

	onMouseDown(_mouse: typeof game.mouse, _ev: PointerEvent) {
		/* virtual */
	}

	onMouseUp(_mouse: typeof game.mouse, _ev: PointerEvent) {
		/* virtual */
	}

	onMouseMove(_mouse: typeof game.mouse, _ev: PointerEvent) {
		/* virtual */
	}

	onHide() {
		/* virtual */
	}

	init() {
		this._refreshAllObjectRefs();
		super.init();
		game._setCurrentScene(this);
	}

	_refreshAllObjectRefs() { //shortcut to access to scene's children by name without iterate through hierarchy

		this.all = {} as ThingSceneAllMap;

		/// #if EDITOR
		addAllRefsValidator(this);
		/// #endif

		allObjectToRefresh = this.all;

		this.forAllChildren(_refreshChildRef);
		if (game.currentScene === this) {
			game.all = this.all;
		}
	}
	/// #if EDITOR

	__afterDeserialization() {
		this.all = ACCESS__ALL_ASSERTING_PROXY as ThingSceneAllMap;

		if (game.currentScene === this) {
			game.all = this.all;
		}
	}

	remove() { //allows editor to hide scene`s remove method and do not hide DisplayObject's remove method
		assert(false, 'Scenes remove() method should not be called. Use game.closeCurrentScene() method instead.', 10074);
	}

	static __canAcceptParent() {
		return false;
	}

	/// #endif
}

let allObjectToRefresh: KeyedMap<Container>;
const _refreshChildRef = (o: Container) => {
	if (o.name) {
		allObjectToRefresh[o.name] = o;
	}
};

/// #if EDITOR
Scene.__EDITOR_icon = 'tree/scene';
(Scene.prototype.remove as SelectableProperty).___EDITOR_isHiddenForChooser = true;

class __UnknownClassScene extends Scene {
	static __defaultValues = {};
}

__UnknownClassScene.__EDITOR_icon = 'tree/unknown-class';

export { __UnknownClassScene };
/// #endif
