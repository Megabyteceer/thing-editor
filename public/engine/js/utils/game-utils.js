const TARGET = 'development';

const log = console.log;

const W = 1280;
const H = 720;

(function () {
	
	if (TARGET == 'development') {
		window.assert = (expression, message, dontBreakFlow) => {
            message = 'Assert: ' + message;
			if (!expression) {
				if (dontBreakFlow) {
					if (window.EDITOR) {
						EDITOR.ui.modal.showError(message);
					}
				} else {
					throw message;
				}
			}
		}
	}
})();