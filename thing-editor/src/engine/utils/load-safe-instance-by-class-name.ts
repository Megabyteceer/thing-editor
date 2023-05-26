import Lib from "thing-editor/src/engine/lib";

const loadSafeInstanceByClassName = (className: string, isForWrapping = false) => {
	// editor.saveBackup();
	let ret = Lib._loadClassInstanceById(className);
	if(ret.__EDITOR_onCreate) {
		ret.__EDITOR_onCreate(isForWrapping);
	}
	// editor.cleanupBackup();
	return ret;
}

export default loadSafeInstanceByClassName;