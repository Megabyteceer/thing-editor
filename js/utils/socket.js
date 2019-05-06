import AssetsLoader from "./assets-loader.js";

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	ws.send('something');
};

ws.onmessage = function incoming(data) {
	data = JSON.parse(data.data);
	if(data.hasOwnProperty('clientsConnected')) {
		
		if(data.clientsConnected !== 1) {
			editor.ui.modal.showFatalError('Thing-editor already launched.', '');
			ws.onclose = undefined;
		} else {
			editor.onServerAllowsWorking();
		}
	} else if(data.hasOwnProperty('notifyText')) {
		editor.ui.modal.notify(data.notifyText);
	} else if(data.hasOwnProperty('filesChanged') && !editor.projectOpeningInProgress) {
		let imagesUpdated;
		let soundsUpdated;
		for(let file of data.filesChanged) {
			if(file.name.startsWith('img/')) {
				if(!imagesUpdated) {
					imagesUpdated = new Map();
				}
				imagesUpdated.set(file.name.substr(4), true);
			} else if(file.name.startsWith('snd/') && file.name.endsWith('.wav')) {
				if(!soundsUpdated) {
					soundsUpdated = new Map();
				}
				soundsUpdated.set(file.name.substr(4), true);
			}
		}
		
		if(imagesUpdated) {
			AssetsLoader.reloadAssets(true, imagesUpdated);
		}
		if(soundsUpdated && !editor.ui.soundsList.soundsReloadingInProgress) {
			editor.ui.soundsList.reloadSounds(soundsUpdated);
		}
	}
	
};

ws.onclose = function incoming() {
	closeWindow();
};

function closeWindow() {
	editor.ui.modal.showFatalError("Page can be closed now.", '');
}

export default ws;