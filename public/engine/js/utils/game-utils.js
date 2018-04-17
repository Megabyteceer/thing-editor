const TARGET = 'development';

const log = console.log;

const W = 1280;
const H = 720;

var loadScript;
var clearLoadedScript;

(function() {
	_loadedScripts = {};

	loadScript = function(path, callback) {
		if (!_loadedScripts.hasOwnProperty(path)) {
			
		}
		else {
			callback();
		}
	}

	clearLoadedScript = function() {
		Object.kes(_loadedScripts).some(function(s){
			_loadedScripts[s].remove();
		});
		_loadedScripts = {};
	}

	if (TARGET == 'development') {
		window.assert = (expression, message, dontBreakFlow) => {
			if(!expression){
				if(dontBreakFlow) {
					if(window.EDITOR) {
						EDITOR.ui.modal.showError(message);
					}
				} else {
					throw message;
				}
			}
		}
	}
})();