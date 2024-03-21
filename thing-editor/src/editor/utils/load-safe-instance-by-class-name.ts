import type { Container } from 'pixi.js';
import Lib from 'thing-editor/src/engine/lib';

const loadSafeInstanceByClassName = (className: string, isForWrapping = false): Container => {

	let ret: Container;

	const PREFAB_NAME = '___default_content/' + className.toLocaleLowerCase();

	if (Lib.hasPrefab(PREFAB_NAME)) {
		ret = Lib.loadPrefab(PREFAB_NAME);
		ret.name = '';
		return ret;
	} else {
		ret = Lib._loadClassInstanceById(className);
	}

	if (ret.__EDITOR_onCreate) {
		ret.__EDITOR_onCreate(isForWrapping);
	}

	return ret;
};

export default loadSafeInstanceByClassName;
