import type { Container } from 'pixi.js';
import { getCurrentStack } from 'thing-editor/src/editor/utils/stack-utils';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

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

	static checkTimeOut = 0;

	static rememberTryTime() {
		tryTime = Date.now();
		const stack = getCurrentStack('check time not finished');
		EDITOR_FLAGS.isTryTime++;
		this.checkTimeOut = setTimeout(() => {
			console.error(stack);
			debugger;
		}, 1) as any as number;
	}

	static checkTryTime() {
		clearTimeout(this.checkTimeOut);
		EDITOR_FLAGS.isTryTime--;
		assert(EDITOR_FLAGS.isTryTime >= 0, 'checkTryTime() without rememberTryTime() detected.');
		if (!tryCatchWarned && ((Date.now() - tryTime) > 1000)) {
			tryCatchWarned = true;
			game.editor.ui.status.warn('Looks like you stopped on caught exception, probably you need to disable \'stop on caught exception\' option in your debugger.', 30014);
		}
	}
}

export default EDITOR_FLAGS;

export { EDITOR_BACKUP_PREFIX };

