import AssetsLoader from "./assets-loader.js";

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	ws.send('something');
};

function addAssetNameInToMap(name, map) {
	if(!map) {
		map = new Map();
	}
	map.set(name.substr(4), true);
	return map;
}

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
		let imagesDeleted;
		let soundsDeleted;
		for(let file of data.filesChanged) {
			if(file.name.startsWith('img/')) {
				if(file.deleted) {
					imagesDeleted = addAssetNameInToMap(file.name, imagesDeleted);
				} else {
					imagesUpdated = addAssetNameInToMap(file.name, imagesUpdated);
				}
			} else if(file.name.startsWith('snd/') && file.name.endsWith('.wav')) {
				if(file.deleted) {
					soundsDeleted = addAssetNameInToMap(file.name, soundsDeleted);
				} else {
					soundsUpdated = addAssetNameInToMap(file.name, soundsUpdated);
				}
			}
		}
		
		if(imagesUpdated) {
			AssetsLoader.reloadAssets(true, imagesUpdated);
		}
		if(soundsUpdated && !editor.ui.soundsList.soundsReloadingInProgress) {
			editor.ui.soundsList.reloadSounds(soundsUpdated);
		}
		if(imagesDeleted) {
			AssetsLoader.deleteAssets(imagesDeleted.keys());
		}
		if(soundsDeleted) {
			editor.ui.soundsList.deleteSounds(soundsDeleted.keys());
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