import game from "thing-editor/src/engine/game";

let tryCatchWarned = false;
let tryTime = 0;

class EDITOR_FLAGS {
	/* super.init() call validation flag*/
	static _root_initCalled: boolean;
	/* super.onRemove() call validation flag*/
	static _root_onRemovedCalled: boolean;

	static isolationEnabled = false;

	static isTryTime = 0;

	static rememberTryTime() {
		tryTime = Date.now();
		EDITOR_FLAGS.isTryTime++;
	}

	static checkTryTime() {
		EDITOR_FLAGS.isTryTime--;
		if(!tryCatchWarned && ((Date.now() - tryTime) > 1000)) {
			tryCatchWarned = true;
			game.editor.ui.status.warn("Looks like you stopped on caught exception, probably you need to disable 'stop on caught exception' option in your debugger.", 30014);
		}
	}
}

export default EDITOR_FLAGS;

