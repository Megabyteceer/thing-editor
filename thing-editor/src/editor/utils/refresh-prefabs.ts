import type { SelectionData } from 'thing-editor/src/editor/utils/selection';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

let selectionData: SelectionData | undefined;
let newSceneData: SerializedObject | undefined;

const __refreshPrefabRefsPrepare = () => {
	if (game.__EDITOR_mode) {
		selectionData = game.editor.selection.saveSelection();
		newSceneData = Lib.__serializeObject(game.currentScene);
	}
};

const __refreshPrefabRefs = () => {
	if (game.__EDITOR_mode) {
		game.showScene(Lib._deserializeObject(newSceneData!, true) as Scene);
		game.editor.selection.loadSelection(selectionData!);
		newSceneData = undefined;
		selectionData = undefined;
	}
};

export default __refreshPrefabRefs;

export { __refreshPrefabRefsPrepare };
