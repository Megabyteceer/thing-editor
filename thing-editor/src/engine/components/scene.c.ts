import editable from "thing-editor/src/editor/props-editor/editable";
import makePrefabSelector from "thing-editor/src/editor/utils/prefab-selector";
import Container from "thing-editor/src/engine/components/container.c";




export default class Scene extends Container {

	@editable({ type: 'color' })
	backgroundColor = 0;

	@editable()
	isStatic = false;

	@editable({ select: makePrefabSelector('fader/', true) }) //TODO: prefab options startsWith, canBeEmpty = true, filter = null
	faderType: string | null = null

	onShow() {

	}

	onHide() {

	}

}