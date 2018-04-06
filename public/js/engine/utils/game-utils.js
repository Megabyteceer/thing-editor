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

})();