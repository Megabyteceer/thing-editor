import { Container } from "pixi.js";
import type { KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import editable from "thing-editor/src/editor/props-editor/editable";
import makePrefabSelector from "thing-editor/src/editor/utils/prefab-selector";
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
}

/// #if EDITOR
(Scene as any as SourceMappedConstructor).__EDITOR_icon = 'tree/scene';
/// #endif
