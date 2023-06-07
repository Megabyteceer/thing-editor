import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const __refreshPrefabRefs = () => {
	if(game.__EDITOR_mode) {
		const selectionData = game.editor.selection.saveSelection();
		const newSceneData = Lib.__serializeObject(game.currentScene);
		game.__setCurrentContainerContent(Lib._deserializeObject(newSceneData, true));
		game.editor.selection.loadSelection(selectionData);
	}
}

export default __refreshPrefabRefs;