import type { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';
import type { FSCallback } from '../editor-env';

const EDITOR_BACKUP_PREFIX = '___editor_backup_';

let cachedErrorsChecked = false;

class EDITOR_FLAGS {
	/* super.init() call validation flag*/
	static _root_initCalled: Set<Container> = new Set();
	/* super.onRemove() call validation flag*/
	static _root_onRemovedCalled: Set<Container> = new Set();

	static __classesReloadingTime = false;

	static blockSelectByStageClick = 0;

	static updateInProgress = false;

	static isolationEnabled = false;

	static isTryTime = 0;

	static __touchTime = 0;

	static isStoppingTime = false;

	static pathValidationCurrentThis: any = null;

	static rememberTryTime() {
		if (!cachedErrorsChecked) {
			detectCachedErrorsStopping();
			cachedErrorsChecked = true;
		}
		EDITOR_FLAGS.isTryTime++;
	}

	static checkTryTime() {
		EDITOR_FLAGS.isTryTime--;
		assert(EDITOR_FLAGS.isTryTime >= 0, 'checkTryTime() without rememberTryTime() detected.');
	}
}

type Electron_ThingEditorServer = { // exposed from electron
	fs: (command: string, filename?: string | string[] | number, content?: string | boolean | ArrayBuffer, ...args: any[]) => FSCallback;
	fsAsync: (command: string, filename?: string | string[], content?: string | boolean, ...args: any[]) => Promise<any>;
	versions: KeyedObject;
	onServerMessage: (_onServerMessage: (event: string, ...args: any[]) => void) => void;
	argv: string[];
};

export const electron_ThingEditorServer: Electron_ThingEditorServer = (window as any).electron_ThingEditorServer;


export default EDITOR_FLAGS;

export { EDITOR_BACKUP_PREFIX };

const detectCachedErrorsStopping = () => {
	let tryTime = Date.now();
	try {
		throw new Error('Test error.');
	} catch (_er) {
	}
	if (((Date.now() - tryTime) > 1000)) {
		alert('Looks like you stopped on caught exception, probably you need to disable \'stop on caught exception\' option in your debugger.');
	}
};
