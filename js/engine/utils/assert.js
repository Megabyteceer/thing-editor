const assert = (expression, message, errorCode) => {
	message = 'Assert: ' + message;
	if(!expression) {
		/// #if EDITOR
		if(window.editor) {
			editor.ui.modal.showError(message, errorCode);

			if(editor.game && editor.game.__EDITOR_mode) {
				editor.saveBackup();
			}
		} else {
			alert(message);
		}
		debugger;
		/*
		/// #endif
		alert(message);
		//*/
		debugger; // eslint-disable-line no-debugger
		throw message;
	}
};
window.assert = assert;

/// #if DEBUG
/*
/// #endif
throw new Error('assert.js import was not cut off in release build. is assert-strip-loader enabled?');
//*/
export default assert;