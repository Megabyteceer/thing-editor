import type { KeyedMap } from "thing-editor/src/editor/env";
import editable, { _editableEmbed } from "thing-editor/src/editor/props-editor/editable";
import makePrefabSelector from "thing-editor/src/editor/utils/prefab-selector";
import { Container } from "pixi.js";

export default class Scene extends Container {

	@editable({ type: 'color' })
	backgroundColor = 0;

	@editable()
	isStatic = false;

	@editable({ type: 'string', select: makePrefabSelector('fader/', true) }) //TODO: prefab options startsWith, canBeEmpty = true, filter = null
	faderType: string | null = null

	all!: KeyedMap<Container>;
	_onShowCalled: boolean = false;

	__libSceneName!: string;

	get name() {
		return this.__libSceneName;
	}

	onShow() {

	}

	onHide() {

	}
}

_editableEmbed(Scene, 'name', {
	name: 'name',
	notSerializable: true,
	override: true
});