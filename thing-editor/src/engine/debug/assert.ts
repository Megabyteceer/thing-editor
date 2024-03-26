/// #if EDITOR
import fs from 'thing-editor/src/editor/fs';
import game from '../game';
/// #endif

function assert(condition: any, message: string, errorCode = 99999): void {
	if (!condition) {
		message = message + '; errorCode: ' + errorCode;
		console.error(message);
		/// #if EDITOR
		if (game.editor.buildProjectAndExit) {
			fs.log((new Error()).stack!);
		}
		/// #endif

		throw new Error(message);
	}
}

export default assert;
