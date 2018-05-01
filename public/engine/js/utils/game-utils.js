const TARGET = 'development';

const log = console.log;

const W = 1280;
const H = 720;

(function () {
	
	if (TARGET == 'development') {
		window.assert = (expression, message, dontBreakFlow) => {
			message = 'Assert: ' + message;
			if (!expression) {
				if (window.editor) {
					editor.ui.modal.showError(message);
				}
				if (!dontBreakFlow) {
					throw message;
				}
			}
		}
	}
})();