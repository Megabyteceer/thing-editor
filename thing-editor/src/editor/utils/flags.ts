import { Container } from "pixi.js";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

let tryCatchWarned = false;
let tryTime = 0;

const EDITOR_BACKUP_PREFIX = '___editor_backup_';

class EDITOR_FLAGS {
	/* super.init() call validation flag*/
	static _root_initCalled: Set<Container> = new Set();
	/* super.onRemove() call validation flag*/
	static _root_onRemovedCalled: Set<Container> = new Set();

	static updateInProgress = false;

	static isolationEnabled = false;

	static isTryTime = 0;

	static isStoppingTime = false;

	static rememberTryTime() {
		tryTime = Date.now();
		EDITOR_FLAGS.isTryTime++;
	}

	static checkTryTime() {
		EDITOR_FLAGS.isTryTime--;
		assert(EDITOR_FLAGS.isTryTime >= 0, "checkTryTime() without rememberTryTime() detected.");
		if(!tryCatchWarned && ((Date.now() - tryTime) > 1000)) {
			tryCatchWarned = true;
			game.editor.ui.status.warn("Looks like you stopped on caught exception, probably you need to disable 'stop on caught exception' option in your debugger.", 30014);
		}
	}
}

export default EDITOR_FLAGS;

export { EDITOR_BACKUP_PREFIX };

