import { Container } from "pixi.js";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const loadSafeInstanceByClassName = (className: string, isForWrapping = false): Container => {

	if(game.__EDITOR_mode) {
		game.editor.saveBackup();
	}

	let ret: Container;

	const PREFAB_NAME = '___default_content/' + className.toLocaleLowerCase();

	if(Lib.hasPrefab(PREFAB_NAME)) {
		ret = Lib.loadPrefab(PREFAB_NAME);
		ret.name = '';
		return ret;
	} else {
		ret = Lib._loadClassInstanceById(className);
	}

	if(ret.__EDITOR_onCreate) {
		ret.__EDITOR_onCreate(isForWrapping);
	}
	if(game.__EDITOR_mode) {
		game.editor.removeBackup();
	}
	return ret;
}

export default loadSafeInstanceByClassName;